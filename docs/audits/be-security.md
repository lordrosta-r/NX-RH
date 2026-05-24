# Audit Sécurité Backend — NX-RH

## Résumé exécutif
Le backend est globalement solide en sécurité (JWT httpOnly, bcrypt, mongo-sanitize, rate limiting login, CORS whitelisté, Helmet CSP). Deux points d'attention importants : un IDOR potentiel sur les campagnes et des validateurs Joi qui existent mais ne sont pas branchés sur les routes.

## Score global : 7.5/10

## P0 — Bloquants
Aucun blocant critique.

## P1 — Importants

### P1-1: IDOR potentiel sur le détail des campagnes
**Problème :** `GET /api/campaigns/:id` ne refait pas de contrôle de périmètre/rôle après le `findById`. Un utilisateur authentifié peut potentiellement lire une campagne hors de son scope (draft/archived).
**Où :** `routes/campaigns.js:139-166`
**Impact :** Fuite d'informations sur des campagnes sensibles.
**Remédiation :** Appliquer un filtre RBAC sur la lecture par ID, ou refuser aux rôles non-admin/hr les campagnes non actives.

### P1-2: Validateurs Joi non appliqués sur les routes
**Problème :** Des schémas Joi existent dans `validators/*.js` mais aucune route ne les utilise en middleware. Les données entrent directement en DB sans validation Joi.
**Où :** `routes/auth.js`, `routes/users.js`, `routes/campaigns.js`, `routes/hr/flags.js`
**Impact :** Surface d'attaque NoSQL / payloads inattendus / cohérence métier fragile.
**Remédiation :** Brancher les schémas Joi comme middleware avant toute écriture DB, avec `abortEarly: false` et `stripUnknown: true`.

## P2 — Mineurs / Améliorations

### P2-1: Absence de `.env.example`
**Problème :** Aucun template `.env.example` trouvé pour documenter les variables requises.
**Où :** Racine du projet
**Impact :** Risque d'erreur de déploiement / mauvaise gestion des secrets.

### P2-2: Rate limiting pas spécifique sur tous les endpoints auth
**Problème :** `/login` a un rate limit strict (5/15min/email, 20/15min/IP), mais le reste de `/api/auth` est seulement couvert par le limiter global.
**Où :** `index.js:147-181`, `routes/auth.js:43-62`
**Impact :** Brute force sur d'autres endpoints auth partiellement non mitigé.

### P2-3: Logs potentiellement verbeux
**Problème :** Logs d'erreurs incluant email/IP dans certains cas.
**Où :** `routes/auth.js:91-100`, `routes/hr/flags.js:49`, `middleware/errorHandler.js:56-59`
**Impact :** Fuite indirecte d'informations en cas d'accès aux logs.

## Points positifs ✅
- JWT vérifié avec algorithme imposé (`HS256`)
- Cookie de session sécurisé (`httpOnly`, `sameSite=strict`, `secure` en prod)
- `express-mongo-sanitize` activé
- Limiteurs de login anti brute-force stricts
- `passwordHash` jamais exposé dans les réponses
- CORS whitelisté via `CLIENT_ORIGIN`, `credentials: true`
- CSP restrictive, `frame-ancestors 'none'`, HSTS en prod (Helmet)
- Validation manuelle solide sur les champs critiques (ObjectId, rôles, regex)

## Recommandations prioritaires
1. Ajouter filtre RBAC sur `GET /api/campaigns/:id`
2. Brancher les schémas Joi existants en middleware sur toutes les routes d'écriture
3. Créer `.env.example` avec toutes les variables (sans valeurs sensibles)
4. Centraliser et redacter les logs (éviter de logger des emails complets)
