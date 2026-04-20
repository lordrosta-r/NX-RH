# NanoXplore RH — Sécurité

> Document de référence pour les pratiques de sécurité implémentées dans l'application.
> Basé sur le code source dans `mongo/server/`.

---

## 1. Vue d'ensemble

NanoXplore RH applique une défense en profondeur :

- **Authentification** par JWT stocké en cookie httpOnly (jamais accessible en JavaScript)
- **Autorisation** centralisée dans un middleware `authGuard` vérifié côté serveur à chaque requête
- **Headers HTTP** de sécurité via Helmet + directives manuelles
- **CORS** restreint à une origine explicite
- **Validation des entrées** : whitelist de champs, validation des ObjectId MongoDB, regex email au niveau du schéma Mongoose
- **Mots de passe** hachés avec bcrypt, jamais exposés dans les réponses API
- **CSP** déclarée dans chaque page HTML via `<meta http-equiv>`

---

## 2. Authentification

_Source : `mongo/server/routes/auth.js`_

### Flux de connexion (`POST /api/auth/login`)

1. L'email est normalisé (`toLowerCase().trim()`) avant la recherche en base.
2. Le compte doit être `isActive: true` et `authSource: 'local'`.
3. Le mot de passe est vérifié avec `bcrypt.compare()`.
4. En cas d'échec (utilisateur inexistant ou mauvais mot de passe), la réponse est identique : `"Identifiants invalides"` — pas d'énumération des comptes.

### Cookie JWT

```js
res.cookie('token', token, {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production', // HTTPS requis en prod
  sameSite: 'strict',
  maxAge:   8 * 60 * 60 * 1000, // 8 heures
})
```

| Flag | Effet |
|---|---|
| `httpOnly` | Inaccessible depuis `document.cookie` — protège contre le vol XSS |
| `secure` | Envoyé uniquement sur HTTPS (activé si `NODE_ENV=production`) |
| `sameSite: 'strict'` | Bloque l'envoi cross-site — protège contre le CSRF |
| `maxAge: 8h` | Expire automatiquement après 8 heures d'inactivité |

### Token JWT

Le token contient : `{ id, email, role }`. Durée configurée via `JWT_EXPIRES_IN` (défaut `8h`).

---

## 3. Autorisation

_Source : `mongo/server/middleware/authGuard.js`, `mongo/server/index.js`_

### authGuard middleware

```js
const authGuard = (allowedRoles = []) => (req, res, next) => { ... }
```

- Lit le token depuis **`req.cookies.token`** (cookie httpOnly uniquement)
- Vérifie la signature avec `jwt.verify(token, process.env.JWT_SECRET)`
- Distingue les deux types d'erreur JWT :
  - `TokenExpiredError` → `"Session expirée"` (401)
  - `JsonWebTokenError` → `"Token invalide"` (401)
- Contrôle le rôle si `allowedRoles` est fourni → `403` si insuffisant
- Attache `req.user = { id, email, role }` pour les routes protégées

### Rôles disponibles

| Rôle | Pages accessibles |
|---|---|
| `admin` | Toutes |
| `hr` | `/employee`, `/hr`, `/formeditor`, `/evaluation` |
| `manager` | `/employee`, `/manager`, `/evaluation` |
| `employee` | `/employee`, `/evaluation` |

> Compatibilité : les comptes legacy `director` sont redirigés vers `/manager`.

### Application des rôles (index.js)

```js
app.get('/hr',         authGuard(['admin', 'hr']),                                    sendPage('hr'))
app.get('/manager',    authGuard(['admin', 'director', 'manager']),                   sendPage('manager'))
app.get('/director',   authGuard(['admin', 'director']),                              (req, res) => res.redirect(302, '/manager'))
app.get('/formeditor', authGuard(['admin', 'hr']),                                    sendPage('formeditor'))
```

Les routes API sont protégées par un guard global (`authenticated`) couvrant tous les rôles, puis les routes individuelles affinent les droits selon le besoin.

---

## 4. Variables d'environnement sensibles

_Source : `mongo/server/index.js` (startup check)_

| Variable | Obligatoire | Contrainte |
|---|---|---|
| `JWT_SECRET` | ✅ | **Minimum 32 caractères** — l'application refuse de démarrer sinon |
| `MONGO_URI` | ✅ | URI complète de connexion MongoDB |

