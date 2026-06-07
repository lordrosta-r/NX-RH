'use strict'

const assert = require('assert')
const { runTests, login, auth } = require('./helpers')

async function run(request, fixtures) {
  const { emp1, emp2, emp3, manager1, manager2, camp1, formA } = fixtures

  const tests = [
    // ─── Routes réservées admin/hr ─────────────────────────────────────────
    {
      name: 'Employee — 403 sur POST /api/users',
      fn: async () => {
        const cookie = await login(request, 'emp1@nx.test')
        const res = await auth(request.post('/api/users'), cookie).send({
          firstName: 'X', lastName: 'Y', email: 'x@x.com', role: 'employee', passwordHash: 'Test1234!', authSource: 'local',
        })
        assert.strictEqual(res.status, 403)
      },
    },
    {
      name: 'Manager — 403 sur POST /api/users',
      fn: async () => {
        const cookie = await login(request, 'manager1@nx.test')
        const res = await auth(request.post('/api/users'), cookie).send({
          firstName: 'X', lastName: 'Y', email: 'x2@x.com', role: 'employee', passwordHash: 'Test1234!', authSource: 'local',
        })
        assert.strictEqual(res.status, 403)
      },
    },
    {
      name: 'Employee — 403 sur POST /api/campaigns',
      fn: async () => {
        const cookie = await login(request, 'emp1@nx.test')
        const res = await auth(request.post('/api/campaigns'), cookie).send({
          name: 'X', startDate: new Date(), endDate: new Date(),
        })
        assert.strictEqual(res.status, 403)
      },
    },
    {
      name: 'Manager — 403 sur POST /api/campaigns',
      fn: async () => {
        const cookie = await login(request, 'manager1@nx.test')
        const res = await auth(request.post('/api/campaigns'), cookie).send({
          name: 'X', startDate: new Date(), endDate: new Date(),
        })
        assert.strictEqual(res.status, 403)
      },
    },
    {
      name: 'Employee — 403 sur POST /api/forms',
      fn: async () => {
        const cookie = await login(request, 'emp1@nx.test')
        const res = await auth(request.post('/api/forms'), cookie).send({ title: 'X', type: 'self_evaluation' })
        assert.strictEqual(res.status, 403)
      },
    },
    {
      name: 'Employee — 403 sur POST /api/evaluations/bulk',
      fn: async () => {
        const cookie = await login(request, 'emp1@nx.test')
        const res = await auth(request.post('/api/evaluations/bulk'), cookie).send({ evaluations: [] })
        // bulk nécessite admin/hr → 403
        assert.strictEqual(res.status, 403)
      },
    },
    // ─── IDOR entre employés ───────────────────────────────────────────────
    {
      name: 'Employee emp2 — 403 sur PATCH /api/users/:emp1_id',
      fn: async () => {
        const cookie = await login(request, 'emp2@nx.test')
        const res = await auth(request.patch(`/api/users/${emp1._id}`), cookie).send({ firstName: 'Hack' })
        assert.strictEqual(res.status, 403)
      },
    },
    {
      name: 'Employee emp1 — 403 sur PATCH /api/users/:emp3_id (différent manager)',
      fn: async () => {
        const cookie = await login(request, 'emp1@nx.test')
        const res = await auth(request.patch(`/api/users/${emp3._id}`), cookie).send({ firstName: 'Hack' })
        assert.strictEqual(res.status, 403)
      },
    },
    // ─── Manager ne modifie pas un user hors de son équipe ─────────────────
    {
      name: 'Manager1 — 403 PATCH /api/users/:emp3_id (équipe manager2)',
      fn: async () => {
        const cookie = await login(request, 'manager1@nx.test')
        const res = await auth(request.patch(`/api/users/${emp3._id}`), cookie).send({ firstName: 'Hack' })
        assert.strictEqual(res.status, 403)
      },
    },
    // ─── Accès non authentifié ─────────────────────────────────────────────
    {
      name: 'GET /api/users — 401 sans cookie',
      fn: async () => {
        const res = await request.get('/api/users')
        assert.strictEqual(res.status, 401)
      },
    },
    {
      name: 'GET /api/campaigns — 401 sans cookie',
      fn: async () => {
        const res = await request.get('/api/campaigns')
        assert.strictEqual(res.status, 401)
      },
    },
    {
      name: 'GET /api/evaluations — 401 sans cookie',
      fn: async () => {
        const res = await request.get('/api/evaluations')
        assert.strictEqual(res.status, 401)
      },
    },
  ]

  return runTests(tests)
}

module.exports = { run }
