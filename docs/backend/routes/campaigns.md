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

> Les formulaires sont liés via `POST /api/campaigns/:id/forms` après la création.

---

### `POST /api/campaigns/:id/forms`

Lier un formulaire existant à une campagne (admin/hr uniquement).

**Body :** `{ formId }`

**Comportement :**
1. Vérifie que le formulaire existe
2. Vérifie qu'aucun formulaire du même `formType` n'est déjà lié à cette campagne
3. Ajoute `formId` dans `campaign.formIds`
4. Retourne la campagne mise à jour

---

### `DELETE /api/campaigns/:id/forms/:formId`

Délier un formulaire d'une campagne (admin/hr uniquement). Retire le formId de `campaign.formIds`. Le formulaire lui-même n'est pas supprimé.

---

### `PATCH /api/campaigns/:id`

Modifier ou changer le statut d'une campagne (admin/hr uniquement).

**Transitions autorisées :** `draft → active → closed → archived` (irréversible)

**Body :** `{ name?, description?, status?, targetDepartments?, extendedVisibility? }`

> Si le statut passe à `closed` ou `archived` alors que la complétion est < 100 %, la réponse contient un champ `warning` (ex : `"40% des évaluations sont complètes (8/20)"`). La transition s'effectue quand même — le warning est informatif.

---

### `DELETE /api/campaigns/:id`

Supprimer une campagne (admin/hr uniquement). Uniquement si `status ∈ ['draft', 'archived']`.

## Notes

- `createdBy` est automatiquement renseigné avec `req.user.id`
- Les statistiques de complétion sont calculées via `Evaluation.aggregate()`
- `targetDepartments: []` = toute l'entreprise