```js
// Vérification au démarrage — mongo/server/index.js
const required = ['JWT_SECRET', 'MONGO_URI']
for (const v of required) {
  if (!process.env[v]) { process.exit(1) }
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('[Startup] JWT_SECRET trop courte (minimum 32 caractères)')
  process.exit(1)
}
```

**Générer un secret robuste :**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ne jamais commiter `.env` — ce fichier est dans `.gitignore`.

---

## 5. Rate Limiting

✅ **Implémenté** depuis `mongo/server/routes/auth.js`
- Login : 10 tentatives / 15 minutes par IP/email (`express-rate-limit`)
- Nginx : 5 req/min sur `/api/auth/login`, 30 req/min sur `/api/`

---

## 6. CORS

_Source : `mongo/server/index.js`_

```js
// CLIENT_ORIGIN peut contenir plusieurs origines séparées par virgule
// '*' est explicitement rejeté au démarrage
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',').map(o => o.trim())

app.use(cors({
  origin:      (origin, cb) => cb(null, allowedOrigins.includes(origin) || !origin),
  credentials: true,
}))
```

- En production, `CLIENT_ORIGIN` doit être défini à l'URL exacte du frontend (ex: `https://rh.nanoxplore.fr`).
- `credentials: true` est requis pour que le cookie `token` soit envoyé avec les requêtes cross-origin en développement.
- En production, le frontend et l'API sont servis par le même serveur Express — CORS n'intervient pas pour les requêtes intra-domaine.

---

## 7. Headers de sécurité (Helmet)

_Source : `mongo/server/index.js`_

```js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:'],
      connectSrc: ["'self'"],
    }
  },
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true }
    : false,
}))
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
})
```

| Header | Valeur | Protection |
|---|---|---|
| `Content-Security-Policy` | Directives strictes (voir ci-dessus) | Bloque les ressources non autorisées |
| `X-Frame-Options` | `DENY` (géré par Helmet frameguard) | Empêche le clickjacking (iframes) |
| `X-Content-Type-Options` | `nosniff` | Empêche le MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limite les informations envoyées dans `Referer` |

La CSP Helmet est activée avec une politique stricte côté serveur. Les pages HTML déclarent en complément leur propre CSP via `<meta http-equiv>` (voir section 12).

---

## 8. Validation des entrées

### Whitelist de champs (PATCH users)

_Source : `mongo/server/routes/users.js`_

```js
const ALLOWED = ['email', 'firstName', 'lastName', 'department', 'position', 'role', 'managerId', 'isActive']
for (const key of ALLOWED) {
  if (req.body[key] !== undefined) update[key] = req.body[key]
}
```

Seuls les champs de la whitelist peuvent être modifiés — les champs inconnus sont silencieusement ignorés.

Le même pattern est appliqué dans `routes/campaigns.js` :
```js
const EDITABLE = ['name', 'description', 'status', 'startDate', 'endDate', 'targetDepartments', 'extendedVisibility']
```

### Validation des ObjectId MongoDB

_Source : `mongo/server/routes/users.js`, `routes/campaigns.js`, etc._

```js
if (!mongoose.isValidObjectId(req.params.id)) {
  return res.status(400).json({ error: 'ID invalide' })
}
```

Toutes les routes recevant un `:id` en paramètre valident l'ID avant d'interroger MongoDB — évite les injections et les erreurs `CastError`.

### Validation email (modèle Mongoose)

_Source : `mongo/server/models/User.js`_

```js
email: {
  match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email invalide'],
  lowercase: true,
  trim: true,
}
```

La validation est appliquée au niveau du schéma Mongoose — toute tentative d'insertion/modification avec un email invalide échoue avant l'accès à la base.

---

## 9. Mots de passe

_Source : `mongo/server/models/User.js`, `mongo/server/routes/auth.js`_

- Hachés avec **bcrypt** avant stockage dans le champ `passwordHash`.
- Le champ `passwordHash` est déclaré **`select: false`** dans le schéma Mongoose :
  ```js
  passwordHash: { type: String, select: false, default: null }
  ```
  Il n'est **jamais** inclus dans les réponses API sauf forçage explicite (`.select('+passwordHash')`), utilisé uniquement dans `POST /api/auth/login`.
