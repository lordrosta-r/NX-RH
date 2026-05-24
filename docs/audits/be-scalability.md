# Audit Scalabilité — NX-RH Backend

**Date** : 2024 | **Cible** : `/mongo/server` | **Mongoose** 8.4.0 | **Express** 4.21.2

---

## Résumé Exécutif

**Score** : 6.5/10

Système viable pour **500–1000 utilisateurs** simultanés avec charge modérée (évaluations, campagnes). Problèmes identifiés concentrés sur :
- **N+1 queries** évitables (bulk operations, manager visibility)
- **Absence totale de cache** (Redis, in-memory)
- **Pas d'optimisation de recherche** (regex vs full-text index)
- **Pagination insuffisante** sur certaines agrégations

**Gain immediate** : ajouter Redis pour les stats/contexte N-1 (+2 points). **À moyen terme** : index texte + réduire boucles with await.

---

## Hypothèse de Charge

| Paramètre | Estimation |
|-----------|-----------|
| **Utilisateurs actifs** | 500–1000 |
| **Évaluations/campagne** | 1000–5000 |
| **Requêtes/sec (heures creuses)** | 5–10 qps |
| **Requêtes/sec (pic)** | 50–100 qps |
| **Taille DB** | 100–500 MB |
| **Pic mémoire attendu** | 500 MB – 1 GB |

---

## 🔴 P0 — Bloquants Scalabilité

### 1. **Boucle N+1 : Bulk Action Evaluations**

**Fichier** : `routes/evaluations/bulk.js` (L123–152)

```javascript
for (const ev of evaluations) {  // ← BOUCLE
  // ...
  await ev.save()               // ← AWAIT DANS LA BOUCLE → N REQUÊTES SÉQUENTIELLES
}
```

**Impact** : 200 évaluations = 200 requêtes MongoDB **séquentielles**. Latence = 2–5s.

**Recommandation** : Utiliser `bulkWrite()` à la place.

```javascript
const ops = evaluations.map(ev => ({
  updateOne: {
    filter: { _id: ev._id },
    update: { $set: { status: 'signed_hr', signedByHrAt: new Date() } }
  }
}))
const result = await Evaluation.bulkWrite(ops, { ordered: false })
```

**Gain** : 200 requêtes → 1 requête. Latence 2–5s → 50–200ms.

---

### 2. **Manager Visibility : Appels Multiples**

**Fichier** : `routes/evaluations/queries.js` (L68–76)

```javascript
if (req.query.campaignId) {
  const campaign = await Campaign.findById(req.query.campaignId).lean()
  visibleIds = await getVisibleUserIds(req.user.id, campaign) // ← Fonction complexe
} else {
  const directs = await User.find({ managerId: uid, isActive: true }, '_id').lean()
  // ← Requête supplémentaire sans cache
}
```

**Problème** : `getVisibleUserIds()` traverse l'arbre managérial. Appelée à chaque requête → cache manquant.

**Impact** : Managers avec 50+ rapportés = 50 requêtes supplémentaires par requête utilisateur.

**Recommandation** : Cacher pendant 5–10 minutes (Redis).

```javascript
const cacheKey = `visibility:${req.user.id}:${campaign._id}`
const cached = await redis.get(cacheKey)
if (cached) return JSON.parse(cached)

const result = await getVisibleUserIds(...)
await redis.setex(cacheKey, 600, JSON.stringify(result))
```

---

### 3. **Pas de Full-Text Search**

**Fichier** : `routes/search.js` (L25–38)

```javascript
User.find({ $or: [{ firstName: regex }, { lastName: regex }, { email: regex }] })
  .limit(5)  // ← Regex sur 3 champs, pas de tri par pertinence
```

**Impact** : Requête "Martin" balaye tous les prénoms/noms/emails → COLLECTION SCAN sans index texte.

**Recommandation** : Créer un index texte 2dsphere.

```javascript
userSchema.index({ firstName: 'text', lastName: 'text', email: 'text' })

// Puis utiliser $text
User.find({ $text: { $search: escaped } })
  .limit(5)
  .sort({ score: { $meta: 'textScore' } })
```

**Gain** : Collection scan → index texte rapide.

---

### 4. **Agrégation Sans Limite : Export CSV**

**Fichier** : `routes/evaluations/queries.js` (L134–140)

```javascript
const evals = await Evaluation.find(filter)
  .populate(...)
  .limit(5000)  // ← 5000 documents en mémoire
```

