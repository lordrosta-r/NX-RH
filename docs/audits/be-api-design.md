# Audit Design API REST — NX-RH Backend

**Date :** 2024-05-24  
**Système audité :** NanoXplore RH (Node.js/Express/MongoDB)  
**Périmètre :** Routes API (`/api/auth`, `/api/users`, `/api/campaigns`, `/api/forms`, `/api/evaluations`, etc.)

---

## Résumé exécutif

**Score : 7.0/10**

NX-RH présente une API REST **cohérente et bien structurée** dans l'ensemble, avec une bonne maîtrise des conventions REST et de la sécurité. Cependant, elle souffre de **plusieurs incohérences** qui impactent l'expérience développeur et la maintenabilité à long terme.

### Points forts
- ✅ Versioning implicite (single version, pas de `/v1/`)
- ✅ Codes HTTP largement appropriés (201 vs 200, 401 vs 403, 404, 409)
- ✅ Sécurité renforcée (authGuard, rate limiting, sanitization MongoDB)
- ✅ Nommage des ressources au pluriel + conventions kebab-case
- ✅ Pagination implémentée sur les listes
- ✅ Gestion d'erreurs centralisée (errorHandler middleware)
- ✅ Whitelist stricte sur les mises à jour (ALLOWED fields)

### Points faibles majeurs
- 🔴 **Incohérence des enveloppes de réponse** (direct object vs `{ data: [], total, page }`)
- 🔴 **Absence de POST 201 systématique** (plusieurs POST retournent 200)
- 🔴 **Format d'erreur dual** (`{ error }` vs `{ message }`)
- 🔴 **Idempotence mal appliquée** (PUT et PATCH non différenciés)
- 🔴 **Routes non-RESTful mixées** (verbes dans les URLs : `/clone`, `/freeze`, `/expire`, `/bulk`)
- 🔴 **Pagination optionnelle et incohérente** (certaines listes sans pagination)

---

## P0 — Bloquants

### 1️⃣ Incohérence des enveloppes de réponse (CRITIQUE)

**Impact :** Clients ne savent pas quelle structure attendre selon l'endpoint.

#### Problèmes identifiés

**Pattern 1 : Enveloppe avec pagination (liste)**
```javascript
// ✅ users.js GET /
res.json({ data: users, total, page, limit })

// ✅ campaigns.js GET /
res.json({ data: campaigns, total, page, limit })

// ✅ forms.js GET /
res.json({ data: forms, total, page, limit })
```

**Pattern 2 : Objet direct (détail)**
```javascript
// ❌ users.js GET /:id
res.json(user)

// ❌ campaigns.js GET /:id
res.json(campaign)

// ❌ forms.js GET /:id
res.json(form)
```

**Pattern 3 : Résultats sans enveloppe (recherche)**
```javascript
// ❌ search.js GET /search
res.json({ users, campaigns, forms })  // pas cohérent avec data: []
```

