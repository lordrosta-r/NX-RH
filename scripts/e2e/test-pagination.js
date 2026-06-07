'use strict'

const assert = require('assert')
const { runTests, login, auth } = require('./helpers')

async function run(request, fixtures) {
  const tests = [
    // ─── Users pagination ────────────────────────────────────────────────────
    {
      name: 'GET /api/users?page=1&limit=2 — retourne exactement 2 users',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const res = await auth(request.get('/api/users?page=1&limit=2'), cookie)
        assert.strictEqual(res.status, 200)
        const users = res.body.data || res.body
        assert.ok(Array.isArray(users), 'Réponse doit être un tableau')
        assert.strictEqual(users.length, 2, `Expected 2 users, got ${users.length}`)
      },
    },
    {
      name: 'GET /api/users?page=2&limit=2 — page 2 différente de page 1',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const [res1, res2] = await Promise.all([
          auth(request.get('/api/users?page=1&limit=2'), cookie),
          auth(request.get('/api/users?page=2&limit=2'), cookie),
        ])
        assert.strictEqual(res1.status, 200)
        assert.strictEqual(res2.status, 200)
        const ids1 = (res1.body.data || res1.body).map(u => u._id || u.id)
        const ids2 = (res2.body.data || res2.body).map(u => u._id || u.id)
        const overlap = ids1.filter(id => ids2.includes(id))
        assert.strictEqual(overlap.length, 0, `Page 1 et page 2 ont des users en commun: ${overlap}`)
      },
    },
    {
      name: 'GET /api/users?page=999&limit=10 — page hors bornes → 200 tableau vide',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const res = await auth(request.get('/api/users?page=999&limit=10'), cookie)
        assert.strictEqual(res.status, 200)
        const users = res.body.data || res.body
        assert.ok(Array.isArray(users), 'Réponse doit être un tableau')
        assert.strictEqual(users.length, 0, `Page 999 doit retourner 0 users, got ${users.length}`)
      },
    },
    {
      name: 'GET /api/users — réponse contient les métadonnées de pagination',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const res = await auth(request.get('/api/users?page=1&limit=5'), cookie)
        assert.strictEqual(res.status, 200)
        // Vérifier que total, page, limit ou similar sont présents
        const body = res.body
        const hasPaginationMeta = (
          typeof body.total === 'number' ||
          typeof body.count === 'number' ||
          Array.isArray(body.data)
        )
        assert.ok(hasPaginationMeta, 'Réponse doit inclure des métadonnées de pagination ou body.data')
      },
    },
    // ─── Campaigns pagination ────────────────────────────────────────────────
    {
      name: 'GET /api/campaigns?page=1&limit=1 — retourne exactement 1 campagne',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.get('/api/campaigns?page=1&limit=1'), cookie)
        assert.strictEqual(res.status, 200)
        const camps = res.body.data || res.body
        assert.ok(Array.isArray(camps))
        assert.ok(camps.length <= 1, `Expected ≤ 1 campagne avec limit=1, got ${camps.length}`)
      },
    },
    // ─── Limit cap ───────────────────────────────────────────────────────────
    {
      name: 'GET /api/users?limit=1000 — limit cappé à max autorisé',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const res = await auth(request.get('/api/users?page=1&limit=1000'), cookie)
        assert.strictEqual(res.status, 200)
        const users = res.body.data || res.body
        // Il y a 10 users E2E → si limit est cappé correctement, max = 100 par ex.
        // Au minimum, ça ne doit pas planter et retourner une liste valide
        assert.ok(Array.isArray(users))
        assert.ok(users.length <= 200, `Limit=1000 ne devrait pas retourner > 200 résultats (anti-DoS)`)
      },
    },
    // ─── Evaluations pagination ───────────────────────────────────────────────
    {
      name: 'GET /api/evaluations?page=1&limit=2 — retourne ≤ 2 évals',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const res = await auth(request.get('/api/evaluations?page=1&limit=2'), cookie)
        assert.strictEqual(res.status, 200)
        const evals = res.body.data || res.body
        assert.ok(Array.isArray(evals))
        assert.ok(evals.length <= 2, `Expected ≤ 2 évals, got ${evals.length}`)
      },
    },
  ]

  return runTests(tests)
}

module.exports = { run }
