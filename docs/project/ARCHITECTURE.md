# NanoXplore RH — Architecture serveur

## Vue d'ensemble

```
Client (React SPA)
        │
        │ HTTPS (cookie httpOnly JWT)
        ▼
┌───────────────────────────────────────────────┐
│                Express Server                 │
│                                               │
│  Global middleware stack                      │
│  ┌─────────────────────────────────────────┐  │
│  │ CORS strict (CLIENT_ORIGIN whitelist)   │  │
│  │ Helmet (CSP + HSTS + X-Frame-Options)   │  │
│  │ express.json (limit: 100kb)             │  │
│  │ cookieParser                            │  │
│  │ express-rate-limit (apiLimiter: 2000/min│  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  Public routes                                │
│  ┌─────────────────────────────────────────┐  │
│  │ GET  /api/health                        │  │
│  │ POST /api/auth/login                    │  │
│  │ POST /api/auth/logout                   │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  Protected API (authGuard → JWT + RBAC + DB)  │
│  ┌─────────────────────────────────────────┐  │
│  │ /api/users          [all authenticated] │  │
│  │ /api/campaigns      [all authenticated] │  │
│  │ /api/forms          [all authenticated] │  │
│  │ /api/evaluations    [all authenticated] │  │
│  │ /api/analytics      [all authenticated] │  │
│  │ /api/events         [all authenticated] │  │
│  │ /api/resources      [all authenticated] │  │
│  │ /api/offboarding    [all authenticated] │  │
│  │ /api/admin/audit    [admin, hr]         │  │
│  │ /api/admin/ldap     [admin]             │  │
│  │ /api/admin          [admin]             │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  SPA fallback (non-API GET → index.html)      │
│                                               │
│  Error handler (errorHandler middleware)      │
└───────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────┐
│              MongoDB (Mongoose)               │
│                                               │
│  Collections: User, Campaign, Form,           │
│  Evaluation, Event, Resource, Config,         │
│  AuditLog, OffboardingRequest                 │
└───────────────────────────────────────────────┘
```

## Couches applicatives

### 1. Middleware global (`index.js`)

| Middleware | Rôle |
|------------|------|
| `cors` | Whitelist CLIENT_ORIGIN — refuse les origines inconnues |
| `helmet` | CSP + HSTS + X-Frame-Options + X-Content-Type-Options |
| `express-rate-limit` (apiLimiter) | 2000 req/min global sur /api |
| `express-rate-limit` (mutationLimiter) | 500 req/min sur les routes mutantes |
| `cookieParser` | Parse le cookie JWT httpOnly |
| `express.json` | Limite 100kb pour éviter les DoS par payload |

### 2. Authentification (`middleware/authGuard.js`)

- Vérifie le cookie `token` (JWT HS256)
- Contrôle le rôle via `allowedRoles[]` (RBAC)
- Vérifie `isActive` en base (révocation instantanée)
- Retourne 401 (pas de token) ou 403 (rôle insuffisant)

### 3. Routes (`routes/`)

Chaque module route = un fichier Express Router.
- Validation des paramètres (ObjectId, types) en entrée de chaque handler
- `next(err)` systématique pour propager vers errorHandler
- `lean()` sur toutes les requêtes read-only (performances)

### 4. Services (`services/`)

| Service | Rôle |
|---------|------|
| `mailer.js` | Envoi d'emails via nodemailer (SMTP ou Ethereal en dev) |
| `notificationService.js` | Logique de notification par rôle |
| `ldapService.js` | Test, preview, sync LDAP → MongoDB |
| `managerVisibility.js` | Calcul récursif de la visibilité étendue des managers |
| `scheduler.js` | Jobs récurrents (expiration des évaluations, rappels) |

### 5. Gestion d'erreurs (`middleware/errorHandler.js`)

Centralise tous les cas d'erreur :
- `ValidationError` (Mongoose) → 400
- `CastError` (ObjectId malformé) → 400
- `code 11000` (doublon MongoDB) → 409
- `TokenExpiredError` / `JsonWebTokenError` → 401
- Autres → 500 (message masqué en production)

## Sécurité

- Cookies JWT `httpOnly + secure + sameSite: strict`
- CORS strict (pas de wildcard)
- Rate limiting double sur `/login` (par email + par IP)
- Helmet CSP
- Pas d'exposition des erreurs 500 en production
- Validation des ObjectId avant toute requête MongoDB
- Regex ReDoS-safe sur la validation email
- LDAP TLS avec `rejectUnauthorized: true` par défaut
