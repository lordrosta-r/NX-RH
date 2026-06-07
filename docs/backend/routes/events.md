# Route : `/api/events`

**Fichier :** `mongo/server/routes/events.js`
**Protégé :** `authGuard` + `mutationLimiter`

## Endpoints

### `GET /api/events`

Liste les événements calendrier (filtrée par rôle).

- admin/hr : tous les événements
- Autres : événements dont `targetRoles` contient leur rôle

**Query :** `?page`, `?limit`

---

### `POST /api/events`

Créer un événement (admin/hr uniquement).

**Body :** `{ title, date, type, description?, location?, endDate?, campaignId?, targetRoles? }`

---

### `PATCH /api/events/:id`

Modifier un événement (admin/hr uniquement).

---

### `DELETE /api/events/:id`

Supprimer un événement (admin/hr uniquement).
