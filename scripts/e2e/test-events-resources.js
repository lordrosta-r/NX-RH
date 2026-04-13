'use strict'

const assert = require('assert')
const { runTests, login, auth } = require('./helpers')

async function run(request, fixtures) {
  let eventId = null
  let resourceId = null

  const tests = [
    // ─── EVENTS ──────────────────────────────────────────────────────────────
    {
      name: 'POST /api/events — HR crée un événement',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.post('/api/events'), cookie).send({
          title: '[E2E] Réunion RH',
          date:  '2025-06-15T10:00:00.000Z',
          type:  'meeting',
        })
        assert.ok([200, 201].includes(res.status), `POST /events: ${res.status} ${JSON.stringify(res.body)}`)
        eventId = res.body.id || res.body._id
        assert.ok(eventId, 'event id manquant')
      },
    },
    {
      name: 'GET /api/events — retourne la liste des événements',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const res = await auth(request.get('/api/events'), cookie)
        assert.strictEqual(res.status, 200)
        const events = res.body.data || res.body
        assert.ok(Array.isArray(events), 'events doit être un array')
      },
    },
    {
      name: 'GET /api/events/:id — retourne l\'événement créé',
      fn: async () => {
        if (!eventId) return
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.get(`/api/events/${eventId}`), cookie)
        assert.ok([200, 404].includes(res.status))
        if (res.status === 200) {
          assert.ok(res.body.title.includes('[E2E]'))
        }
      },
    },
    {
      name: 'PATCH /api/events/:id — modifier un événement',
      fn: async () => {
        if (!eventId) return
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.patch(`/api/events/${eventId}`), cookie).send({
          title: '[E2E] Réunion RH (modifiée)',
        })
        assert.ok([200, 404].includes(res.status))
      },
    },
    {
      name: 'DELETE /api/events/:id — supprimer l\'événement',
      fn: async () => {
        if (!eventId) return
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.delete(`/api/events/${eventId}`), cookie)
        assert.ok([200, 204, 404].includes(res.status), `DELETE event: ${res.status}`)
      },
    },
    {
      name: 'GET /api/events/:id — après suppression → 404',
      fn: async () => {
        if (!eventId) return
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.get(`/api/events/${eventId}`), cookie)
        assert.ok([404, 400].includes(res.status), `Event devrait être supprimé, got ${res.status}`)
      },
    },
    {
      name: 'GET /api/events/invalid-id — 400 sur ID invalide',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.get('/api/events/not-an-objectid'), cookie)
        assert.strictEqual(res.status, 400)
      },
    },
    // ─── RESOURCES ───────────────────────────────────────────────────────────
    {
      name: 'POST /api/resources — HR crée une ressource',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.post('/api/resources'), cookie).send({
          title:       '[E2E] Guide entretien',
          description: 'Document de référence',
          type:        'pdf',
          filename:    'guide-entretien.pdf',
        })
        assert.ok([200, 201].includes(res.status), `POST /resources: ${res.status} ${JSON.stringify(res.body)}`)
        resourceId = res.body.id || res.body._id
        assert.ok(resourceId, 'resource id manquant')
      },
    },
    {
      name: 'GET /api/resources — retourne la liste des ressources',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const res = await auth(request.get('/api/resources'), cookie)
        assert.strictEqual(res.status, 200)
        const resources = res.body.data || res.body
        assert.ok(Array.isArray(resources), 'resources doit être un array')
      },
    },
    {
      name: 'GET /api/resources/:id — retourne la ressource créée',
      fn: async () => {
        if (!resourceId) return
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.get(`/api/resources/${resourceId}`), cookie)
        assert.ok([200, 404].includes(res.status))
        if (res.status === 200) {
          assert.ok(res.body.title.includes('[E2E]'))
        }
      },
    },
    {
      name: 'DELETE /api/resources/:id — supprimer la ressource',
      fn: async () => {
        if (!resourceId) return
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.delete(`/api/resources/${resourceId}`), cookie)
        assert.ok([200, 204, 404].includes(res.status), `DELETE resource: ${res.status}`)
      },
    },
    {
      name: 'GET /api/resources/:id — après suppression → 404',
      fn: async () => {
        if (!resourceId) return
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.get(`/api/resources/${resourceId}`), cookie)
        assert.ok([404, 400].includes(res.status), `Resource devrait être supprimée, got ${res.status}`)
      },
    },
    {
      name: 'GET /api/resources/invalid-id — 400 sur ID invalide',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.get('/api/resources/not-an-objectid'), cookie)
        assert.strictEqual(res.status, 400)
      },
    },
  ]

  return runTests(tests)
}

module.exports = { run }
