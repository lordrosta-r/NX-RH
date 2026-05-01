# Route : `/api/users`

**Fichier :** `mongo/server/routes/users.js`
**Protégé :** `authGuard` + `mutationLimiter`

## Scope par rôle

| Rôle | Périmètre |
|------|-----------|
| admin/hr/director | Tous les utilisateurs |
| manager | Uniquement ses subordonnés directs (`managerId === req.user.id`) |
| employee | Accès refusé (403) |

## Endpoints

### `GET /api/users`

Liste les utilisateurs (scope par rôle, voir ci-dessus).

**Query :** `?role`, `?department`, `?search` (prénom/nom/email), `?isActive`, `?page`, `?limit`

> Le champ `search` est échappé regex (anti-ReDoS) et limité à 100 chars.

---

### `GET /api/users/:id`

Détail d'un utilisateur. Le `passwordHash` est toujours exclu.

---

### `POST /api/users`

Créer un utilisateur (admin/hr uniquement).

**Body :** `{ email, firstName, lastName, role, password, department?, managerId? }`

---

### `PATCH /api/users/:id`

Modifier un utilisateur (admin/hr uniquement).

**Body :** champs partiels

> Un admin ne peut pas modifier son propre rôle.

---

### `DELETE /api/users/:id`

Désactiver un utilisateur (`isActive: false`) — admin uniquement.

> La suppression physique n'est pas supportée (intégrité référentielle des évaluations).

---

### `GET /api/users/:id/evaluations`

Récupère les évaluations d'un utilisateur spécifique.

## Sécurité

- `passwordHash` jamais retourné (`select: false` dans le schema)
- Validation `managerId` (cycle detection dans le pré-save du model User)
- `isActive: false` = révocation immédiate (vérifié dans `authGuard`)
