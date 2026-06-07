# Route : `/api/resources`

**Fichier :** `mongo/server/routes/resources.js`
**Protégé :** `authGuard` + `mutationLimiter`

## Endpoints

### `GET /api/resources`

Liste les ressources visibles selon le rôle.

- admin/hr : toutes les ressources (draft + published)
- Autres : uniquement les ressources `published` dont `visibleTo` contient leur rôle

---

### `GET /api/resources/:id`

Détail d'une ressource.

---

### `GET /api/resources/:id/file`

Télécharge le fichier associé à la ressource.

**Réponse :** `Content-Disposition: attachment` avec le fichier depuis `UPLOADS_DIR`

---

### `POST /api/resources`

Uploader une nouvelle ressource (admin/hr uniquement).

**Body :** multipart/form-data avec le fichier + métadonnées

---

### `PATCH /api/resources/:id`

Modifier les métadonnées ou le statut d'une ressource (admin/hr uniquement).

---

### `DELETE /api/resources/:id`

Supprimer une ressource et son fichier associé (admin/hr uniquement).

## Notes

- Les fichiers sont stockés dans `UPLOADS_DIR` (variable d'environnement)
- Le nom du fichier sur le disque n'est jamais exposé au client (sécurité)
