# NanoXplore RH — Audit de Sécurité

> Réalisé sur la base du code source courant.
> Stack auditée : React SPA + Express/Node.js + MongoDB + Nginx + Docker.

---

## Score de sécurité global

| | Score | Commentaire |
|---|---|---|
| **AVANT corrections** | **5.5 / 10** | Bonne base (bcrypt, JWT httpOnly, rate limit, helmet, CORS strict) mais failles critiques de routage et de configuration |
| **APRÈS corrections** | **8.0 / 10** | Failles critiques et élevées corrigées ; recommandations avancées hors scope KISS restantes |

---

## Tableau des vulnérabilités

| # | Sévérité | Catégorie OWASP | Description | Fichier | Statut |
|---|----------|-----------------|-------------|---------|--------|
| 1 | **CRITIQUE** | A01 – Broken Access Control | Route ordering : `/api/admin/audit` déclarée APRÈS `/api/admin` → `authGuard(['admin'])` bloque les utilisateurs RH avant qu'ils atteignent la route audit. Résultat : le rôle HR ne peut jamais accéder à la piste d'audit. | `mongo/server/index.js` | ✅ Corrigé |
| 2 | **ÉLEVÉ** | A05 – Security Misconfiguration | Mot de passe MongoDB par défaut `changeme` via `${MONGO_ROOT_PASSWORD:-changeme}` dans docker-compose. Si la variable n'est pas définie, la DB démarre avec un mot de passe trivial. | `docker-compose.yml` | ✅ Corrigé |
| 3 | **ÉLEVÉ** | A05 – Security Misconfiguration | `.env.example` contenait des credentials semi-réalistes (`root:changeme`) susceptibles d'être copiés tels quels en production. | `.env.example` | ✅ Corrigé |
| 4 | **ÉLEVÉ** | A05 – Security Misconfiguration | CSP (Helmet) ne définissait pas `frame-ancestors`, laissant le header `X-Frame-Options` comme seule protection anti-framing. De plus, nginx envoyait `DENY` tandis que Helmet envoyait `SAMEORIGIN` (deux headers contradictoires sur la même réponse). | `mongo/server/index.js` | ✅ Corrigé |
| 5 | **MOYEN** | A09 – Logging Failures | Tentatives de connexion échouées (mauvais mot de passe, utilisateur inconnu) non journalisées. Impossible de détecter une attaque par force brute depuis les logs. | `mongo/server/routes/auth.js` | ✅ Corrigé |
| 6 | **MOYEN** | A03 – Injection | Les filtres `action` et `targetType` de la piste d'audit acceptaient n'importe quelle chaîne. Bien que la vérification `typeof` prévenait l'injection d'objet NoSQL, l'absence de whitelist permettait un probing informatif de la piste d'audit (énumération des types d'actions). | `mongo/server/routes/audit.js` | ✅ Corrigé |
| 7 | **MOYEN** | A07 – Authentication Failures | Le mode `remember` génère un JWT de **30 jours** sans mécanisme de révocation serveur (logout ne blackliste pas le token). Atténuation partielle : `authGuard` vérifie `isActive` en DB à chaque requête. | `mongo/server/routes/auth.js` | ⚠️ Atténué (voir recommandations) |
| 8 | **FAIBLE** | A05 – Security Misconfiguration | Le header `Permissions-Policy` est défini par Nginx mais pas par Express/Helmet. En accès direct (sans Nginx, ex: dev `docker compose -f ... .dev.yml`), ce header est absent. | `mongo/server/index.js` | ⚠️ À faire (hors scope KISS) |
| 9 | **FAIBLE** | A09 – Logging Failures | Les connexions réussies ne créent pas d'entrée dans `AuditLog` (seulement `lastLoginAt` mis à jour). Un admin ne peut pas consulter l'historique de connexion d'un utilisateur via la piste d'audit. | `mongo/server/routes/auth.js` | ⚠️ Recommandation |
| 10 | **INFO** | A02 – Cryptographic Failures | `.env` local contient `MONGO_ROOT_PASSWORD=changeme`. Le fichier est correctement exclu du git (`.gitignore`) — aucun secret committé. | `.env` | ℹ️ Non-issue git, risque déploiement local |

---

## Détail des corrections implémentées

### 1. CRITIQUE — Route ordering `/api/admin/audit` (index.js)

**Avant :**
```js
app.use('/api/admin',       mutationLimiter, authGuard(['admin']), adminRoutes)
app.use('/api/admin/audit', apiLimiter, authGuard(['admin', 'hr']), auditRoutes) // ← jamais atteint par HR
```

**Après :**
```js
app.use('/api/admin/audit', apiLimiter, authGuard(['admin', 'hr']), auditRoutes) // ← déclaré en premier
app.use('/api/admin',       mutationLimiter, authGuard(['admin']), adminRoutes)
```

Express fait correspondre les routes dans l'ordre de déclaration. `/api/admin/audit` étant un préfixe de `/api/admin`, le premier `app.use` matchait toujours. En déplaçant la route plus spécifique avant la route générale, les deux rôles `admin` et `hr` y ont accès.

---

### 2. ÉLEVÉ — Mot de passe MongoDB sans fallback faible (docker-compose.yml)

**Avant :** `${MONGO_ROOT_PASSWORD:-changeme}` (mot de passe par défaut si variable absente)

**Après :** `${MONGO_ROOT_PASSWORD:?MONGO_ROOT_PASSWORD is required}` (Docker échoue au démarrage si non défini)

---

### 3. ÉLEVÉ — CSP `frame-ancestors` + Helmet frameguard cohérent (index.js)

Deux problèmes résolus ensemble :
- Ajout de `frameAncestors: ["'none'"]` dans les directives CSP (protection moderne)
- Alignement de `frameguard: { action: 'deny' }` pour que Helmet et Nginx envoient tous les deux `DENY` (plus de headers contradictoires)

---

### 4. MOYEN — Logging des échecs d'authentification (routes/auth.js)

```js
// Après correction
if (!user || user.authSource !== 'local' || !user.passwordHash) {
  console.warn('[auth] Login failed — user not found or wrong authSource:', email.toLowerCase())
  return res.status(401).json({ error: 'Identifiants invalides' })
}
const valid = await bcrypt.compare(password, user.passwordHash)
if (!valid) {
  console.warn('[auth] Login failed — wrong password for:', email.toLowerCase())
  return res.status(401).json({ error: 'Identifiants invalides' })
}
```

Note : l'email est loggé (non le mot de passe). Niveau `warn` pour ne pas polluer les logs de production.

---

### 5. MOYEN — Whitelist des filtres audit (routes/audit.js)

```js
const VALID_ACTIONS = [
  'status_change', 'evaluation_update', 'campaign_create', 'campaign_activate',
  'campaign_update', 'campaign_delete', 'bulk_action', 'offboard', ...
]
const VALID_TARGET_TYPES = ['Evaluation', 'Campaign', 'User', 'Form', 'OffboardingRequest']

if (req.query.action && !VALID_ACTIONS.includes(req.query.action)) {
  return res.status(400).json({ error: `action invalide. Valeurs acceptées: ${VALID_ACTIONS.join(', ')}` })
}
```

---

## Points positifs (ne pas casser)

Ces éléments sont **corrects** et constituent une bonne base de sécurité :

| Mécanisme | Localisation | Commentaire |
|-----------|--------------|-------------|
| JWT httpOnly + `secure` + `sameSite: 'strict'` | `routes/auth.js` | Protection CSRF native, cookie inaccessible depuis JS |
| Rate limiting bi-niveaux login (IP + email) | `routes/auth.js` | 5 tentatives/email, 20/IP en 15 min — anti brute-force efficace |
| CORS strict (liste blanche, pas de wildcard) | `index.js` | Refus explicite du wildcard `*` avec `throw` au démarrage |
| Vérification JWT_SECRET ≥ 32 chars au démarrage | `index.js` | Empêche le déploiement avec un secret faible |
| Vérification `isActive` en DB à chaque requête | `middleware/authGuard.js` | Invalidation immédiate d'un compte désactivé |
| Bcrypt 12 rounds + protection ReDoS email | `models/User.js`, `routes/auth.js` | Hash fort, longueur vérifiée avant regex |
| `passwordHash` `select: false` par défaut | `models/User.js` | Non retourné dans les requêtes normales |
| Projection `-passwordHash -ldapDn` explicite | Toutes les routes | Defence in depth même si `select:false` oublié |
| Séparation réseau Docker frontend/backend | `docker-compose.yml` | Nginx n'a pas accès à MongoDB |
| MongoDB non exposé en production | `docker-compose.yml` | `expose` au lieu de `ports` |
| Non-root user dans le conteneur | `Dockerfile` | `appuser` sans privilèges |
| Échappement regex dans les filtres recherche | `routes/users.js` | Prévention ReDoS sur le search |
| Validation ObjectId avant toute requête `:id` | Toutes les routes | Prévention panic Mongoose sur ID malformé |
| Validation transitions de statut | `routes/evaluations.js`, `routes/campaigns.js` | VALID_TRANSITIONS whitelist |
| Headers sécurité complets via Nginx | `nginx/conf.d/app.conf` | HSTS 2 ans, OCSP, TLS 1.2+/1.3 uniquement |
| `server_tokens off` | `nginx/nginx.conf` | Version Nginx masquée |
| Stack trace masquée en production | `index.js` | `err.message` remplacé par "Internal server error" en prod |

---

## Recommandations non implémentées (hors scope KISS)

### Pour le Backend agent

1. **Token blocklist à la déconnexion** : Stocker les JTI (JWT ID) révoqués dans Redis ou MongoDB avec TTL = expiry. Cela rendrait le logout définitif même pour les tokens `remember: true`. Complexité : moyenne.

2. **Verrouillage de compte après N échecs** : Ajouter un champ `loginAttempts` et `lockUntil` sur le modèle User. Incrémenter à chaque échec, bloquer après 10 tentatives pendant 1h. Actuellement le rate limiter protège par IP/email mais ne verrouille pas le compte en DB.

3. **Journalisation des connexions réussies dans AuditLog** : Actuellement `lastLoginAt` est mis à jour mais aucune entrée n'est créée dans la piste d'audit. Un admin ne peut pas auditer les sessions.

4. **Password change endpoint** : Il n'existe pas de route `/api/auth/change-password`. Les utilisateurs locaux ne peuvent pas changer leur mot de passe via l'interface. Un admin doit intervenir.

5. **Header `Permissions-Policy` via Helmet** : Ajouter `permittedCrossDomainPolicies` et `permissionsPolicy` à la config Helmet pour couvrir les accès directs sans Nginx.

6. **Validation de `req.body` via un schéma (Zod/Joi)** : Actuellement la validation est manuelle route par route. Une lib de validation centralisée réduirait les risques d'oubli sur de nouvelles routes.

### Pour le Frontend agent

1. **Anti-XSS strict** : S'assurer que les données utilisateur affichées dans le DOM ne sont jamais insérées via `dangerouslySetInnerHTML`. Utiliser `textContent` ou les mécanismes React (JSX l'échappe par défaut).

