# Route : `/api/auth`

**Fichier :** `mongo/server/routes/auth.js`
**Rôle :** Authentification — aucun `authGuard` sur ce module (public).

## Endpoints

### `POST /api/auth/login`

Vérifie les identifiants, émet un cookie JWT httpOnly.

**Rate limiting :** 5 essais/15min par email + 20 essais/15min par IP

**Body :** `{ email, password, remember? }`

**Réponse :** `{ user: { id, email, firstName, lastName, role } }`

**Cookie émis :** `token` — httpOnly, secure (prod), sameSite: strict

**Durée :** 8h par défaut, 30 jours si `remember: true`

---

### `POST /api/auth/logout`

Supprime le cookie JWT.

**Réponse :** `{ message: "Déconnecté" }`

---

### `GET /api/auth/me`

Revalide la session et retourne l'utilisateur courant. Utilisé par `useAuthUser()` React.

**Protégé :** `authGuard()` (tous les rôles)

**Réponse :** profil complet filtré selon le rôle (notificationPrefs filtrées)

---

### `PATCH /api/auth/preferences`

Met à jour les préférences de l'utilisateur courant (locale, theme, notificationPrefs).

**Protégé :** `authGuard()` (tous les rôles)

**Body :** `{ locale?, theme?, notificationPrefs? }`

**Notes :** whitelist stricte — les clés de notification sont validées contre `NOTIF_KEYS_BY_ROLE[role]`

## Sécurité

- Validation ReDoS-safe de l'email (longueur max avant regex)
- `bcrypt.compare()` sur le hash — timing-safe
- Double rate limiting sur POST /login
- `select('+passwordHash')` uniquement sur cette route
