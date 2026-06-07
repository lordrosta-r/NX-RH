# Audit base de données — NanoXplore RH

> Audit réalisé par Copilot (agent senior MongoDB/Mongoose).  
> Tous les problèmes listés ont été **corrigés directement dans les fichiers**.  
> Suite de tests : **166/166 ✅** après corrections.

---

## 1. Problèmes trouvés & corrigés

### 🔴 Bugs critiques

#### B-01 — `'archived'` manquant dans `EVALUATION_STATUSES`
**Fichier :** `config/constants.js`  
**Impact :** La route `PATCH /api/users/:id/offboard` utilise `Evaluation.updateMany({ $set: { status: 'archived' } })`. Comme `'archived'` n'était pas dans l'enum, MongoDB stockait silencieusement une valeur hors-enum (Mongoose ne valide pas `updateMany`). Toute logique qui itère sur `EVALUATION_STATUSES` (export CSV, filtres statuts) ignorait ces évaluations. La route `GET /offboard-preview` filtrait aussi sur `$nin: ['validated', 'archived']` — cohérence impossible sans la constante.  
**Correction :** Ajout de `'archived'` à `EVALUATION_STATUSES` + ajout de `archived: []` dans `VALID_TRANSITIONS` de `Evaluation.js` + ajout de `'archived'` dans `LOCKED_STATUSES`.

---

#### B-02 — Champs `phone` et `avatar` inexistants dans le schéma `User`
**Fichier :** `models/User.js`  
**Impact :** La route `DELETE /api/users/:id/gdpr-anonymize` assignait `user.phone = null` et `user.avatar = null`. En mode strict Mongoose (défaut), ces affectations sont **silencieusement ignorées** — l'anonymisation RGPD était donc **incomplète** (les données restaient en base).  
**Correction :** Ajout des champs `phone` (String, trim, maxlength 30) et `avatar` (String) au schéma.

---

#### B-03 — Double index sur `createdAt` dans `AuditLog`
**Fichier :** `models/AuditLog.js`  
**Impact :** Le champ `createdAt` avait `index: true` (crée un index simple) **et** un index TTL explicite `auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds })`. MongoDB créait deux indexes distincts sur `createdAt` : un simple et un TTL. Cela doublait l'espace disque et pouvait perturber le TTL si MongoDB privilégiait l'index simple.  
**Correction :** Suppression de `index: true` sur le champ inline — seul l'index TTL explicite subsiste.

---

### 🟡 Problèmes de qualité / dette technique

#### Q-01 — Pre-save hook `Evaluation` redéfinissait `LOCKED` localement
**Fichier :** `models/Evaluation.js`  
**Impact :** La constante `LOCKED_STATUSES` était exportée et réutilisable, mais le hook redéfinissait un tableau identique en dur. Risque de désynchronisation lors d'une future modification (ex: oubli d'ajouter `'archived'` dans le hook mais pas dans `LOCKED_STATUSES`).  
**Correction :** Le hook utilise directement `LOCKED_STATUSES`.

#### Q-02 — `__v` (version key Mongoose) exposé dans toutes les réponses API
**Fichiers :** tous les modèles  
**Impact :** Mongoose ajoute un champ `__v` à chaque document. Ce champ interne pollue tous les payloads JSON (ex: `{ "__v": 0, "_id": "...", ... }`), crée des incohérences front/back et expose des détails d'implémentation inutiles.  
**Correction :** Ajout de `versionKey: false` dans les options de schema de tous les modèles : `User`, `Evaluation`, `Campaign`, `Form`, `Event`, `Resource`, `Config`, `OffboardingRequest`.

#### Q-03 — `mongoose.connection.close()` avec callback (déprécié Mongoose 8)
**Fichier :** `config/db.js`  
**Impact :** Mongoose 8 fait de `connection.close()` une Promise. La syntaxe callback fonctionne encore mais est dépréciée et cassera dans Mongoose 9+.  
**Correction :** Remplacement par la syntaxe Promise (`.then().catch()`).

#### Q-04 — Export `OffboardingRequest` avec clé `model` ambiguë
**Fichier :** `models/OffboardingRequest.js`  
**Impact :** Le fichier exportait `{ model: model('OffboardingRequest', ...) }`. La clé `model` masquait la fonction `model` de Mongoose importée dans le même scope, rendant le code confus et fragile pour quiconque ajoutait du code dans le fichier.  
**Correction :** Renommage de la clé en `OffboardingRequest` → `{ OffboardingRequest: model(...) }`. Mise à jour de `models/index.js` et `routes/offboarding.js`.

---

### 🔵 Indexes manquants

#### I-01 — Index manquant sur `(targetType, createdAt)` dans `AuditLog`
**Fichier :** `models/AuditLog.js`  
**Requête affectée :** "Afficher tous les événements d'audit sur les Campaigns/Evaluations" — utilisé par le dashboard admin.  
**Correction :** Ajout de `auditLogSchema.index({ targetType: 1, createdAt: -1 })`.

#### I-02 — Indexes manquants sur `createdBy` et `(startDate, endDate)` dans `Campaign`
**Fichier :** `models/Campaign.js`  
**Requêtes affectées :**  
  - Dashboard RH "mes campagnes" : `Campaign.find({ createdBy: userId })`  
  - Scheduler d'expiration : `Campaign.find({ startDate: { $lte: today }, endDate: { $gte: today } })`  