2. **Stockage sécurisé** : Ne jamais stocker de données sensibles dans `localStorage` (le token est en cookie httpOnly — c'est correct). Vérifier qu'aucune route ne logge de données sensibles côté client.

3. **CSP nonce pour les scripts inline** : Le script `theme-init.js` est servi depuis `'self'` (correct). S'assurer qu'aucun script inline n'est ajouté sans hash/nonce.

4. **Gestion d'erreur sans fuite d'info** : Les messages d'erreur de l'API ne doivent pas révéler des détails d'implémentation dans les toasts/UI.

### Pour le DB agent

1. **Chiffrement au repos MongoDB** : Pour les données RH sensibles (évaluations, commentaires), envisager le chiffrement au repos (MongoDB Enterprise ou volume chiffré au niveau OS/Docker).

2. **Audit MongoDB** : Activer les logs d'audit MongoDB (`--auditLog`) pour tracer les opérations DB directes (contournement de l'API).

3. **Indexes sur `auditLog.action`** : Ajouter un index sur `AuditLog.action` pour les filtres fréquents.

4. **Rotation des credentials** : Mettre en place une procédure de rotation du `JWT_SECRET` et du `MONGO_ROOT_PASSWORD` sans downtime (nécessite versioning des tokens).

---

## Surveillance des corrections des autres agents

