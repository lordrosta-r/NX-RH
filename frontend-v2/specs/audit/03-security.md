# Audit Sécurité — NX-RH

> Agent 3/9 — Périmètre : `NX-RH/mongo/server`
> Fichiers relus : `index.js`, `middleware/authGuard.js`, `middleware/errorHandler.js`,
> `routes/auth.js`, `routes/users.js`, `routes/users/import.js`, `routes/campaigns.js`,
> `routes/evaluations/{index,mutations,queries,bulk,helpers}.js`, `routes/org/index.js`,
> `routes/hr/flags.js`, `routes/admin.js`, `routes/admin/mailTemplates.js`,
> `routes/forms/importExport.js`, `models/User.js`, `config/constants.js`, `package.json`

---

## 🔴 P1 — Vulnérabilités critiques (corrigées)

> **Aucune P1 trouvée.** Le code est globalement très bien sécurisé sur les vecteurs classiques.

---

## 🟠 P2 — Risques importants

### P2-01 — RBAC gap : `PATCH /api/evaluations/:id` — manager peut modifier `answers` hors équipe

**Fichier** : `routes/evaluations/mutations.js` — `handleUpdate`

**Problème** : Le guard initial vérifiant l'appartenance de la ressource ne s'applique qu'au rôle `employee`. Pour `manager` et `director`, aucun contrôle n'existe sur le champ `answers`. N'importe quel manager authentifié, connaissant un `evaluationId`, peut écraser les réponses d'une évaluation **en dehors de son équipe**.

```js
// Guard initial — employee seulement
if (role === 'employee') {
  const isEvaluator = evaluation.evaluatorId.toString() === uid
  const isEvaluatee = evaluation.evaluateeId.toString() === uid
  if (!isEvaluator && !isEvaluatee) return 403
}

// Réponses — AUCUN check manager/director ici ← vulnérabilité
if (req.body.answers !== undefined) {
  evaluation.answers = req.body.answers  // accessible à tout manager
}
```

**Autres champs** : `score`, `reviewerComment`, `nextObjectives`, `objectiveRatings`, `status` sont eux correctement protégés par vérification `evaluatorId` ou `managerId`. Seul `answers` manque le contrôle.

**Exploit** : `PATCH /api/evaluations/<id_hors_equipe> { answers: [...] }` avec un token manager valide.

**Impact** : Corruption silencieuse des données d'évaluation d'autres équipes.

**Correction recommandée** (dans `handleUpdate`, après le guard employee) :
```js
if (['manager', 'director'].includes(role)) {
  const isEvaluator = evaluation.evaluatorId.toString() === uid
  if (!isEvaluator) {
    const evaluatee = await User.findById(evaluation.evaluateeId, 'managerId').lean()
    if (!evaluatee || evaluatee.managerId?.toString() !== uid) {
      return res.status(403).json({ error: 'Accès refusé' })
    }
  }
}
```

---

### P2-02 — CSV formula injection dans `GET /api/evaluations/export`

**Fichier** : `routes/evaluations/queries.js` — `handleExport`

**Problème** : La fonction `csvEscape` protège contre les virgules et guillemets, mais pas contre les **formules CSV** (valeurs commençant par `=`, `+`, `-`, `@`). Si un nom d'évalué ou de campagne commence par `=CMD(...)`, des lecteurs comme Excel ou LibreOffice Calc exécutent la formule à l'ouverture du fichier.

```js
function csvEscape(val) {
  const str = String(val)
  // ← Pas de protection contre les caractères de formule !, =, +, -, @
  if (str.includes(',') || str.includes('"') || ...) { ... }
  return str   // "=CMD('calc')" retourné tel quel
}
```

**Impact** : RCE sur le poste du RH qui ouvre le CSV exporté. Nécessite qu'un acteur malveillant ait pu injecter une valeur commençant par `=` dans firstName/lastName/campaignName.

**Correction recommandée** :
```js
function csvEscape(val) {
  const str = (val === null || val === undefined) ? '' : String(val)
  // Neutraliser les formules CSV (injection via Excel/LibreOffice)
  const sanitized = /^[=+\-@\t\r]/.test(str) ? "'" + str : str
  if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n') || sanitized.includes('\r')) {
    return '"' + sanitized.replace(/"/g, '""') + '"'
  }
  return sanitized
}
```

---

### P2-03 — `express-mongo-sanitize` absent — validation 100 % manuelle

**Fichier** : `package.json`

**Problème** : Le projet ne dépend pas de `express-mongo-sanitize` (ou équivalent). La protection contre l'injection d'opérateurs MongoDB (`$gt`, `$where`, `$regex`, etc.) repose entièrement sur des guards manuels (whitelist, `typeof x === 'string'`, `isValidObjectId`).

