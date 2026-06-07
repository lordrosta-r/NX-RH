# Route : `/api/forms`

**Fichier :** `mongo/server/routes/forms.js`
**Protégé :** `authGuard` (tous les rôles authentifiés)

## Endpoints

### `GET /api/forms`

Liste les formulaires.

**Query :** `?campaignId`, `?formType`

---

### `GET /api/forms/:id`

Détail d'un formulaire avec ses questions.

---

### `POST /api/forms`

Créer un formulaire (admin/hr uniquement).

**Body :** `{ title, description?, formType, isAnonymous?, campaignId?, questions: [...] }`

---

### `PATCH /api/forms/:id`

Modifier un formulaire (admin/hr uniquement).

> ⚠️ Bloqué si `frozenAt` est renseigné (évaluations existantes) — seuls `title` et `description` restent modifiables.

---

### `DELETE /api/forms/:id`

Supprimer un formulaire (admin/hr uniquement).

> ⚠️ Impossible si `frozenAt` est renseigné.

## Notes

- `frozenAt` est automatiquement renseigné lors de la création de la première évaluation liée à ce formulaire
- `upward_feedback` est toujours `isAnonymous: true` (forcé par pre-save)