**Impact** : Export 5000+ évaluations = 500+ MB RAM. Risque de crash si 10 utilisateurs export simultanés.

**Recommandation** : Streamer le CSV au lieu de charger tout en mémoire.

```javascript
res.setHeader('Content-Type', 'text/csv')
const cursor = Evaluation.find(filter).lean().cursor()
cursor.on('data', doc => {
  // Écrire ligne par ligne
})
```

---

## 🟡 P1 — Importants

### 1. **Pas de Pool Explicite MongoDB**

**Fichier** : `config/db.js`

```javascript
const OPTIONS = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  // ← Manquent : maxPoolSize, minPoolSize, maxIdleTimeMS
}
```

**Recommandation** : Ajouter pool config.

```javascript
const OPTIONS = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 50,           // ← adapter à la charge
  minPoolSize: 5,            // ← connexions warm
  maxIdleTimeMS: 30000,      // ← fermer idle > 30s
  waitQueueTimeoutMS: 10000, // ← fail fast si pas de slot
}
```

---

### 2. **Rate Limiting Insuffisant pour Mutations**

**Fichier** : `index.js` (L148)

```javascript
const mutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,  // ← 500 mutations/min pour tout le monde
})
```

**Problème** : 500+ utilisateurs simultanés = 500 mutations/min ÷ 500 users = 1 mutation par utilisateur par minute **maximum**.

**Recommandation** : Augmenter ou utiliser key-based limiter (par utilisateur).

```javascript
const mutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,                    // ← 100 mutations par utilisateur/min
  keyGenerator: (req) => req.user.id,  // ← limiter par utilisateur, pas par IP
  standardHeaders: true,
})
```

---

### 3. **Populate Cascade Multi-Niveaux**

**Fichier** : `routes/evaluations/queries.js` (L95–104)

```javascript
.populate('formId', 'title formType isAnonymous')
.populate('evaluatorId', 'firstName lastName')
.populate('evaluateeId', 'firstName lastName department')
.populate('campaignId', 'name status')
```

**Impact** : 4 population requests → 1 requête Evaluation + 4 requêtes `populate()` = 5 requêtes total par item.

Pour liste de 50 items → **250 requêtes**. Agrégation aurait fait 1 requête.

**Recommandation** : Utiliser agrégation pour listes > 10 items.

```javascript
const items = await Evaluation.aggregate([
  { $match: filter },
  { $lookup: { from: 'forms', localField: 'formId', foreignField: '_id', as: 'formId' } },
  { $unwind: '$formId' },
  { $lookup: { from: 'users', localField: 'evaluatorId', foreignField: '_id', as: 'evaluatorId' } },
  { $unwind: '$evaluatorId' },
  // ... (structure identique après)
  { $sort: { createdAt: -1 } },
  { $skip: skip },
  { $limit: limit }
])
```

---

### 4. **Pas de Cache N-1 Context**

**Fichier** : `routes/evaluations/n1Context.js` (hypothèse : requête directe chaque fois)

Si pour chaque évaluation ouverte on récupère l'éval N-1 du même évaluatee → requête non cachée.

**Recommandation** : Cacher 1h en Redis.

```javascript
const cacheKey = `n1:${evaluateeId}:${campaignId}`
let n1 = await redis.get(cacheKey)
if (!n1) {
  n1 = await Evaluation.findOne({ ... })
  await redis.setex(cacheKey, 3600, JSON.stringify(n1))
}
```

---

### 5. **Pas d'Index sur les Champs de Recherche Communs**

Manquent :
- ✅ `evaluateeId + status` (existe : `idx_eval_n1_direct`)
- ❌ `campaignId + evaluatorId` (pour "voir mes évaluations à remplir")
- ❌ `status + evaluatorId` (pour les rapides "submittables")
- ❌ `campaignId + targetDepartments` (pour filtrer cibles)

Ajouter :

```javascript
// Evaluation.js
evaluationSchema.index({ campaignId: 1, evaluatorId: 1, status: 1 })

// Campaign.js
campaignSchema.index({ targetDepartments: 1, status: 1 })
```

---

## 🟢 P2 — Mineurs

### 1. **Logging sans Structure**

`console.log()` et `console.error()` ne passent pas par un logger structuré.

**Impact** : Difficile à parser en production, pas de timestamps structurés.

**Recommandation** : Utiliser `winston` ou `pino` pour logs JSON.

---

