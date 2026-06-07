# Route : `/api/offboarding`

**Fichier :** `mongo/server/routes/offboarding.js`
**Protégé :** `authGuard` + `mutationLimiter`

## Endpoints

### `GET /api/offboarding`

Liste les demandes d'offboarding (admin/hr uniquement).

---

### `POST /api/offboarding`

Créer une demande d'offboarding pour un utilisateur (admin/hr uniquement).

**Body :** `{ userId, reason?, targetDate? }`

> Une seule demande par utilisateur (index unique sur `userId`).

---

### `GET /api/offboarding/:id`

Détail d'une demande d'offboarding.

---

### `PATCH /api/offboarding/:id`

Mettre à jour la checklist (cocher/décocher des étapes).

**Body :** `{ checklistItemId, done: boolean }`

---

### `DELETE /api/offboarding/:id`

Annuler une demande d'offboarding (admin uniquement).

## Comportement

Quand toutes les étapes de la checklist sont `done: true` :
1. `OffboardingRequest.completedAt` est renseigné
2. `User.isActive` est passé à `false`
3. L'utilisateur est immédiatement révoqué (l'`authGuard` vérifie `isActive` en DB)
