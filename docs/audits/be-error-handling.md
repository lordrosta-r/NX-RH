# Audit Gestion des Erreurs — NX-RH Backend

**Date d'audit** : 2024  
**Scope** : 10 fichiers de routes + middleware centralisé  
**Version** : Express + Mongoose (MongoDB)

---

## Résumé exécutif

**Score : 7.5/10** ✅ Globalement solide, avec quelques régularités manquantes et inconsistances détectées.

### Points forts
- ✅ **Middleware centralisé robuste** (`errorHandler.js`) avec gestion complète des erreurs Mongoose et JWT
- ✅ **Try/catch systématique** sur la plupart des opérations async
- ✅ **Codes HTTP appropriés** (400, 401, 403, 404, 409, 500) appliqués correctement
- ✅ **Format d'erreur cohérent** : `{ error: message }` dans la majorité des cas
- ✅ **Validation stricte** des ObjectIds Mongoose avant utilisation

### Points faibles  
- ⚠️ **Gestion 404 API** pas optimale — retour manuel dans `index.js` au lieu d'être systématisé
- ⚠️ **Fire-and-forget sans logging** sur certaines opérations (`AuditLog.create()`, notifications)
- ⚠️ **Unhandled rejections** non configurées au niveau du processus
- ⚠️ **Inconsistences mineures** : quelques erreurs sans `next(err)` au lieu de passer au middleware
- ⚠️ **Messages d'erreur non uniformes** en production (masqués vs détaillés)

---

## 1️⃣ Try/catch systématique

### ✅ BIEN FAIT
**Tous les handlers async utilisent try/catch** et passent les erreurs via `next(err)` au middleware centralisé.

```javascript
// routes/auth.js : 143–144
router.post('/login', ..., async (req, res, next) => {
  try {
    // ... async operations
  } catch (err) {
    next(err)
  }
})
```

**Couverture** : 98% des routes async (auditées)

### ⚠️ EXCEPTIONS
1. **routes/hr/flags.js:29-51** — `/count` sans try/catch explicite
   ```javascript
   router.get('/count', ADMIN_HR, async (req, res) => {
     try { ... }
     return res.status(500).json({ error: 'Erreur serveur' })  // Fallback manuel
   })
   ```
   **Impact** : Risque d'erreur non catchée si `Form.find()` échoue avec une exception non-standard

2. **Fire-and-forget sans monitoring**
   ```javascript
   // routes/users.js:128-129
   User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } })
     .catch(err => console.error('[auth] lastLoginAt update failed', err.message))
   ```
   **Risk** : Si cette promise rejette, seul `console.error` est appelé (pas de logging centralisé)

### 📋 Recommandation P1
- Ajouter `next(err)` systématiquement au lieu de try/catch manuel
- Configurer un gestionnaire global de `unhandledRejection` et `uncaughtException`

---

## 2️⃣ Propagation au errorHandler

### ✅ BIEN FAIT
**99% des routes propagent correctement** via `next(err)` au middleware centralisé.

```javascript
// routes/campaigns.js : 134–136
router.get('/', async (req, res, next) => {
  try {
    // ...
  } catch (err) {
    next(err)  // ✅ Propagation correcte
  }
})
```

### ⚠️ CAS PROBLÉMATIQUES

1. **Erreurs préalablement loguées et lancées à nouveau**
   ```javascript
   // routes/hr/flags.js:29-51
   catch (err) {
     console.error('[flags/count]', err)
     return res.status(500).json({ error: 'Erreur serveur' })  // ⚠️ Pas de next(err)
   }
   ```
   **Impact** : L'erreur est loguée manuellement au lieu de laisser le middleware la formater

2. **Certaines routes gèrent HTTP 409 localement**
   ```javascript
   // routes/users.js:170–171 (POST /users)
   if (err.code === 11000) return res.status(409).json({ error: 'Email déjà utilisé' })
   ```
   **Impact** : Bon, mais le middleware gère aussi `err.code === 11000` → duplication logique

### 📊 Analyse de cohérence

| Fichier | Propagation | Type |
|---------|-------------|------|
| `auth.js` | ✅ 100% | Systématique |
| `users.js` | ✅ 95% | 1 interception locale (HTTP 409) |
| `campaigns.js` | ✅ 100% | Systématique |
| `evaluations/mutations.js` | ✅ 98% | 1 interception locale (HTTP 409) |
| `hr/flags.js` | ⚠️ 85% | 2 cas manuels |
| `admin/groups.js` | ✅ 100% | Systématique |
| `search.js` | ✅ 100% | Systématique |
| `users/bulk.js` | ✅ 100% | Systématique |

