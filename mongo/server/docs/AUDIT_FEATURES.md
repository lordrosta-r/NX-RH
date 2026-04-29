# Audit de complétude fonctionnelle — Backend Routes

**Date :** 2025  
**Périmètre :** 7 fichiers de routes (`campaigns.js`, `forms.js`, `events.js`, `resources.js`, `offboarding.js`, `analytics.js`, `evaluations.js`)  
**Statut :** ✅ 10/10 corrections appliquées

---

## Résumé des corrections

### Fix 1 — DELETE → 204 No Content
**Fichiers :** `campaigns.js`, `events.js`, `resources.js`, `offboarding.js`  
**Problème :** Les routes DELETE renvoyaient `200` avec un corps JSON `{ message: "Supprimé" }`.  
**Correction :** Retour `204` sans corps, conformément à la sémantique HTTP.

---

### Fix 2 — Pagination systématique sur les routes GET de liste
**Fichiers :** `campaigns.js`, `forms.js`, `events.js`, `resources.js`, `evaluations.js`  
**Problème :** Certains endpoints avaient une pagination conditionnelle (activée seulement si `?page` était présent) ou absente. `evaluations.js` avait une branche `if/else` appliquant ou non la pagination selon la présence de `?page`.  
**Correction :**  
- Pagination toujours active (page=1, limit=50 par défaut, max 100).  
- Structure de réponse uniforme : `{ data: [...], total, page, limit }`.  
- Pattern `Promise.all([find, countDocuments])` pour les nouveaux endpoints paginés (events, resources).

---

### Fix 3 — Messages d'erreur en français
**Fichiers :** `events.js`, `resources.js`, `offboarding.js`  
**Problème :** Certains messages d'erreur `403` étaient en anglais (`"Forbidden"`, `"Insufficient permissions"`).  
**Correction :** Remplacés par `"Accès refusé"` pour être cohérents avec le reste de l'API.

---

### Fix 4 — Commentaires de handlers
**Fichiers :** tous les 7 fichiers  
**Problème :** Les handlers Express n'avaient aucun commentaire décrivant leur rôle.  
**Correction :** Ajout d'un commentaire de titre sur chaque handler (`// GET /api/campaigns — ...`).

---

### Fix 5 — Champs éditables manquants dans PATCH /events/:id
**Fichier :** `events.js`  
**Problème :** Le PATCH ne traitait que `title`, `date`, `type` — les champs `targetRoles` et `description` étaient silencieusement ignorés même s'ils étaient envoyés.  
**Correction :** Destructuration étendue à `{ title, date, type, targetRoles, description }` avec mise à jour conditionnelle de chaque champ.

---

### Fix 6 — GET /evaluations/history retourne un tableau simple
**Fichier :** `evaluations.js`  
**Problème :** L'endpoint `/history` enveloppait le résultat dans `{ data: [...] }` alors que tous les autres consommateurs attendaient un tableau plat.  
**Correction :** Retour direct du tableau (`res.json(items)`).

---

### Fix 7 — POST retourne l'objet complet et peuplé
**Fichiers :** `campaigns.js`, `forms.js`  
**Problème :** Après une création, le `201` renvoyait l'objet brut Mongoose (sans champs peuplés, sans valeurs par défaut appliquées).  
**Correction :** Re-fetch avec `.findById(...).populate(...).lean()` avant la réponse `201`, garantissant que le client reçoit exactement le même objet que lors d'un GET ultérieur.

---

### Fix 8 — Suppression du rôle `director` dans evaluations.js GET /:id
**Fichier :** `evaluations.js`  
**Problème :** Le handler GET `/:id` avait une branche séparée pour `director` (avec une logique de visibilité différente et incorrecte : pas de `campaignId`).  
**Correction :** La branche `director` est fusionnée dans la branche `manager`. Les comptes legacy `director` sont traités comme des managers, conformément à l'architecture cible.

---

### Fix 9 — Filtre `?campaignId` sur l'export PDF analytics
**Fichier :** `analytics.js`  
**Problème :** `GET /api/analytics/export/pdf` ignorait le paramètre `?campaignId` — il exportait toujours toutes les évaluations.  
**Correction :** Construction conditionnelle du filtre `evalFilter` ; nom de fichier PDF inclut le `campaignId` quand filtré (`analytics-rh-YYYY-MM-DD-{campaignId}.pdf`). Import `mongoose` ajouté pour la validation `isValidObjectId`.

---

### Fix 10 — PATCH /evaluations/:id retourne l'évaluation complète et peuplée
**Fichier :** `evaluations.js`  
**Problème :** La réponse PATCH ne renvoyait qu'un sous-ensemble de champs `{ id, status, lastSavedAt, reviewerComment, evaluateeComment }` — insuffisant pour les clients qui mettent à jour leur état local après une mutation.  
**Correction :** Re-fetch complet avec quatre `.populate()` (formId, evaluatorId, evaluateeId, campaignId) et `.lean()` avant `res.json()`, avec passage par `sanitizeAnonymity`.

---

## Mise à jour des tests

**Fichier :** `__tests__/routes/evaluations.test.js`  
**Raison :** Fix 10 ajoute un appel `findById().populate().lean()` après `save()`. Le mock existant `mockResolvedValue` retournait une Promise qui n'est pas chaînable.  
**Correction :** Ajout d'un helper `makeThenable(result)` qui crée un objet à la fois *awaitable* (via `.then()`) et *chaînable* (via `.populate()`, `.lean()`), reproduisant le comportement d'une Mongoose Query. Tous les mocks `findById` des tests PATCH ont été mis à jour pour utiliser `mockReturnValue(makeThenable(...))`.

---

## Failures pré-existantes (non corrigées — hors périmètre)

**Fichier :** `__tests__/routes/users.test.js` (2 tests)  
- `GET /api/users — admin receives all users with no managerId filter` : attend un tableau plat mais `users.js` retourne maintenant un objet paginé.  
- `POST /api/users — returns 409 on duplicate email` : attend `/already exists/i` mais le message est `"Email déjà utilisé"`.  

Ces failures existent dans `users.js` qui est hors du périmètre de cet audit.
