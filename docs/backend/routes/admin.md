# Route : `/api/admin`

**Fichier :** `mongo/server/routes/admin.js`
**Protégé :** `authGuard(['admin'])` appliqué dans `index.js`

## Endpoints

### `POST /api/admin/email/test`

Envoie un email de test via nodemailer.

**Body :** `{ to: "email@example.com" }`

**Réponse :** `{ sent: true, previewUrl: string|null }`

> `previewUrl` est renseigné uniquement en dev (Ethereal mail). En production, toujours `null`.

---

### `GET /api/admin/config`

Liste toutes les clés de configuration applicative (modèle `Config`).

**Réponse :** `[{ key, value, createdAt, updatedAt }]`

---

### `GET /api/admin/config/:key`

Récupère la valeur d'une clé de configuration.

**Réponse :** `{ key, value, createdAt, updatedAt }`

---

### `PUT /api/admin/config/:key`

Crée ou remplace la valeur d'une clé (upsert).

**Body :** `{ value: <any> }`

---

### `PATCH /api/admin/config/:key`

Met à jour la valeur d'une clé existante.

**Body :** `{ value: <any> }`

**Réponse :** 404 si la clé n'existe pas

---

### `DELETE /api/admin/config/:key`

Supprime une clé de configuration.

**Réponse :** 204 No Content

## Sous-routes admin

| Préfixe | Fichier | Rôles |
|---------|---------|-------|
| `/api/admin/ldap` | `routes/ldap.js` | admin |
| `/api/admin/audit` | `routes/audit.js` | admin, hr |
| `/api/admin` | `routes/admin.js` | admin |

> ⚠️ L'ordre de déclaration dans `index.js` est important : `/api/admin/audit` DOIT être déclaré avant `/api/admin` pour que le `authGuard(['admin','hr'])` s'applique correctement.
