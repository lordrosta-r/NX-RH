# Route : `/api/admin/ldap`

**Fichier :** `mongo/server/routes/ldap.js`
**Protégé :** `authGuard(['admin'])` (appliqué dans `index.js`)

## Endpoints

### `POST /api/admin/ldap/test`

Teste la connexion LDAP (bind + unbind).

**Body :** `{ config: { host, bindDN, bindPassword?, baseDN, ... } }`

**Réponse :** `{ ok: true, info }` ou `{ ok: false, error }`

> Si `bindPassword` n'est pas fourni, récupère celui stocké dans `Config.key = 'ldap'`

---

### `POST /api/admin/ldap/preview`

Liste jusqu'à 50 utilisateurs LDAP (prévisualisation avant sync).

**Body :** `{ config: {...} }`

---

### `POST /api/admin/ldap/sync`

Synchronise les utilisateurs LDAP vers MongoDB (max 1000 entrées).

**Body :** `{ config: {...} }`

**Réponse :** `{ created, updated, skipped, errors[] }`

---

### `GET /api/admin/ldap/config`

Récupère la configuration LDAP sauvegardée (sans `bindPassword`).

---

### `PUT /api/admin/ldap/config`

Sauvegarde la configuration LDAP.

> Si `bindPassword` est absent du body, conserve le mot de passe existant en base.

## Sécurité

- `bindPassword` est **toujours strip**pé des réponses API
- TLS `rejectUnauthorized: true` par défaut