Ces guards sont corrects sur tous les chemins critiques inspectés, mais la **défense en profondeur** est absente. Une route oubliée ou une future modification peut ouvrir un vecteur.

**Cas concrets inspectés sains** :
- `routes/users.js` GET / : `typeof department === 'string'` ✅
- `routes/auth.js` login : regex email avant la requête DB ✅
- `routes/users/import.js` : `row.managerEmail.toLowerCase()` lancerait une `TypeError` sur un objet (capturée, 500) ✅ — mais non explicitement type-checké

**Correction recommandée** : Installer `express-mongo-sanitize` et l'ajouter avant les routes API.
```js
// index.js
const mongoSanitize = require('express-mongo-sanitize')
app.use(mongoSanitize())   // après express.json(), avant les routes
```

---

### P2-04 — `bodyHtml` des templates mail stocké sans sanitisation HTML

**Fichier** : `routes/admin/mailTemplates.js`

**Problème** : Les templates email stockent un champ `bodyHtml` libre fourni par admin/HR. Aucun assainissement (strip de `<script>`, `onerror=`, etc.) n'est effectué avant stockage. Un admin ou HR compromis peut injecter du JavaScript qui sera exécuté dans le client mail du destinataire si celui-ci rend le HTML.

```js
if (bodyHtml !== undefined) updates.bodyHtml = bodyHtml  // ← stocké brut
```

**Mitigation partielle** : Accès restreint à admin/HR. Risque ≠ 0 si un compte HR est compromis.

**Correction recommandée** : Utiliser `sanitize-html` (npm) avec un whitelist de balises autorisées avant persistance.

---

### P2-05 — `login_failed` AuditLog utilise `req.body.email` brut au lieu de `email` validé

**Fichier** : `routes/auth.js`

**Problème** : Après validation (regex, longueur), le code logue `req.body.email` au lieu de la variable locale `email`. Bien que fonctionnellement identique dans le flux normal (les deux sont identiques après destructuration), c'est une mauvaise pratique — notamment en cas de pollution de prototype ou de future modification du flux.

```js
AuditLog.create({ action: 'login_failed', details: { email: req.body.email, ip: req.ip } })
//                                                          ↑ devrait être `email`
```

**Impact** : Minime dans l'état actuel (protection effective par la validation antérieure), mais fragilité conceptuelle.

---

## 🟡 P3 — Hardening recommandé

### P3-01 — Pas de refresh token

Les JWT ont une durée de vie de 8h (mode normal) ou **30 jours** (`remember: true`). Il n'existe pas de mécanisme de rotation de token. Un token volé (XSS via cookie non-httpOnly → N/A ici car httpOnly, mais potentiellement via log ou réseau) reste valide toute sa durée.

**Recommandation** : Implémenter un refresh token httpOnly de courte durée (7j max) avec rotation à chaque usage, et réduire le token d'accès à 1h.

---

### P3-02 — `remember: true` génère un JWT de 30 jours

La durée 30j dans le JWT lui-même (non révocable côté serveur sauf révocation via `isActive = false`) est longue. La vérification `isActive` en DB à chaque requête atténue partiellement (désactivation immédiate possible).

**Recommandation** : Documenter la politique de révocation. Considérer une liste de révocation ou des tokens opaques pour le "remember me".

---

### P3-03 — Pas de CAPTCHA sur `/api/auth/login`

Le rate limiter (5 tentatives/15min par email, 20/15min par IP) est solide, mais sans CAPTCHA ou challenge, des attaques distribuées (botnet, IPs tournantes) restent possibles.

---

### P3-04 — `managerEmail` et `sectorName` dans l'import non type-checkés explicitement

**Fichier** : `routes/users/import.js`

```js
if (row.managerEmail && row.managerEmail.trim()) {  // TypeError si objet
  const mgr = await User.findOne({ email: row.managerEmail.toLowerCase().trim() }, ...)
```

La protection contre une valeur objet repose sur `TypeError` (méthode `.trim()` inexistante sur un objet). Cela provoque un 500 plutôt qu'un 400, et n'est pas explicite.

**Recommandation** :
```js
if (row.managerEmail && typeof row.managerEmail === 'string' && row.managerEmail.trim()) {
```

---

### P3-05 — `objectiveRatings` stocké sans validation des valeurs

**Fichier** : `routes/evaluations/mutations.js`

