# Route : `/api/campaigns`

**Fichier :** `mongo/server/routes/campaigns.js`
**Protégé :** `authGuard` (tous les rôles authentifiés)

## Endpoints

### `GET /api/campaigns`

Liste les campagnes.

**Scope par rôle :**
- admin/hr/director/manager : toutes (filtrables par `?status`)
- employee : uniquement les campagnes `active`

**Query :** `?status=draft|active|closed|archived`, `?page`, `?limit`

---

### `GET /api/campaigns/:id`

Détail d'une campagne + statistiques de complétion (total évaluations, réparties par statut).

---

### `POST /api/campaigns`

Créer une campagne (admin/hr uniquement).

**Body :** `{ name, description?, formId, startDate, endDate, targetDepartments?, extendedVisibility? }`

Gèle le formulaire (`frozenAt`) si des évaluations y sont associées.

---

### `PATCH /api/campaigns/:id`

Modifier ou changer le statut d'une campagne (admin/hr uniquement).

**Transitions autorisées :** `draft → active → closed → archived` (irréversible)

**Body :** `{ name?, description?, status?, targetDepartments?, extendedVisibility? }`

---

### `DELETE /api/campaigns/:id`

Supprimer une campagne (admin/hr uniquement). Uniquement si `status ∈ ['draft', 'archived']`.

## Notes

- `createdBy` est automatiquement renseigné avec `req.user.id`
- Les statistiques de complétion sont calculées via `Evaluation.aggregate()`
- `targetDepartments: []` = toute l'entreprise