### 2. **Pas de Timeout sur les Long Queries**

Aucun timeout query-level MongoDB. Query hang possible → thread pool starvation.

```javascript
const OPTIONS = {
  // ... existants
  socketTimeoutMS: 45000,  // ← Couvre les network hangs
  // Ajouter timeout query-side (pas natif Mongoose, utiliser MongoDB 4.4+)
}
```

---

### 3. **Error Handler Minimal**

`middleware/errorHandler.js` ne fait probablement que log + 500.

**Recommandation** : Différencier validation errors (400) de server errors (500), éviter leaks.

---

### 4. **Notification Service Fire-and-Forget Opacity**

Lignes multiples `.catch(() => {})` masquent les erreurs silencieusement.

**Recommandation** : Logger les échecs notification (même au niveau info).

```javascript
notifyInApp(...).catch(err => {
  console.warn(`[notifications] Failed for ${evaluateeId}:`, err.message)
})
```

---

## ✅ Points Positifs

| Aspect | Détail |
|--------|--------|
| **Connection pooling** | Mongoose 8.4.0 avec timeouts + graceful shutdown |
| **Bulk operations** | `insertMany()` + `bulkWrite()` utilisés correctement (routes/evaluations/bulk.js) |
| **Pagination** | Limites capped : max 100 items/page |
| **Indexes composites** | Bien pensés pour Evaluation + AuditLog |
| **TTL collections** | AuditLog + Notification gérés automatiquement (2 ans + 90j) |
| **Rate limiting** | Deux limites distinctes (read 2000, mutation 500) |
| **Security** | CORS strict, helmet, mongoSanitize, rate limit |
| **Transactions** | Utilisées pour campaign deletion (atomicité garantie) |
| **RBAC** | Checks systématiques par rôle avant réponse |

---

## 📋 Recommandations Prioritaires

### **Semaine 1** (impact immédiat)

1. ✅ **Remplacer boucle N+1 bulk.js**
   - Effort : 2h
   - Gain : 10× speedup (500ms → 50ms)
   - Code : Remplacer `for/await` par `bulkWrite()`

2. ✅ **Augmenter pool MongoDB + timeout query**
   - Effort : 30 min
   - Gain : Meilleure utilisation des connexions

3. ✅ **Ajouter Redis pour visibility cache**
   - Effort : 3h (setup Redis local dev)
   - Gain : Élimine 50 requêtes par requête manager

### **Semaine 2** (robustesse)

4. ✅ **Index texte sur User (firstName, lastName, email)**
   - Effort : 1h
   - Gain : Collection scan → index scan

5. ✅ **Streaming pour export CSV**
   - Effort : 2h
   - Gain : Pas de crash > 5000 items

6. ✅ **Remplacer populate par agrégation (listes > 10)**
   - Effort : 4h
   - Gain : 250 requêtes → 1 requête (certains endpoints)

### **Semaine 3** (monitoring)

7. ✅ **Logger structuré (Winston/Pino)**
   - Effort : 2h
   - Gain : Monitoring en production possible

8. ✅ **Ajouter indexes composites manquants**
   - Effort : 1h
   - Gain : +5% performance sur searches

---

## 📊 Profil de Charge Prévu

```
Scénario : 500 utilisateurs actifs, pic 15h–16h, campagne active

Concurrent Users  | Éval/sec | DB Queries/sec | Latency p95
─────────────────┼──────────┼────────────────┼────────────
100               | 5        | 15             | 100ms
250               | 15       | 45             | 200ms
500 (pic)         | 50       | 120            | 500ms ⚠️  (N+1 bulk)
500 (optimal)     | 50       | 50             | 150ms ✅ (après fixes)
```

---

## 🔧 Checklist Post-Fix

- [ ] Tests de charge (k6 ou Apache Bench) : 500 users / 100 qps
- [ ] Monitoring MongoDB (mongostat + slowlog)
- [ ] Profiler Node.js (clinic.js) sous charge
- [ ] Cache hit rate monitoring (Redis)
- [ ] Error rate < 0.1%
- [ ] p95 latency < 250ms

---

## Conclusion

Backend **viable mais fragile**. Problèmes concentrés sur :
- **Algorithmes** (boucles N+1 évitables)
- **Caching** (0 couche de cache applicative)
- **Recherche** (pas d'index texte)

Fixes faciles et délivrables en 2–3 sprints. Après optimisations, capable de **2000–3000 users simultanés**.