```js
if (typeof req.body.objectiveRatings !== 'object' || Array.isArray(req.body.objectiveRatings)) {
  return res.status(400).json(...)
}
evaluation.objectiveRatings = req.body.objectiveRatings  // valeurs non validées
```

Les clés et valeurs du dictionnaire ne sont pas validées. Une valeur `{$where: "..."}` serait stockée en DB. Peu exploitable en l'état (champ non utilisé dans des requêtes), mais principe de moindre confiance à appliquer.

---

### P3-06 — CORS : `allowedOrigins` inclut `!origin` (requêtes server-to-server)

**Fichier** : `index.js`

```js
if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
```

Les requêtes sans header `Origin` (curl, serveur → serveur, Postman) sont autorisées avec les headers CORS. Cela n'est pas un problème en soi (le CSRF est protégé par `sameSite: strict` sur le cookie), mais signifie que des outils de test côté serveur sans navegateur accèdent à l'API. Comportement standard, mais à documenter.

---

### P3-07 — Rate limiter global très permissif (2000 req/min)

Le `apiLimiter` à 2000 req/min est très élevé. Pour une application RH interne, 200–300 req/min par IP serait plus raisonnable en production.

---

## ✅ Points sécurisés

| Domaine | État |
|---|---|
| **JWT** : vérifié sur toutes les routes protégées | ✅ `authGuard` appliqué cohéremment dans `index.js` |
| **JWT secret** : variable d'environnement, longueur ≥ 32 chars vérifiée au démarrage | ✅ |
| **Expiration JWT** : `TokenExpiredError` capturée, cookie effacé | ✅ |
| **Compte désactivé** : vérification `isActive` en DB à chaque requête | ✅ |
| **`req.user`** : hydraté depuis payload JWT vérifié (id, email, role) | ✅ |
| **`passwordHash`** : `select: false` + explicitement supprimé dans toutes les réponses | ✅ |
| **`ldapDn`** : `select: false` + supprimé des réponses | ✅ |
| **Mots de passe** : bcrypt rounds ≥ 12, hook pre-save anti-double-hash | ✅ |
| **Login brute-force** : double rate-limiter (5/IP, 20/email) par 15min | ✅ |
| **CORS** : wildcard `*` explicitement interdit au démarrage, `credentials: true` seulement sur origins whitelistées | ✅ |
| **Helmet + CSP** : configuré avec directives strictes, HSTS en production | ✅ |
| **NoSQL injection login** : regex email + longueur avant requête DB | ✅ |
| **NoSQL injection `department`** : `typeof === 'string'` guard | ✅ |
| **NoSQL injection query params** : `isValidObjectId` + whitelist sur statuts/types | ✅ |
| **RBAC `GET /api/users`** : employee bloqué (403), manager scopé à ses directs | ✅ |
| **RBAC `GET /api/evaluations/:id`** : employee bloqué si pas owner, manager contrôlé par `getVisibleUserIds` | ✅ |
| **RBAC `PATCH /api/evaluations/:id` score** : vérification `managerId` de l'évalué | ✅ |
| **RBAC `/api/org`** : admin/HR uniquement | ✅ |
| **RBAC `PATCH /api/org/users/:id`** : rôle modifiable par admin/HR uniquement | ✅ |
| **RBAC `DELETE /api/org/sectors/:id`** : admin/HR, avec check utilisateurs liés | ✅ |
| **RBAC `/api/admin`** : admin uniquement | ✅ |
| **Import CSV** : limite 5 MB, validation email/rôle/département | ✅ |
| **Body limit** : `100kb` JSON, `100kb` URL-encoded | ✅ |
| **JWT non loggué** dans AuditLog | ✅ |
| **`trust proxy: 1`** pour rate-limiter correct derrière Nginx | ✅ |
| **Anti-cycle hiérarchique** : hook pre-save manager → détection de cycle depth 20 | ✅ |
| **ReDoS** : regex email avec longueur max avant test, `search` échappé avant `$regex` | ✅ |
| **Erreur 500** : masquée en production, détaillée en dev | ✅ |

---

## Résumé

| Priorité | Nombre | Notes |
|---|---|---|
| 🔴 **P1** | **0** | Aucune vulnérabilité critique |
| 🟠 **P2** | **5** | Dont RBAC `answers` (P2-01) et CSV injection (P2-02) à corriger en priorité |
| 🟡 **P3** | **7** | Hardening, pas d'exploitabilité directe |

> **Note aux agents aval** : Aucune correction auto-appliquée (pas de P1). Les P2-01 (RBAC answers) et P2-02 (CSV injection) nécessitent des modifications dans `routes/evaluations/mutations.js` et `routes/evaluations/queries.js`. Les corriger avant la mise en production.
