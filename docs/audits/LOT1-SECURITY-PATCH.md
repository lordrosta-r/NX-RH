# LOT 1 — Security Patch Verification Report

**Date** : 2025-07-17  
**Auditeur** : Copilot Security Auditor  
**Branche** : `refactor`  
**Commits de référence** : `b0f4d0f`, `b33a555`

---

## Checklist

| # | Vérification | Statut | Détail |
|---|---|---|---|
| 1 | **IDOR RBAC** sur `GET /api/campaigns/:id` | ✅ OK | Pattern RBAC complet : `isCreator`, `hasEvaluation`, `evaluateeId`, `evaluatorId`, `403 Accès non autorisé` — ligne 104 + 171–187 de `routes/campaigns.js` |
| 2 | **Middleware `validate`** créé + branché sur POST/PATCH campaigns | ✅ OK | `mongo/server/middleware/validate.js` présent avec spec Joi (`abortEarly: false`, `stripUnknown: true`, 422). Branché : `router.post('/', validate(createCampaign), …)` (L212) et `router.patch('/:id', validate(updateCampaign), …)` (L264) |
| 3 | **`COOKIE_SECURE=true`** dans `docker-compose.yml` | ✅ OK | Ligne 49 : `COOKIE_SECURE: 'true'` |
| 4 | **`unhandledRejection` / `uncaughtException`** dans `index.js` | ✅ OK | Lignes 202 et 206 : handlers présents |
| 5 | **Cookie `secure` flag** dans `auth.js` (pas de `true` en dur) | ✅ OK | Trois occurrences utilisent `process.env.COOKIE_SECURE !== undefined ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production'` — aucun `secure: true` hardcodé |

---

## Détail des fixes

### Check 1 — IDOR RBAC (`GET /api/campaigns/:id`)

**Fichier** : `mongo/server/routes/campaigns.js`

Le filtre de visibilité appliqué en deux niveaux :

- **Liste (`GET /`)** — Ligne 104 : filtrage par rôle via lookups `Evaluation.find({ evaluateeId })` / `Evaluation.find({ evaluatorId })`.
- **Détail (`GET /:id`)** — Lignes 171–187 :
  ```js
  const isCreator = campaign.createdBy && campaign.createdBy._id…
  let hasEvaluation = false
  hasEvaluation = await Evaluation.exists({ campaignId, evaluateeId: userId })
  // ou evaluatorId selon le rôle
  if (!isCreator && !hasExtendedVisibility && !hasEvaluation)
    return res.status(403).json({ error: 'Accès non autorisé à cette campagne' })
  ```

### Check 2 — Middleware `validate`

**Fichier** : `mongo/server/middleware/validate.js`

```js
'use strict'
const validate = (schema, target = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[target], {
    abortEarly: false,
    stripUnknown: true,
  })
  if (error) {
    return res.status(422).json({
      error: 'Données invalides',
      details: error.details.map(d => ({ field: d.path.join('.'), message: d.message })),
    })
  }
  req[target] = value
  next()
}
module.exports = validate
```

Branchement dans `routes/campaigns.js` :
- `router.post('/', validate(createCampaign), …)` — L212
- `router.patch('/:id', validate(updateCampaign), …)` — L264

### Check 3 — `COOKIE_SECURE` dans `docker-compose.yml`

```yaml
environment:
  COOKIE_SECURE: 'true'   # ligne 49
```

### Check 4 — Handlers Node.js non gérés (`index.js`)

```js
process.on('unhandledRejection', (reason, promise) => { … })  // L202
process.on('uncaughtException',  (err) => { … })              // L206
```

### Check 5 — Cookie `secure` conditionnel (`auth.js`)

Les trois `res.cookie(…)` utilisent :
```js
secure: process.env.COOKIE_SECURE !== undefined
  ? process.env.COOKIE_SECURE === 'true'
  : process.env.NODE_ENV === 'production'
```

Aucun `secure: true` hardcodé — le flag s'adapte à l'environnement.

---

## Résumé

Tous les fixes LOT 1 sont **correctement appliqués**. Aucun correctif supplémentaire n'était nécessaire.

| Fixes nécessitant une intervention | 0 |
|---|---|
| Fixes validés sans modification | 5 |
| Fixes corrigés par cet audit | 0 |