**Pattern 4 : Création (créé, pas d'enveloppe)**
```javascript
// ❌ users.js POST /
res.status(201).json({ ...result, tempPassword })

// ✅ admin/groups.js POST /
res.status(201).json(populated)
```

#### Recommandation

Normaliser sur un pattern unique :

```javascript
// Variante A : Toujours enveloppe (recommandée)
GET /api/users → { data: [...], page, limit, total }
GET /api/users/:id → { data: {...} }
POST /api/users → { data: {...} }
GET /api/search → { data: { users: [...], campaigns: [...], forms: [...] } }

// Variante B : Direct sans enveloppe (Express/Rails style)
GET /api/users → [...]  // Array
GET /api/users/:id → {...}  // Object
POST /api/users → {...}
```

**Action immédiate :** Choisir **Variante A** (meilleure à l'échelle) et migrer progressivement.

---

### 2️⃣ POST ne retourne pas 201 systématiquement

**Impact :** Clients ne distinguent pas création vs update vs lecture.

#### Cas problématiques

```javascript
// ❌ auth.js POST /login — retourne 200 + cookie
return res.status(200).json({ user: {...} })
// Devrait être 201 pour "session créée" ou 200 pour "authenticated"

// ✅ users.js POST / — retourne 201
res.status(201).json({ ...result, tempPassword })

// ❌ campaigns.js POST / — pas de res.status()
res.json(createdCampaign)  // implicite 200

// ❌ auth.js PATCH /preferences — retourne 200
res.json(fresh)

// ✅ admin/groups.js POST / — retourne 201
res.status(201).json(populated)
```

#### Règle REST

- **POST** créant une ressource → **201 Created**
- **POST** d'action non-idempotente → **200 OK** ou **202 Accepted**
- **PATCH/PUT** modifiant une ressource → **200 OK**

#### Recommandation

```javascript
// POST création
res.status(201).json(resource)

// POST action métier (non-idempotente)
res.status(200).json({ success: true, data: {...} })

// PATCH/PUT
res.status(200).json(resource)

// Pas de body
res.status(204).send()
```

---

### 3️⃣ Dualité du format d'erreur

**Impact :** Clients ne savent pas chercher `.error` ou `.message`.

#### Cas problématiques

```javascript
// Pattern 1 : { error: string }
res.status(400).json({ error: 'Email invalide' })
res.status(401).json({ error: 'Identifiants invalides' })

// Pattern 2 : { message: string }
res.status(403).json({ message: 'La réinitialisation du mot de passe est gérée par le LDAP.' })
res.status(200).json({ mustChangePassword: true, message: '...' })

// Pattern 3 : Mixte sans clé (auth/logout)
res.json({ message: 'Déconnecté' })

// Pattern 4 : errorHandler retourne { error }
res.status(status).json({ error: message })
```

#### Recommandation

**Standardiser sur `{ error }` partout** (conforme errorHandler) :

```javascript
res.status(400).json({ error: 'Email invalide' })
res.status(403).json({ error: 'La réinitialisation du mot de passe est gérée par le LDAP.' })
res.status(200).json({ message: 'Déconnecté' })  // ← OK pour les succès
res.status(204).send()  // Pas de body
```

---

### 4️⃣ POST et PATCH sémantiquement confus

**Impact :** Non-idempotence mal gérée, risque de doublons.

#### Cas problématiques

```javascript
// ✅ Bien différencié
POST   /api/campaigns/:id/clone      → crée un doublon
PATCH  /api/campaigns/:id            → modifie

// ❌ Mixte
PATCH /api/campaigns/:id/forms/:formId  → lie (POST aurait été plus clair)
DELETE /api/campaigns/:id/forms/:formId → délie (DELETE est bon)

PATCH /api/forms/:id/freeze         → action métier (POST ? /freeze ?)
PATCH /api/forms/:id/unfreeze       → action métier (POST ? /unfreeze ?)

POST /api/campaigns/:id/forms       → lie un formulaire (action métier)
POST /api/evaluations/:id/expire    → ferme une évaluation (action métier)
PATCH /api/evaluations/:id/reassign → réassigne (action métier, mais PATCH)
```

#### Distinction sémantique

- **PATCH** = modification d'attributs (partielle) → idempotente
  ```javascript
  PATCH /api/users/:id { firstName: "Jean" }
  ```
- **POST** (sub-ressource) = création d'association ou action non-idempotente
  ```javascript
  POST /api/campaigns/:id/forms { formId: "X" }  // lie
  POST /api/evaluations/:id/expire { ... }      // ferme
  ```

#### Recommandation

```javascript
// Préférer POST pour les actions métier
POST /api/campaigns/:id/clone                   // ← idempotent si basé sur un nonce
POST /api/forms/:id/freeze                      // ← rend la forme immuable
POST /api/forms/:id/unfreeze                    // ← réactive la forme
POST /api/campaigns/:id/forms                   // ← lie un formulaire (sub-création)

// Garder PATCH pour les mises à jour d'attributs
PATCH /api/campaigns/:id { name: "..." }        // ← modification partielle
```

---

### 5️⃣ Routes verbes dans l'URL (anti-pattern)

**Impact :** Mélange ressources et actions, difficile à scaler.

#### Cas problématiques

```javascript
GET  /api/campaigns/:id/analytics    // ✅ OK (sous-ressource de lecture)
POST /api/campaigns/:id/clone        // ⚠️  verbe (devrait être idempotent)
POST /api/campaigns/:id/forms        // ✅ OK (sub-création, sous-ressource)
DELETE /api/campaigns/:id/forms/:formId  // ✅ OK (suppression association)

POST /api/forms/:id/freeze           // ⚠️  verbe
POST /api/forms/:id/unfreeze         // ⚠️  verbe
POST /api/forms/:id/clone            // ⚠️  verbe

PATCH /api/evaluations/:id/reassign  // ⚠️  verbe (PATCH est approprié, mais le verbe pose pb)
POST /api/evaluations/:id/expire     // ⚠️  verbe

PATCH /api/users/:id/offboard        // ⚠️  verbe → mieux : POST /api/users/:id/offboarding
PATCH /api/users/:id/avatar          // ⚠️  verbe → mieux : PATCH /api/users/:id { avatar: ... }

POST /api/evaluations/bulk           // ⚠️  pseudo-ressource
PATCH /api/evaluations/bulk          // ⚠️  pseudo-ressource (action)
```

#### Recommandation

```javascript
// Approche 1 : RESTful strict (ressources uniquement)
PATCH /api/users/:id { avatar: "..." }                // au lieu de PATCH /:id/avatar
PATCH /api/evaluations/:id { status: "reassigned" }   // au lieu de PATCH /:id/reassign

// Approche 2 : Sous-ressources (acceptable, déjà utilisé)
POST /api/campaigns/:id/forms                         // lie
DELETE /api/campaigns/:id/forms/:formId               // délie

// Approche 3 : Conserver verbes pour actions métier complexes
POST /api/forms/:id/freeze                            // acceptable car non-modélisable en PATCH
POST /api/evaluations/:id/send-reminder               // clair : action métier
POST /api/users/:id/send-onboarding-email             // clair : action métier
```

---

## P1 — Importants

### 6️⃣ Pagination optionnelle et incohérente

**Impact :** Clients ne savent pas quand paginer.

#### Cas non-pagifiés

```javascript
// GET /api/admin/groups — pas de pagination
const groups = await UserGroup.find()
res.json(groups)  // ❌ Peut exposer 10k groupes

// GET /api/search — pas de pagination
User.find(...).limit(5).select(...)  // ✅ Hardcoded limit=5, OK
```

#### Cas pagifiés

```javascript
// GET /api/users — pagination obligatoire
const page = Math.max(1, parseInt(req.query.page) || 1)
const limit = Math.min(100, parseInt(req.query.limit) || 50)

// GET /api/campaigns — pagination obligatoire
// GET /api/forms — pagination obligatoire
// GET /api/hr/flags — pagination obligatoire
```

#### Recommandation

**Ajouter pagination partout sauf pour les listes garanties petites** :

```javascript
// Limiter les résultats même sans pagination explicite
router.get('/', async (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = Math.min(100, parseInt(req.query.limit) || 50)
  
  const items = await Model.find({})
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()
  
  const total = await Model.countDocuments({})
  
  res.json({ data: items, page, limit, total })
})
```

---

### 7️⃣ Absence de documentation API

**Impact :** Clients dépendent du code source pour comprendre l'API.

#### État actuel

```javascript
// Routes documentées dans les commentaires du fichier
// routes/auth.js : excellent
// routes/campaigns.js : excellent
// routes/admin.js : excellent
// routes/search.js : minimaliste

// Mais : aucune doc externe (Swagger/OpenAPI, Postman, etc.)
```

#### Recommandation

Générer une documentation OpenAPI 3.0 (Swagger) avec l'une de ces approches :

```javascript
// Approche 1 : JSDoc + swagger-jsdoc
/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: List users
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 */
router.get('/', ...)

// Approche 2 : Swagger UI sur /api/docs
import swaggerUi from 'swagger-ui-express'
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
```

---

### 8️⃣ Codes HTTP mineurs incohérents

#### Cas problématiques

```javascript
// ✅ Bien appliqué
res.status(400).json(...)  // validation error
res.status(401).json(...)  // auth failure
res.status(403).json(...)  // permission denied
res.status(404).json(...)  // not found
res.status(409).json(...)  // duplicate

// ⚠️  Nuances
res.status(422).json(...) // jamais utilisé (cf. 400 vs 422)
res.status(200).json({ mustChangePassword: true })  // devrait être 403 ?
res.status(204)  // jamais utilisé (DELETE, POST sans body)
```

#### Recommandation

Respecter la sémantique HTTP :

| Code | Cas |
|------|-----|
| **200** | Succès, avec body (GET, PATCH, PUT) |
| **201** | Ressource créée (POST) |
| **202** | Accepté, traitement asynchrone |
| **204** | Succès, sans body (DELETE, POST d'action) |
| **400** | Validation error (données invalides) |
| **401** | Non authentifié |
| **403** | Authentifié mais non autorisé |
| **404** | Non trouvé |
| **409** | Conflit (duplicate key, état invalide) |
| **422** | Validation sémantique (optionnel, rare) |
| **500** | Erreur serveur |

---

### 9️⃣ Nommage de champs incohérent

#### Incohérences identifiées

```javascript
// UUID vs MongoID
_id (MongoDB standard) ✅
id (alias client) — utilisé par auth/me

// Timestamps
createdAt / updatedAt (standard) ✅
lastLoginAt (bon)
startDate, endDate (bon)

// Pagination
page, limit, total (cohérent) ✅

// Booléens
isActive (bon)
isAnonymous (bon)
mustChangePassword (bon)
frozenAt (date, pas booléen — OK)

// Statuts
status (bon)
offboardingStatus (bon, mais redundant avec status)
```

#### Recommandation

Ajouter un document de style (naming.md) :

```markdown
# Naming Conventions

## IDs
- MongoDB _id: `_id: ObjectId`
- Alias client: `id: String` (pas systématique, à éviter)

## Timestamps
- `createdAt: Date` (immutable)
- `updatedAt: Date` (modified_at)
- `deletedAt: Date` (soft delete)
- `expiredAt: Date`

## Booléens
- Préfixe: `is*`, `can*`, `has*`, `allow*`
- Exemple: `isActive`, `isAnonymous`, `allowSelfEvaluation`

## Énumérations
- Utilisez SCREAMING_SNAKE_CASE en constantes, camelCase en API
- Exemple: `const STATUSES = ['draft', 'active', 'closed']`
```

---

## P2 — Mineurs

### 🔟 Absence de Link headers (HATEOAS)

**Impact mineure :** Clients doivent construire les URLs manuellement.

```javascript
// ❌ Pas de Link header
GET /api/users?page=2 → { data: [...], page: 2, limit: 50, total: 500 }

// ✅ Meilleur avec Link header
Link: <https://api.example.com/api/users?page=3>; rel="next",
      <https://api.example.com/api/users?page=1>; rel="prev",
      <https://api.example.com/api/users?page=10>; rel="last"
```

Peu critique pour une app monolithique, à ajouter au backlog.

---

### 1️⃣1️⃣ Absence de version API

```javascript
// ❌ Pas de versionning explicite
GET /api/users

// ✅ Pourrait être
GET /api/v1/users  (Semver versionning)
Accept: application/vnd.nanorhex.v1+json  (Content Negotiation)
```

**Situation actuelle :** Acceptable (single version, équipe petite), à revisiter si mutations breaking.

---

### 1️⃣2️⃣ Validations partielles côté client

```javascript
// ❌ Validation côté serveur insuffisante sur certains champs
email.length > 254 (bien)
password.length > 128 (bien)
regex validation (bien)

// Mais : pas de JSON Schema central, validators mixtes
if (!firstName || !lastName)  // ❌ trop basique
if (!title || !formType)      // ❌ trop basique
```

---

## Points positifs ✅

### 1. Conventions REST bien appliquées

```javascript
✅ Pluriel des ressources : /api/users, /api/campaigns, /api/forms
✅ Kebab-case pour les sous-routes : /api/hr/flags, /api/admin/groups
✅ GET sans effet de bord (safe)
✅ POST idempotent sur dupliquats (upsert pattern)
✅ DELETE supprime réellement (soft delete en attente du flag offboardingStatus)
```

---

### 2. Sécurité renforcée

```javascript
✅ authGuard middleware
✅ Rate limiting sur /login (email + IP)
✅ Rate limiting générale (2000 req/min par défaut)
✅ sanitization MongoDB (mongoSanitize)
✅ CORS restreint (allowlist d'origines)
✅ Helmet (CSP, HSTS, X-Frame-Options, etc.)
✅ Whitelist stricte sur PUT/PATCH (ALLOWED fields)
✅ Validation ObjectId (mongoose.isValidObjectId)
✅ RegEx validation (email, password length checks)
✅ Pas d'exposition de passwordHash, ldapDn
✅ Cookies httpOnly, sameSite strict
```

---

### 3. Gestion d'erreurs centralisée

```javascript
✅ errorHandler middleware unifié
✅ Normalisation des codes HTTP (400, 401, 403, 404, 409, 500)
✅ Messages d'erreur masqués en production (500)
✅ Éxtractions d'erreurs Mongoose
✅ Gestion JWT (TokenExpiredError, JsonWebTokenError)
```

---

### 4. Pagination implémentée

```javascript
✅ page & limit sur toutes les listes critiques
✅ Limites hardcoded (page min=1, limit max=100, default=50)
✅ Skip/limit pattern performant
✅ Comptage distinct (total) pour l'UI
```

---

### 5. Audit logging

```javascript
✅ AuditLog tracé pour login, logout, offboarding, etc.
✅ Contexte utilisateur loggé (userId, role, action, targetId)
✅ Fire-and-forget (non-bloquant)
```

---

## Recommandations prioritaires

### 🎯 Sprint 1 (Critique — 1-2 sprints)

1. **Normaliser l'enveloppe de réponse**
   - Introduire `{ data, page?, limit?, total? }` partout
   - Déployer en parallèle (nouveau header Accept ou param `?format=envelope`)
   - Migrer les clients progressivement

2. **POST → 201 Created systématiquement**
   - Audit tous les `res.json()` après POST
   - Changer en `res.status(201).json()`

3. **Standardiser le format d'erreur sur `{ error }`**
   - Remplacer tous les `{ message }` par `{ error }`
   - Vérifier l'errorHandler centralisé

4. **Distinguer PUT vs PATCH**
   - PUT = remplace toute la ressource (idempotent)
   - PATCH = modifie partiellement (idempotent)
   - Appliquer systématiquement

---

### 🎯 Sprint 2 (Important — 2-3 sprints)

5. **Ajouter pagination partout**
   - Groupes sans pagination → `{ data: [...], page, limit, total }`
   - Capper les résultats même sans pagination

6. **Revoir les routes verbes**
   - POST /forms/:id/freeze → OK
   - POST /evaluations/:id/reassign → revoir si fréquent
   - PATCH /users/:id/avatar → merger dans PATCH /users/:id

7. **Documenter l'API (OpenAPI 3.0)**
   - Ajouter swagger-jsdoc + JSDoc
   - Exposer sur `/api/docs`
   - Générer Postman collection

---

### 🎯 Backlog (Nice-to-have)

8. **Ajouter Link headers** (HATEOAS légère)
9. **Centraliser les validators** (JSON Schema)
10. **Implémenter versioning** (Accept header ou /v1/)
11. **Support 204 No Content** où approprié (DELETE)
12. **Faire un naming.md** (guide de style)

---

## Résumé des changements suggérés

| Aspect | État | Action |
|--------|------|--------|
| **Enveloppes** | Mixte | Normaliser sur `{ data, page?, limit?, total? }` |
| **Codes HTTP** | 95% bon | Ajouter POST 201, harmoniser 204 |
| **Format erreur** | Dual | Standardiser sur `{ error }` |
| **Idempotence** | Mixte | Documenter PUT vs PATCH |
| **Routes verbes** | Acceptable | Réduire (peut-être laisser pour actions complexes) |
| **Pagination** | 90% | Ajouter sur groupes, search |
| **Nommage** | Bon | Créer guide (naming.md) |
| **Documentation** | Absente | Ajouter Swagger/OpenAPI |
| **Sécurité** | Excellente | ✅ Rien à faire |
| **Validation** | Basique | Améliorer (validators centralisés) |

---

## Conclusion

**NX-RH API est de bonne qualité**, mais souffre d'**incohérences** qui impactent l'expérience développeur et la maintenabilité. Les trois changements les plus impactants seraient :

1. ✅ Normaliser l'enveloppe de réponse
2. ✅ POST → 201 systématiquement
3. ✅ Format d'erreur unique

Avec ces trois correctifs, le score passerait **7.0/10 → 8.5/10**.

---

**Audit réalisé :** Copilot  
**Fichiers examinés :** 25+ routes, ~5700 lignes  
**Critères évalués :** Conventions REST, codes HTTP, format réponse, pagination, versioning, naming, idempotence, erreurs, documentation