- La vérification se fait exclusivement via `bcrypt.compare()` — pas de comparaison en clair.
- Les utilisateurs LDAP n'ont pas de `passwordHash` (null) — l'authentification locale est bloquée si `authSource !== 'local'`.

**Salt rounds recommandés :** 12 (équilibre sécurité/performance). Exemple pour créer un hash manuellement :
```bash
node -e "const b = require('bcrypt'); b.hash('motdepasse', 12).then(console.log)"
```

---

## 10. Cookies — récapitulatif des flags

| Flag | Dev | Prod | Justification |
|---|---|---|---|
| `httpOnly` | ✅ | ✅ | Protège contre le vol via XSS — JavaScript ne peut pas lire le cookie |
| `secure` | ❌ | ✅ | Cookie envoyé uniquement sur HTTPS — activé si `NODE_ENV=production` |
| `sameSite: strict` | ✅ | ✅ | Empêche l'envoi du cookie depuis des requêtes cross-site (CSRF) |
| `maxAge: 8h` | ✅ | ✅ | Expiration automatique — limite la durée d'une session compromise |

---

## 11. Session storage — rôle display-only

_Source : `ARCHITECTURE.md`, `client/src/hooks/useAuthUser.js`_

`sessionStorage` est utilisé **uniquement** pour afficher le nom et le rôle de l'utilisateur dans l'UI (anti-flash sur les labels), **jamais** pour prendre des décisions d'autorisation.

Toutes les décisions d'accès sont prises côté serveur via le cookie JWT :
- L'accès à une page protégée → `authGuard` vérifie le cookie **avant** de servir le HTML.
- Les appels API → `authGuard` vérifie le cookie **à chaque requête**.

Un attaquant qui modifie `sessionStorage` ne gagne aucun accès supplémentaire.

---

## 12. Content Security Policy (CSP)

_Source : `client/login.html`, `client/manager.html`, `client/evaluation.html`, etc._

Chaque page HTML déclare une CSP stricte via `<meta http-equiv>` :

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' 'unsafe-inline';
               style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
               font-src https://fonts.gstatic.com;
               img-src 'self' data: https://images.unsplash.com;
               connect-src 'self';">
```

| Directive | Valeur | Effet |
|---|---|---|
| `default-src` | `'self'` | Bloque tout chargement externe par défaut |
| `script-src` | `'self' 'unsafe-inline'` | Scripts locaux + inline (requis par Vite) |
| `style-src` | `'self' 'unsafe-inline' fonts.googleapis.com` | Styles + Google Fonts |
| `connect-src` | `'self'` | Requêtes XHR/fetch uniquement vers la même origine |
| `img-src` | `'self' data: unsplash.com` | Images locales, data URIs, Unsplash |

> **Note :** `'unsafe-inline'` pour les scripts est nécessaire pour le script anti-flash de thème. Envisager un `nonce` pour durcir davantage.

---

## 13. Checklist production

Avant tout déploiement en production, vérifier les points suivants :

### Variables d'environnement
- [ ] `JWT_SECRET` défini et **≥ 32 caractères** (l'app refuse de démarrer sinon)
- [ ] `MONGO_URI` pointe vers l'instance de production (pas localhost)
- [ ] `NODE_ENV=production` défini — active `secure: true` sur le cookie JWT
- [ ] `CLIENT_ORIGIN` défini à l'URL exacte du frontend (ex: `https://rh.nanoxplore.fr`)
- [ ] Fichier `.env` **non commité** dans le repository

### TLS / HTTPS
- [ ] Certificats TLS placés dans `nginx/certs/` (jamais committés)
- [ ] HTTPS actif sur Nginx — requis pour `secure: true` sur le cookie

### MongoDB
- [ ] Accès MongoDB restreint au réseau interne (pas exposé publiquement)
- [ ] Authentification MongoDB activée

### Headers & durcissement
- [ ] Valider les headers de sécurité avec [securityheaders.com](https://securityheaders.com)
- [ ] Vérifier que `X-Frame-Options: DENY` est bien retourné

### Rate limiting
- [x] `express-rate-limit` sur `POST /api/auth/login` — ✅ implémenté (voir section 5)

### Monitoring
- [ ] Logs d'erreurs activés et centralisés
- [ ] Endpoint `/api/health` supervisé
