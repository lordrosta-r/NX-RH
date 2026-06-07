'use strict'

const assert = require('assert')
const { runTests, login, auth } = require('./helpers')

async function run(request, fixtures) {
  const { hr, emp1, manager1, camp1, camp2, formA } = fixtures
  let draftCampId = null

  const tests = [
    {
      name: 'GET /api/campaigns — liste les campagnes E2E',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.get('/api/campaigns'), cookie)
        assert.strictEqual(res.status, 200)
        const campaigns = Array.isArray(res.body) ? res.body : res.body.data
        const e2eCamps = campaigns.filter(c => c.name.startsWith('[E2E]'))
        assert.ok(e2eCamps.length >= 2, `Attendu ≥ 2 campagnes E2E, got ${e2eCamps.length}`)
      },
    },
    {
      name: 'GET /api/campaigns/:id — retourne camp1 avec stats',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.get(`/api/campaigns/${camp1._id}`), cookie)
        assert.strictEqual(res.status, 200)
        assert.strictEqual(res.body.name, '[E2E] Campagne Active 2025')
        assert.ok(res.body.stats !== undefined, 'Stats doivent être présentes')
      },
    },
    {
      name: 'GET /api/campaigns?status=active — filtre par statut',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.get('/api/campaigns?status=active'), cookie)
        assert.strictEqual(res.status, 200)
        const camps = Array.isArray(res.body) ? res.body : res.body.data
        const e2e = camps.filter(c => c.name.startsWith('[E2E]'))
        assert.ok(e2e.every(c => c.status === 'active'), 'Toutes les campagnes filtrées doivent être actives')
      },
    },
    {
      name: 'POST /api/campaigns — HR crée une campagne draft',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.post('/api/campaigns'), cookie).send({
          name: '[E2E] Campagne Temp',
          startDate: '2025-03-01',
          endDate:   '2025-09-30',
        })
        assert.strictEqual(res.status, 201)
        draftCampId = res.body.id
        assert.ok(draftCampId)
      },
    },
    {
      name: 'POST /api/campaigns — endDate avant startDate → 400',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.post('/api/campaigns'), cookie).send({
          name: '[E2E] Camp dates invalides',
          startDate: '2025-12-01',
          endDate:   '2025-01-01',
        })
        assert.strictEqual(res.status, 400)
      },
    },
    {
      name: 'POST /api/campaigns — champs requis manquants → 400',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.post('/api/campaigns'), cookie).send({ name: '[E2E] Camp sans dates' })
        assert.strictEqual(res.status, 400)
      },
    },
    {
      name: 'PATCH /api/campaigns/:id — activer la campagne draft (draft → active)',
      fn: async () => {
        if (!draftCampId) return
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.patch(`/api/campaigns/${draftCampId}`), cookie).send({ status: 'active' })
        assert.strictEqual(res.status, 200)
        assert.strictEqual(res.body.status, 'active')
      },
    },
    {
      name: 'PATCH /api/campaigns/:id — fermer la campagne (active → closed)',
      fn: async () => {
        if (!draftCampId) return
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.patch(`/api/campaigns/${draftCampId}`), cookie).send({ status: 'closed' })
        assert.strictEqual(res.status, 200)
        assert.strictEqual(res.body.status, 'closed')
      },
    },
    {
      name: 'PATCH /api/campaigns/:id — archiver la campagne (closed → archived)',
      fn: async () => {
        if (!draftCampId) return
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.patch(`/api/campaigns/${draftCampId}`), cookie).send({ status: 'archived' })
        assert.strictEqual(res.status, 200)
        assert.strictEqual(res.body.status, 'archived')
      },
    },
    {
      name: 'PATCH /api/campaigns/:id — transition invalide (archived → active) → 400',
      fn: async () => {
        if (!draftCampId) return
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.patch(`/api/campaigns/${draftCampId}`), cookie).send({ status: 'active' })
        assert.ok([400, 422].includes(res.status), `Expected 400/422, got ${res.status}: ${JSON.stringify(res.body)}`)
      },
    },
    {
      name: 'GET /api/campaigns — employee voit uniquement les campagnes actives',
      fn: async () => {
        const cookie = await login(request, 'emp1@nx.test')
        const res = await auth(request.get('/api/campaigns'), cookie)
        assert.strictEqual(res.status, 200)
        const camps = Array.isArray(res.body) ? res.body : res.body.data
        const nonActive = camps.filter(c => c.status !== 'active')
        assert.strictEqual(nonActive.length, 0, `Employee voit des campagnes non-actives: ${nonActive.map(c => c.status)}`)
      },
    },
    {
      name: 'GET /api/campaigns/:id — 400 sur ID invalide',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.get('/api/campaigns/not-an-objectid'), cookie)
        assert.strictEqual(res.status, 400)
      },
    },
    {
      name: 'GET /api/campaigns/:id — 404 sur ID inexistant',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const fakeId = '507f1f77bcf86cd799439011'
        const res = await auth(request.get(`/api/campaigns/${fakeId}`), cookie)
        assert.strictEqual(res.status, 404)
      },
    },
  ]

  return runTests(tests)
}

module.exports = { run }