> Cette section sera mise à jour lorsque les rapports `AUDIT_*.md` des autres agents seront disponibles.

**Points d'attention si un agent modifie les routes Express :**
- Toujours vérifier l'ordre de déclaration des `app.use` pour les routes imbriquées.
- Ne jamais supprimer `authGuard` d'une route sans analyse d'impact.
- Ne pas passer `req.query` ou `req.body` directement dans un filtre Mongoose sans whitelist.

**Points d'attention si un agent modifie le Dockerfile ou docker-compose :**
- Maintenir `expose` (pas `ports`) pour `mongo` et `app` en production.
- Ne pas réintroduire de valeur par défaut pour `MONGO_ROOT_PASSWORD`.
- Conserver le user non-root (`appuser`) dans le Dockerfile.

---

*Audit réalisé par GitHub Copilot — Agent Sécurité OWASP*

---

## Durcissement résiduel — 2026-06-04 (W10)

Suite à l'audit par rôle (`docs/audits/role-audit.md`), corrections appliquées :

- **Garde-fous de démarrage en production** (`mongo/server/index.js`) : le serveur
  refuse de démarrer si `NODE_ENV=production` et que l'une de ces conditions est
  vraie — `JWT_SECRET` ressemble à une valeur dev/par défaut, `E2E_MODE=true`
  (désactive le rate-limit de login), ou `MONGO_URI` contient `changeme`.