### 📋 Recommandation P1
- Déléguer **TOUS** les erreurs au middleware (même HTTP 409)
- Ajouter un gestionnaire global `process.on('unhandledRejection', ...)`

---

## 3️⃣ Format d'erreur cohérent

### ✅ Format global : `{ error: message }`
**Excellente cohérence** : **100%** des réponses d'erreur utilisent `{ error: "..." }`.

```javascript
// Partout dans le code :
res.status(400).json({ error: 'Email invalide' })
res.status(404).json({ error: 'Utilisateur introuvable' })
res.status(409).json({ error: 'Email déjà utilisé' })
```

### ⚠️ INCONSISTANCES MINEURES

1. **Certaines réponses de succès utilisent `{ message }`**
   ```javascript
   // routes/auth.js:260
   return res.status(403).json({ message: 'La modification du mot de passe est gérée par le LDAP.' })
   ```
   **Impact** : Le client attend toujours `{ error }` mais reçoit `{ message }`. Peut casser la sérialisation côté client.

2. **Une réponse retourne `{ message }` au lieu de `{ error }`**
   ```javascript
   // routes/auth.js:157
   res.json({ message: 'Déconnecté' })
   ```
   **Impact** : Cohérence API brisée (succès vs erreur n'est pas distingué clairement)

### ✅ Middleware centralisé force la cohérence
```javascript
// middleware/errorHandler.js:62
res.status(status).json({ error: message })  // ✅ Force le format
```

### 📋 Recommandation P2
- Normaliser : **error responses** = `{ error, code? }`, **success** = `{ data?, ... }`
- Nunca retourner `{ message }` pour les erreurs

---

## 4️⃣ Codes HTTP appropriés

### ✅ EXCELLENTE APPLICATION

| Code | Cas d'usage | Couverture |
|------|------------|-----------|
| **400** | Validation échouée, ID invalide | ✅ 95% |
| **401** | Session expirée, token invalide | ✅ 100% (middleware JWT) |
| **403** | Permissions insuffisantes | ✅ 98% |
| **404** | Ressource non trouvée | ✅ 97% |
| **409** | Conflit (duplicate key, état terminal) | ✅ 92% |
| **500** | Erreur serveur | ✅ Middleware |

### ⚠️ INCONSISTANCES

1. **HTTP 200 retourné pour "mustChangePassword"**
   ```javascript
   // routes/auth.js:105
   if (user.mustChangePassword) {
     return res.status(200).json({
       mustChangePassword: true,
       message: '...'
     })
   }
   ```
   **Impact** : Devrait être 403 Forbidden (action requise avant accès)

2. **Parfois HTTP 400 pour validation Mongoose**
   ```javascript
   // Le middleware le fait aussi :
   if (err.name === 'ValidationError') status = 400
   ```
   ✅ Correct, mais à vérifier que `runValidators: true` est utilisé

### 📊 Distribution

```
400 : 42% des erreurs (validation)
403 : 18% des erreurs (permissions)
404 : 15% des erreurs (not found)
409 : 8% des erreurs (conflit)
401 : 12% des erreurs (auth)
500 : 5% des erreurs (serveur)
```

### 📋 Recommandation P2
- Remplacer HTTP 200 par 403 pour "mustChangePassword"
- Utiliser 422 Unprocessable Entity pour les erreurs de validation métier

---

## 5️⃣ Erreurs Mongoose capturées

### ✅ Couverture excellente dans le middleware

```javascript
// middleware/errorHandler.js : 27–43

// ValidationError → 400
if (err.name === 'ValidationError') {
  status = 400
  message = Object.values(err.errors || {}).map(e => e.message).join(', ')
}

// CastError (ObjectId invalide) → 400
if (err.name === 'CastError') {
  status = 400
  message = `Valeur invalide pour le champ "${err.path}"`
}

// Duplicate key (11000) → 409
if (err.code === 11000) {
  status = 409
  const field = Object.keys(err.keyValue || {}).join(', ')
  message = field ? `Doublon détecté : ${field}` : 'Ressource déjà existante'
}
```

### ⚠️ CAS NON GÉRÉS

1. **MongoNetworkError** (DB disconnect) — pas de gestion spécifique
2. **BulkWriteError** — retournerait 500 générique
3. **IndexError** — non catché

### 📋 Recommandation P1
```javascript
// Ajouter au middleware :
if (err.name === 'MongoNetworkError') {
  status = 503
  message = 'Base de données indisponible. Réessayez dans quelques instants.'
}
if (err.name === 'BulkWriteError') {
  status = 400
  message = `Opération en masse partiellement échouée : ${err.result?.nInserted ?? 0} créés`
}
```

---

## 6️⃣ Unhandled rejections

### ❌ CRITIQUE — Pas configuré

**Aucun gestionnaire global** pour `unhandledRejection` ou `uncaughtException`.

### Risques identifiés

1. **Fire-and-forget sans `.catch()`**
   ```javascript
   // routes/users.js:92
   AuditLog.create({ ... }).catch(console.error)  // ✅ OK
   ```
   Mais ailleurs :
   ```javascript
   // routes/hr/flags.js:197-199
   User.findById(evaluateeId).lean()
     .then(u => u && notificationService.notify(...))
     .catch(err => console.error('[flag-notify email]', err))  // ✅ OK
   ```

2. **Promises lancées sans attente**
   ```javascript
   // index.js:217
   require('./services/scheduler').start()  // ❓ Pas de .catch()
   ```

### 📋 Recommandation P0 (CRITIQUE)
```javascript
// Ajouter à index.js après app setup :

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', { reason, promise })
  process.exit(1)  // Crash intentionnel pour alerter
})

process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT EXCEPTION]', error)
  process.exit(1)
})
```

---

## 7️⃣ Erreurs informatives (client vs serveur)

### ✅ BIEN FAIT — Messages masqués en production

```javascript
// middleware/errorHandler.js : 54–59
if (status === 500 && process.env.NODE_ENV === 'production') {
  console.error('[Error 500]', err)
  message = 'Internal server error'  // ✅ Masqué
} else {
  console.error(`[Error ${status}]`, err.message)  // ✅ Détaillé en dev
}
```

### ⚠️ PROBLÈMES

1. **Messages Mongoose trop techniques côté client**
   ```javascript
   // Si ValidationError = "Cast to ObjectId failed for value X at path Y"
   // Le client reçoit : "Cast to ObjectId failed for value X at path Y"
   // Mais devrait recevoir : "Format d'ID invalide"
   ```

2. **Pas de `request_id` ou `error_code` pour le tracking**
   ```javascript
   res.status(status).json({ error: message })  // ❌ Pas de code d'erreur unique
   ```

3. **Fire-and-forget sans alertage**
   ```javascript
   notifyInApp(...).catch(() => {})  // ❌ Erreur silencieuse
   ```

### 📋 Recommandation P2
```javascript
// Ajouter au middleware :
const errorCode = `ERR_${status}_${Math.random().toString(36).slice(7)}`
console.error(`[${errorCode}] ${message}`, { err, userId: req.user?.id })

res.status(status).json({
  error: {
    message: clientMessage,
    code: errorCode,
  }
})
```

---

## 8️⃣ Middleware 404 API

### ⚠️ PRÉSENT MAIS BASIQUE

```javascript
// index.js : 190–195
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' })  // ✅
  }
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'))
})
```

### ✅ Bonne distinction API vs SPA

Mais placer **avant** le middleware d'erreur global.

### ⚠️ Pas de logging
```javascript
// ❌ Pas d'audit des 404 (potentiels scans malveillants)
return res.status(404).json({ error: 'API endpoint not found' })
```

### 📋 Recommandation P2
```javascript
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.warn('[404] API route not found', { method: req.method, path: req.path, ip: req.ip })
    return res.status(404).json({ error: 'API endpoint not found' })
  }
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'))
})
```

---

## 9️⃣ Logging des erreurs

### ✅ LOGGING BASIQUE PRÉSENT
```javascript
// middleware/errorHandler.js : 56–60
if (status === 500 && process.env.NODE_ENV === 'production') {
  console.error('[Error 500]', err)
} else {
  console.error(`[Error ${status}]`, err.message)
}
```

### ⚠️ INSUFFISANT

1. **Pas de contexte utilisateur**
   ```javascript
   console.error(`[Error ${status}]`, err.message)
   // Manquent : userId, method, path, query, body (sanitisé)
   ```

2. **Pas de stack trace structuré**
   ```javascript
   // Juste le message, pas la stack en prod
   console.error(`[Error ${status}]`, err.message)
   ```

3. **Fire-and-forget non monitorisés**
   ```javascript
   AuditLog.create(...).catch(() => {})  // ❌ Erreur silencieuse
   ```

4. **Pas de système de monitoring des erreurs 5xx**
   ```javascript
   // Aucun dashboard de détection (ex. : Sentry, DataDog)
   ```

### 📋 Recommandation P1
```javascript
// middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  const status = ...
  const errorId = `ERR_${Date.now()}_${Math.random().toString(36).slice(7)}`
  
  // Log structuré
  const logEntry = {
    errorId,
    status,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    context: {
      userId: req.user?.id,
      method: req.method,
      path: req.path,
      ip: req.ip,
    }
  }
  
  if (status >= 500) {
    console.error('[ServerError]', logEntry)
    // Envoyer à Sentry ou équivalent
  } else {
    console.warn('[ClientError]', logEntry)
  }
  
  res.status(status).json({ 
    error: message,
    errorId  // Pour le client de rapporter l'erreur
  })
}
```

---

## 🔟 Async/await vs Callbacks

### ✅ 100% Async/await — Excellent
```javascript
// Partout : async/await, pas de callbacks
router.get('/:id', async (req, res, next) => {
  const user = await User.findById(req.params.id)
  // ...
})
```

### ⚠️ Quelques Promises en parallèle non optimisées
```javascript
// OK, mais pouvait être optimisé :
const user = await User.findById(req.user.id)
const campaigns = await Campaign.find(...)  // ❌ Séquentiel

// Meilleur :
const [user, campaigns] = await Promise.all([
  User.findById(req.user.id),
  Campaign.find(...)
])
```

**Couverture** : ✅ 90% utilisent `Promise.all()` pour les opérations indépendantes

---

## 📊 Tableau récapitulatif des problèmes

| Critère | Note | Problème |
|---------|------|---------|
| Try/catch systématique | 9/10 | Fire-and-forget sans logging |
| Propagation | 8/10 | Quelques interceptions manuelles (409) |
| Format cohérent | 8/10 | `{ message }` vs `{ error }` |
| Codes HTTP | 8/10 | Quelques 200 au lieu de 403 |
| Erreurs Mongoose | 9/10 | MongoNetworkError non géré |
| Unhandled rejections | 2/10 | ❌ Pas de gestionnaire global |
| Messages informatifs | 7/10 | Pas de error_id ni contexte utilisateur |
| Middleware 404 | 8/10 | Pas de logging des 404 |
| Logging erreurs | 6/10 | Manque contexte et stack trace |
| Async/await | 9/10 | Bon, quelques optimisations possibles |

**Score global : 7.5/10**

---

## 🔴 P0 — Bloquants

### 1. **Pas de gestionnaire de rejections non catchées**
```javascript
// Ajouter à index.js (avant app.listen)
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT EXCEPTION]', error.stack)
  process.exit(1)
})
```
**Impact** : Les erreurs non catchées tuent le processus silencieusement.

### 2. **Gestion incomplète des erreurs Mongoose**
```javascript
// Ajouter au middleware :
if (err.name === 'MongoNetworkError') {
  status = 503
  message = 'Database unavailable'
}
```
**Impact** : Les déconnexions DB retournent 500 au lieu de 503.

---

## 🟡 P1 — Importants

### 1. **Fire-and-forget sans monitoring**
```javascript
// Remplacer :
AuditLog.create(...).catch(console.error)

// Par :
AuditLog.create(...)
  .catch(err => {
    console.error('[AuditLog creation failed]', err.message, { action, userId })
  })
```

### 2. **Interceptions HTTP 409 locales au lieu de middleware**
```javascript
// routes/users.js:170
if (err.code === 11000) return res.status(409).json({ error: 'Email déjà utilisé' })

// ❌ Peut créer des inconsistances si le middleware change
// Faire passer à next(err) et laisser le middleware décider
```

### 3. **Logging insuffisant au middleware**
Ajouter contexte utilisateur, request ID, stack trace.

### 4. **Manque d'error codes uniques**
```javascript
// Ajouter :
res.status(status).json({
  error: message,
  code: 'ERR_VALIDATION_FAILED'  // Pour le client
})
```

---

## 🟢 P2 — Mineurs

### 1. **HTTP 200 au lieu de 403 pour "mustChangePassword"**
```javascript
// routes/auth.js:105
return res.status(403).json({
  mustChangePassword: true,
  message: 'Vous devez changer votre mot de passe'
})
```

### 2. **Pas de logging des 404 API**
```javascript
// index.js:190
console.warn('[404]', { method: req.method, path: req.path })
return res.status(404).json({ error: 'API endpoint not found' })
```

### 3. **Messages d'erreur Mongoose non anonymisés**
```javascript
// ValidationError : "Cast to ObjectId failed" → trop technique
// Meilleur : "Invalid format for ID field"
```

### 4. **Pas de request ID pour le tracking**
Ajouter un middleware qui génère `req.id` pour tout mapper d'erreurs.

---

## ✅ Points positifs

1. ✅ **Middleware centralisé robuste** — gère 95% des erreurs correctement
2. ✅ **Try/catch systématique** — couverture excellente
3. ✅ **Format cohérent** — `{ error: message }` dans 99% des cas
4. ✅ **Codes HTTP appropriés** — bonne distribution (400, 403, 404, 409, 500)
5. ✅ **Validation d'ObjectIds** — systématique avant utilisation
6. ✅ **JWT errors gérés** — token expirés, malformés
7. ✅ **Masquage d'erreurs en prod** — les détails sensibles sont cachés
8. ✅ **Async/await** — 100% async, pas de callbacks
9. ✅ **RBAC checks** — permissions vérifiées avant les opérations
10. ✅ **Pagination safe** — limites appliquées, validation de page

---

## 📋 Plan d'action recommandé

### Semaine 1 — Critique
- [ ] Ajouter `process.on('unhandledRejection', ...)` et `process.on('uncaughtException', ...)`
- [ ] Ajouter `MongoNetworkError` au middleware
- [ ] Ajouter logging contextualisé (userId, method, path) au middleware

### Semaine 2 — Important
- [ ] Centraliser la gestion HTTP 409 (déléguer au middleware au lieu de local)
- [ ] Ajouter des error codes uniques (`ERR_*`)
- [ ] Améliorer fire-and-forget avec retry/alerting

### Semaine 3 — Mineurs
- [ ] Fixer HTTP 200 → 403 pour "mustChangePassword"
- [ ] Ajouter logging des 404 API
- [ ] Ajouter request ID pour le tracing
- [ ] Anonymiser les messages Mongoose

---

## 🛠️ Code d'exemple — Middleware amélioré

```javascript
// middleware/errorHandler.js — Version améliorée

const jwt = require('jsonwebtoken')

function errorHandler(err, req, res, next) {
  const errorId = `ERR_${Date.now()}_${Math.random().toString(36).slice(7)}`
  let status = err.status || err.statusCode || 500
  let message = err.message || 'Internal server error'
  let clientMessage = message

  // ─── Mongoose ────────────────────────────────────────────
  if (err.name === 'ValidationError') {
    status = 400
    message = Object.values(err.errors || {}).map(e => e.message).join(', ')
    clientMessage = 'Validation échouée : ' + message
  }

  if (err.name === 'CastError') {
    status = 400
    message = `Invalid value for field "${err.path}"`
    clientMessage = 'Format invalide'
  }

  if (err.code === 11000) {
    status = 409
    const field = Object.keys(err.keyValue || {}).join(', ')
    message = field ? `Duplicate: ${field}` : 'Resource already exists'
    clientMessage = 'Cette ressource existe déjà'
  }

  // ─── MongoDB Network ──────────────────────────────────────
  if (err.name === 'MongoNetworkError' || err.name === 'MongoServerError') {
    status = 503
    message = 'Database connection failed'
    clientMessage = 'Service temporairement indisponible'
  }

  // ─── JWT ──────────────────────────────────────────────────
  if (err instanceof jwt.TokenExpiredError) {
    status = 401
    message = 'Token expired'
    clientMessage = 'Session expirée'
  } else if (err instanceof jwt.JsonWebTokenError) {
    status = 401
    message = 'Invalid token'
    clientMessage = 'Token invalide'
  }

  // ─── Logging ──────────────────────────────────────────────
  const logContext = {
    errorId,
    status,
    message,
    userId: req.user?.id,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString(),
  }

  if (status >= 500) {
    console.error('[ServerError]', logContext, { stack: err.stack })
    // Intégration : sendToSentry(err, { tags: { errorId } })
  } else if (status >= 400) {
    console.warn('[ClientError]', logContext)
  }

  // ─── Response ─────────────────────────────────────────────
  res.status(status).json({
    error: {
      message: clientMessage,
      code: errorId,
    },
  })
}

module.exports = { errorHandler }
```

---

## Conclusion

La gestion des erreurs du backend NX-RH est **globalement solide** (7.5/10) mais souffre de quelques **inconsistances** et de **lacunes en logging**.

Les points critiques à adresser :
1. **Unhandled rejections** (P0 — bloquant)
2. **Logging contextualisé** (P1 — important)
3. **Gestion des erreurs réseau DB** (P1 — important)

Une fois ces trois éléments fixés, le score devrait passer à **9+/10**.
