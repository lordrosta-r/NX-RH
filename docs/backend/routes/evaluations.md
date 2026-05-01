# Route : `/api/evaluations`

**Fichier :** `mongo/server/routes/evaluations/` (module splitté)

**Structure :**
- `index.js` — routeur principal (montage des handlers)
- `helpers.js` — `sanitizeAnonymity()`, `formatAnswer()`, `COMPLETED_STATUSES`
- `queries.js` — handlers GET (history, list, export, detail)
- `mutations.js` — handlers PATCH/POST (create, update, reassign, expire)
- `bulk.js` — opérations en masse (bulkCreate, bulkAction)
- `pdf.js` — export PDF (handlePdf)

**Protégé :** `authGuard(['admin','director','manager','employee','hr'])`

**Rate limiting :** `/api/evaluations/bulk` reçoit `mutationLimiter` en plus du global

## Endpoints

### `GET /api/evaluations/history`

Historique des évaluations de l'utilisateur courant (évaluateur ou évalué).

**Query :** `?campaignId`, `?status`, `?page`, `?limit`

---

### `GET /api/evaluations`

Liste des évaluations (scopée par rôle).
- admin/hr : tout
- director : évaluations de son périmètre
- manager : ses évaluations + celles de ses subordonnés
- employee : ses évaluations uniquement

**Query :** `?campaignId`, `?evaluateeId`, `?evaluatorId`, `?status`, `?page`, `?limit`

---

### `GET /api/evaluations/export`

Export CSV des évaluations (admin/hr uniquement).

**Query :** `?campaignId` (requis), `?status`

**Réponse :** `Content-Type: text/csv`

---

### `GET /api/evaluations/:id`

Détail d'une évaluation. Accès : évaluateur, évalué, admin/hr, director.

Les réponses sont anonymisées (`sanitizeAnonymity`) si le formulaire est anonyme et que l'appelant n'est pas admin/hr.

---

### `POST /api/evaluations`

Créer une évaluation (admin/hr uniquement).

**Body :** `{ campaignId, formId, evaluatorId, evaluateeId }`

---

### `POST /api/evaluations/bulk`

Créer des évaluations en masse (max 500 par batch, admin/hr).

**Body :** `{ evaluations: [{ campaignId, formId, evaluatorId, evaluateeId }] }`

**Réponse :** `{ created: N }` ou 207 en cas de doublons partiels

---

### `PATCH /api/evaluations/bulk`

Actions en masse sur les évaluations : `archive`, `sign_hr`, `assign_reviewer`.

**Body :** `{ ids: [...], action: string, reviewerId?: string }`

**Max :** 200 IDs par opération

---

### `PATCH /api/evaluations/:id`

Met à jour une évaluation (réponses, commentaires, statut, signature).

Transitions de statut contrôlées par `ROLE_TRANSITIONS` et `VALID_TRANSITIONS`.

---

### `PATCH /api/evaluations/:id/reassign`

Réassigner l'évaluateur d'une évaluation (admin/hr uniquement).

**Body :** `{ newEvaluatorId }`

---

### `POST /api/evaluations/:id/expire`

Force l'expiration d'une évaluation (admin/hr uniquement).

---

### `GET /api/evaluations/:id/pdf`

Génère et envoie un PDF de l'évaluation.

**Accès :** évaluateur, évalué, admin/hr

**Réponse :** `Content-Type: application/pdf`

## Ordre des routes (IMPORTANT)

Routes statiques en PREMIER pour éviter les conflits Express :
```
/history → /export → / → /bulk (POST+PATCH) → / (POST)
→ /:id/pdf → /:id/reassign → /:id (GET) → /:id (PATCH) → /:id/expire
```