**Correction :** Ajout de `campaignSchema.index({ createdBy: 1 })` et `campaignSchema.index({ startDate: 1, endDate: 1 })`.

---

## 2. Corrections appliquées — récapitulatif

| # | Fichier | Type | Description |
|---|---------|------|-------------|
| 1 | `config/constants.js` | Bug critique | Ajout de `'archived'` dans `EVALUATION_STATUSES` |
| 2 | `models/Evaluation.js` | Bug critique | Ajout de `archived: []` dans `VALID_TRANSITIONS` |
| 3 | `models/Evaluation.js` | Bug critique | Ajout de `'archived'` dans `LOCKED_STATUSES` |
| 4 | `models/Evaluation.js` | Qualité | Pre-save utilise `LOCKED_STATUSES` au lieu d'un tableau local |
| 5 | `models/Evaluation.js` | Qualité | `versionKey: false` |
| 6 | `models/User.js` | Bug critique | Ajout des champs `phone` et `avatar` |
| 7 | `models/User.js` | Qualité | `versionKey: false` |
| 8 | `models/AuditLog.js` | Bug | Suppression du `index: true` redondant sur `createdAt` |
| 9 | `models/AuditLog.js` | Index | Ajout index `(targetType, createdAt)` |
| 10 | `models/Campaign.js` | Qualité | `versionKey: false` |
| 11 | `models/Campaign.js` | Index | Ajout index `createdBy` et `(startDate, endDate)` |
| 12 | `models/Form.js` | Qualité | `versionKey: false` |
| 13 | `models/Event.js` | Qualité | `versionKey: false` |
| 14 | `models/Resource.js` | Qualité | `versionKey: false` |
| 15 | `models/Config.js` | Qualité | `versionKey: false` |
| 16 | `models/OffboardingRequest.js` | Qualité | `versionKey: false` + renommage export en `OffboardingRequest` |
| 17 | `models/index.js` | Qualité | Mise à jour import `OffboardingRequest` |
| 18 | `routes/offboarding.js` | Qualité | Mise à jour import `OffboardingRequest` |
| 19 | `config/db.js` | Qualité | `connection.close()` → syntaxe Promise |

---

## 3. Tests créés

### `__tests__/models/user.test.js` — 36 tests (nouveau)

Couvre sans connexion MongoDB (Mongoose `doc.validate()`) :

- **Constants** : vérification de `ROLES`, `LOCALES`, `THEMES`, `NOTIF_PREF_KEYS`, `AUTH_SOURCES`
- **Champs requis** : `email`, `firstName`, `lastName` manquants → erreur de validation
- **Email** : format invalide rejeté, normalisation lowercase
- **Role enum** : tous les rôles valides acceptés, rôle inconnu rejeté, défaut `employee`
- **Department enum** : `null` accepté, département inconnu rejeté, tous les départements valides
- **notificationPrefs** : clé inconnue rejetée, valeur non-booléenne rejetée, prefs valides acceptées
- **Bcrypt regex** : vrai hash reconnu, mot de passe en clair non confondu avec un hash
- **offboardingStatus** : défaut `active`, valeurs invalides rejetées, transitions valides acceptées
- **versionKey** : `__v` absent du `toObject()`
- **Champs RGPD** : `phone` et `avatar` présents, `phone` > 30 chars rejeté

### `__tests__/models/evaluation.test.js` — mis à jour

- Ajout du test `'archived' has no valid transitions`
- `LOCKED_STATUSES` inclut maintenant `'archived'`

### `__tests__/config/constants.test.js` — mis à jour

- Compte mis à jour : `EVALUATION_STATUSES.length === 10`
- Ajout du test `contains terminal status "archived"`

---

## 4. Recommandations pour l'équipe frontend

### Ce que les APIs garantissent maintenant

1. **`__v` supprimé de tous les payloads** — plus besoin de le filtrer côté client.

2. **`status: 'archived'` est un statut officiel** pour les évaluations. L'UI peut l'afficher comme « Annulée (départ) » dans l'historique. Les filtres `?status=archived` fonctionnent correctement.

3. **`phone` et `avatar` sont présents dans les réponses `/api/users`** — valent `null` par défaut. L'affichage de l'avatar dans le topbar peut utiliser `user.avatar ?? fallback`.

4. **Anonymisation RGPD complète** — `DELETE /api/users/:id/gdpr-anonymize` efface désormais réellement `phone` et `avatar` (précédemment ignorés silencieusement).

5. **Indexes DB** — les pages suivantes sont maintenant couvertes par des index efficaces :
   - Dashboard analytics RH (filtrage par `targetType` dans l'audit log)
   - Liste des campagnes créées par un utilisateur spécifique
   - Scheduler/cron d'expiration des campagnes par plage de dates

### Points d'attention

- Si la base de données est déjà en production avec des documents `__v`, les anciens documents conserveront le champ. Le `versionKey: false` empêche sa création sur les **nouveaux** documents. Un script de migration `$unset: { __v: 1 }` peut être exécuté en one-shot si la cohérence est requise.
- L'index TTL de `AuditLog` (2 ans) était en conflit avec un index simple dupliqué. MongoDB peut mettre jusqu'à 60 secondes à synchroniser les changements d'index sur une instance existante — vérifier via `db.auditlogs.getIndexes()` après déploiement.
