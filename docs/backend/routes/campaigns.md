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

**Body :** `{ name, description?, startDate, endDate, targetDepartments?, extendedVisibility? }`

> ⚠️ La campagne ne contient **pas** de `formId`. Les formulaires sont liés à une campagne via leur propre champ `campaignId`, après la création. Utiliser `POST /api/campaigns/:id/copy-template` pour copier un template dans une campagne.

---

### `POST /api/campaigns/:id/copy-template`

Copier un template (formulaire réutilisable) vers une campagne (admin/hr uniquement).

**Body :** `{ templateId }`

**Comportement :**
1. Vérifie que le template existe et a `campaignId: null`
2. Crée une copie du formulaire avec `campaignId` et `templateSourceId` renseignés
3. Retourne le nouveau formulaire créé

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
