'use strict'

const assert = require('assert')
const { runTests, login, auth } = require('./helpers')

async function run(request, fixtures) {
  const { hr, admin, manager1, emp1, camp1, formA } = fixtures

  const tests = [
    // ─── firstName trop long ──────────────────────────────────────────────────
    {
      name: 'POST /api/users — firstName > 100 chars → 400',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const res = await auth(request.post('/api/users'), cookie).send({
          email:      'longname@nx.test',
          firstName:  'A'.repeat(101),
          lastName:   'Test',
          role:       'employee',
          department: 'HR',
          position:   'Testeur',
        })
        assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}: ${JSON.stringify(res.body)}`)
      },
    },
    // ─── email invalide ───────────────────────────────────────────────────────
    {
      name: 'POST /api/users — email invalide → 400',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const res = await auth(request.post('/api/users'), cookie).send({
          email:      'pas-un-email',
          firstName:  'Test',
          lastName:   'User',
          role:       'employee',
          department: 'HR',
          position:   'Testeur',
        })
        assert.ok([400, 422].includes(res.status), `Expected 400/422, got ${res.status}`)
      },
    },
    // ─── email dupliqué ───────────────────────────────────────────────────────
    {
      name: 'POST /api/users — email dupliqué → 409',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const res = await auth(request.post('/api/users'), cookie).send({
          email:      'emp1@nx.test',  // déjà existant
          firstName:  'Doublon',
          lastName:   'Test',
          role:       'employee',
          department: 'HR',
          position:   'Test',
        })
        assert.strictEqual(res.status, 409, `Expected 409 (duplicate), got ${res.status}`)
      },
    },
    // ─── role invalide ────────────────────────────────────────────────────────
    {
      name: 'POST /api/users — role invalide → 400',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const res = await auth(request.post('/api/users'), cookie).send({
          email:      'invalidrole@nx.test',
          firstName:  'Test',
          lastName:   'User',
          role:       'super_admin_special',
          department: 'HR',
          position:   'Test',
        })
        assert.strictEqual(res.status, 400, `Expected 400 pour rôle invalide, got ${res.status}`)
      },
    },
    // ─── answers.value invalide ───────────────────────────────────────────────
    {
      name: 'PATCH /api/evaluations/:id — answers.value = objet → 400',
      fn: async () => {
        // Chercher une éval en statut assigned
        const cookie = await login(request, 'admin@nx.test')
        const listRes = await auth(
          request.get(`/api/evaluations?campaignId=${camp1._id}&status=assigned`), cookie
        )
        const evals = listRes.body.data || listRes.body
        if (!evals.length) return  // pas d'éval disponible, skip

        const evalId = evals[0]._id
        const res = await auth(request.patch(`/api/evaluations/${evalId}`), cookie).send({
          answers: [{ questionId: 'q1', value: { $gt: '' } }],  // valeur objet
        })
        assert.ok([400, 422].includes(res.status), `Expected 400/422, got ${res.status}: ${JSON.stringify(res.body)}`)
      },
    },
    // ─── type de formulaire invalide ──────────────────────────────────────────
    {
      name: 'POST /api/forms — type invalide → 400',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.post('/api/forms'), cookie).send({
          title:      '[E2E] Form Type Invalide',
          formType:   'hacker_form',
          campaignId: camp1._id.toString(),
          questions:  [],
        })
        assert.ok([400, 422].includes(res.status), `Expected 400/422, got ${res.status}`)
      },
    },
    // ─── reviewerComment trop long ────────────────────────────────────────────
    {
      name: 'PATCH /api/evaluations/:id — reviewerComment > 5000 chars → 400',
      fn: async () => {
        // Chercher une éval submitted
        const cookie = await login(request, 'manager1@nx.test')
        const listRes = await auth(
          request.get(`/api/evaluations?campaignId=${camp1._id}`), cookie
        )
        const evals = listRes.body.data || listRes.body
        const submittedEval = evals.find(e => e.status === 'submitted')
        if (!submittedEval) return  // skip

        const res = await auth(request.patch(`/api/evaluations/${submittedEval._id}`), cookie).send({
          reviewerComment: 'x'.repeat(5001),
        })
        assert.ok([400, 422].includes(res.status), `Expected 400/422 pour comment trop long, got ${res.status}`)
      },
    },
    // ─── PATCH evaluation — status invalide ───────────────────────────────────
    {
      name: 'PATCH /api/evaluations/:id — status invalide → 400',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const listRes = await auth(request.get('/api/evaluations'), cookie)
        const evals = listRes.body.data || listRes.body
        if (!evals.length) return

        const res = await auth(request.patch(`/api/evaluations/${evals[0]._id}`), cookie).send({
          status: 'super_approved',
        })
        assert.ok([400, 422].includes(res.status), `Expected 400 pour status invalide, got ${res.status}`)
      },
    },
    // ─── Campaign status invalide ─────────────────────────────────────────────
    {
      name: 'PATCH /api/campaigns/:id — status invalide → 400',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.patch(`/api/campaigns/${camp1._id}`), cookie).send({
          status: 'super_active',
        })
        assert.ok([400, 422].includes(res.status), `Expected 400 pour status invalide, got ${res.status}`)
      },
    },
    // ─── Titre de campagne vide ───────────────────────────────────────────────
    {
      name: 'POST /api/campaigns — name vide → 400',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.post('/api/campaigns'), cookie).send({
          name:      '',
          startDate: '2025-01-01',
          endDate:   '2025-12-31',
        })
        assert.ok([400, 422].includes(res.status), `Expected 400 pour name vide, got ${res.status}`)
      },
    },
  ]

  return runTests(tests)
}

module.exports = { run }