- **Header `Permissions-Policy`** ajouté (`camera=(), microphone=(), geolocation=(),
  browsing-topics=()`) — Helmet v7 ne le pose plus nativement.
- **Validation mot de passe** : création/réinitialisation déjà en `min(8)` (vérifié).
- **`.env.prod.example`** : template de production avec consignes (régénérer
  `JWT_SECRET`/`JWT_REFRESH_SECRET` via `openssl rand -hex 48`, `COOKIE_SECURE=true`,
  mot de passe Mongo fort, `E2E_MODE` vide).
- **Bug d'audit `login_failed`** corrigé (entrée d'audit invalide ⇒ jamais écrite) —
  cf. commit `fix(auth)`.

Restes recommandés (non bloquants) : rate-limit dédié sur `/api/users/:id`
(anti-énumération), resserrement de `styleSrc 'unsafe-inline'` dans la CSP, et
revue du périmètre `GET /api/users` ouvert aux managers.

## Durcissement résiduel — 2026-06-04 (suite, #8)

Traitement des restes ci-dessus :

- **Rate-limit anti-énumération** (`mongo/server/routes/users.js`) : limiteur dédié
  `userByIdLimiter` sur `GET /api/users/:id` — 30 req/min/IP (10000 en test/e2e).
- **Révocation effective du logout / refresh** (`routes/auth.js`,
  `services/authService.js`) : `POST /api/auth/logout` appelle désormais
  `revokeRefreshToken` qui retire le refresh token de l'allowlist serveur
  (`User.refreshTokens`). `refreshAccessToken` **vérifie l'allowlist** (un token
  révoqué ou déjà tourné est rejeté en 401 même si la signature JWT reste valide)
  et applique une **rotation** (pull ancien / push nouveau) à chaque refresh.
  L'access token reste valide jusqu'à son expiry (≤1h) — pas de blocklist d'access
  token introduite (surcoût d'état partagé non justifié, cf. recommandation #1).
- **CSP `styleSrc`** : `'unsafe-inline'` **conservé volontairement** (Tailwind v4 +
  styles inline runtime des libs) avec justification documentée dans `index.js`.
  Risque résiduel faible : pas de `scriptSrc 'unsafe-inline'`, `frameAncestors 'none'`,
  `X-Content-Type-Options: nosniff`.
- **Périmètre `GET /api/users`** : tranché (cf. `docs/audits/role-audit.md`) — manager
  scopé à son équipe par défaut, descendance complète sur flag `canViewSubtree`
  (hr/admin only).
