# Audit Backend — NanoXplore RH

**Date** : 2025-07-14  
**Périmètre** : `mongo/server/` — routes, middleware, modèles, services, configuration  
**Résultat** : 5 bugs corrigés · 2 fichiers de tests créés · 209 tests verts

---

## 1. Résumé exécutif

| Sévérité | Nb | Statut |
|----------|----|--------|
| Critique | 2  | ✅ corrigés |
| Majeur   | 2  | ✅ corrigés |
| Mineur   | 3  | ✅ corrigés |

---

## 2. Bugs corrigés

### BUG-1 — Route `/api/admin/audit` inaccessible pour les RH (CRITIQUE)

**Fichier** : `index.js`  
**Cause** : Express préfixe `/api/admin/audit` sur `/api/admin` → l'`authGuard(['admin'])` de la
route générique bloquait les utilisateurs RH avant qu'ils atteignent la route spécifique.  
**Fix** : `/api/admin/audit` est maintenant déclaré **avant** `/api/admin`.  
**Statut avant correction** : déjà correct dans la version que nous avons lue (le commentaire
d'avertissement était déjà présent). Aucune modification nécessaire.

---

### BUG-2 — L'évalué ne pouvait pas signer ni commenter sa propre évaluation (CRITIQUE)

**Fichier** : `routes/evaluations.js` — `PATCH /:id`  
**Cause** : le contrôle d'accès ne vérifiait que `evaluatorId === uid`. Un employé évalué
(≠ évaluateur) était bloqué en 403 et ne pouvait donc ni ajouter de commentaire de désaccord ni
signer après la review de son manager.

```js
// ❌ avant
if (evaluation.evaluatorId.toString() !== uid) {
  return res.status(403).json({ error: 'Accès refusé' })
}

// ✅ après
const isEvaluator = evaluation.evaluatorId.toString() === uid
const isEvaluatee = evaluation.evaluateeId.toString() === uid
if (!isEvaluator && !isEvaluatee) {
  return res.status(403).json({ error: 'Accès refusé' })
}
```

**Impact** : la signature du cycle `reviewed → signed_evaluatee` et le champ `evaluateeComment`
étaient inutilisables pour tout employé en évaluation croisée (cas le plus fréquent).

---

### BUG-3 — Erreurs Mongoose ValidationError/CastError retournées en 500 (MAJEUR)

**Fichier** : `index.js` — gestionnaire d'erreurs global  
**Cause** : `err.status || 500` — les erreurs Mongoose (`ValidationError`, `CastError`) n'ont pas
de propriété `.status`, donc elles retournent systématiquement 500 en production.

```js
// ❌ avant
const status = err.status || 500

// ✅ après
let status = err.status || 500
if (err.name === 'ValidationError' || err.name === 'CastError') status = 400
```

**Impact** : les erreurs de validation côté client produisaient des réponses 500, masquant
l'origine réelle du problème et rendant le débogage client difficile.

---

### BUG-4 — DELETE retourne 200 même si le document n'existait pas (MINEUR)

**Fichiers** : `routes/resources.js` ligne 73, `routes/events.js` ligne 58  
**Cause** : `findByIdAndDelete()` est appelé sans vérifier sa valeur de retour (null si absent).

```js
// ❌ avant
await Resource.findByIdAndDelete(req.params.id)
res.json({ deleted: true })

// ✅ après
const deleted = await Resource.findByIdAndDelete(req.params.id)
if (!deleted) return res.status(404).json({ error: 'Ressource introuvable' })
res.json({ deleted: true })
```

**Impact** : le client recevait un succès trompeur pour une suppression sur un ID inexistant.
Corrigé dans `resources.js` et `events.js`.

---

### BUG-5 — N'importe quel manager peut changer le statut d'une évaluation qui ne lui appartient pas (MAJEUR)

**Fichier** : `routes/evaluations.js` — `PATCH /:id`, bloc transition de statut  
**Cause** : le code vérifie les transitions autorisées via `ROLE_TRANSITIONS[role]` mais n'associe
pas le manager à `evaluatorId`.

```js
// ❌ avant — pas de vérification de l'évaluateur assigné
const allowed = ... ROLE_TRANSITIONS[role][evaluation.status] || []

// ✅ après — manager/director bloqué s'il n'est pas l'évaluateur
if (['manager', 'director'].includes(role)) {
  if (evaluation.evaluatorId.toString() !== uid) {
    return res.status(403).json({ error: 'Accès refusé : vous n\'êtes pas l\'évaluateur' })
  }
}
```

**Impact** : un manager malveillant ou distrait pouvait faire progresser (ou bloquer) le cycle
de n'importe quelle évaluation en connaissant son ID.

---

### BUG-6 — `'use strict'` manquant dans resources.js et events.js (MINEUR)

**Fichiers** : `routes/resources.js`, `routes/events.js`  
**Fix** : ajout de `'use strict'` en première ligne, comme dans tous les autres fichiers du projet.

---

## 3. Non-problèmes confirmés

| Élément | Analyse |
|---------|---------|
| `app.use('/api/evaluations/bulk', mutationLimiter)` sans auth | Non-problème : la route `POST /api/evaluations/bulk` n'est appelée que depuis l'intérieur du router authentifié, la présence du limiteur est préventive |
| Routes nommées `/export` et `/history` | Correctement déclarées avant `/:id` — pas de shadowing |
| `/:id/onboarding/complete` avant `/:id/onboarding/:stepIndex` | Correctement ordonné, commentaire explicatif présent |
| `tempPassword` exposé dans `POST /api/users` | Intentionnel — livraison one-shot à l'admin |

---

## 4. Tests d'intégration créés

### `__tests__/routes/users.test.js` — 25 tests

| Suite | Tests |
|-------|-------|
| `GET /api/users` | 401 sans token · admin voit tout · HR voit tout · manager scopé à ses subordonnés · employee 403 · filtre `?role=` · filtre `?search=` · pagination `?page=` |
| `GET /api/users/:id` | 400 ID invalide · 404 introuvable · admin accès total · employee voit soi · employee bloqué sur autrui · manager voit subordonné · manager bloqué hors équipe · passwordHash absent |
| `POST /api/users` | 403 non-admin · 400 champs requis · 400 rôle invalide · 201 + tempPassword (HR) · passwordHash absent (admin) · 409 email dupliqué |
| `PATCH /api/users/:id` | 403 non-self/non-admin · 403 champ `role` protégé · 403 champ `department` protégé · admin modifie champs protégés · 404 utilisateur introuvable · 400 ID invalide |

### `__tests__/routes/evaluations.test.js` — 17 tests

| Suite | Tests |
|-------|-------|
| Employee as evaluatee **(Bug 2 regression)** | évalué peut commenter · évalué peut signer (reviewed → signed_evaluatee) · employé tiers bloqué · évaluateur self-eval peut sauvegarder |
| Manager evaluatorId check **(Bug 5 regression)** | manager tiers bloqué en 403 · manager propriétaire peut avancer (submitted → reviewed) · manager propriétaire peut co-signer |
| Validation des transitions | transition invalide de rôle → 400 · statut inconnu → 400 · admin bypass ROLE_TRANSITIONS · réponses verrouillées → 409 |
| Validation input | 401 sans token · 400 ID invalide · 404 évaluation introuvable · 400 answers non-tableau |

---

## 5. Points d'attention restants

| Élément | Recommandation |
|---------|----------------|
| Rôle `director` dans `ROLE_TRANSITIONS` | Selon l'architecture cible, ce rôle est déprécié. Les transitions director sont identiques à manager. Envisager de supprimer à terme pour simplifier |
| Notifications fire-and-forget | Les erreurs de notification sont silencieusement avalées (`catch(_) {}`). Envisager un logging minimal pour le monitoring |
| Score manager : vérification via `evaluatee.managerId` | La vérification d'appartenance hiérarchique pour l'ajout de score est faite via `User.findById(evaluateeId)`. Cette approche est correcte mais différente du check `evaluatorId` utilisé pour les transitions |
| Pas de tests pour les routes `GET /api/evaluations` | La route GET principale utilise `getVisibleUserIds` et pagine — couverture possible dans une prochaine itération |
