'use strict'

const assert = require('assert')
const { runTests, login, auth } = require('./helpers')

// Teste la visibilité hiérarchique avec extendedVisibility
// Hiérarchie :
//   senior_manager → manager1 (emp1, emp2) + manager2 (emp3, emp4)
// Camp1 a extendedVisibility=[{ managerId: seniorManager, restrictedToManagers: [] }]

async function run(request, fixtures) {
  const { seniorManager, manager1, manager2, emp1, emp2, emp3, emp4, camp1, formA, hr } = fixtures

  // Créer des évaluations pour toute la hiérarchie (besoin pour les tests de visibilité)
  const hrCookie = await login(request, 'hr@nx.test')

  // Créer des évals pour emp1, emp2, emp3, emp4 sur camp1/formA
  const evaluationsToCreate = [
    { evaluatorId: manager1._id.toString(), evaluateeId: emp1._id.toString() },
    { evaluatorId: manager1._id.toString(), evaluateeId: emp2._id.toString() },
    { evaluatorId: manager2._id.toString(), evaluateeId: emp3._id.toString() },
    { evaluatorId: manager2._id.toString(), evaluateeId: emp4._id.toString() },
  ].map(e => ({
    campaignId:  camp1._id.toString(),
    formId:      formA._id.toString(),
    ...e,
  }))

  // insertMany peut ignorer les doublons
  await auth(request.post('/api/evaluations/bulk'), hrCookie)
    .send({ evaluations: evaluationsToCreate })

  const tests = [
    {
      name: 'Manager1 — voit uniquement les évals de emp1 et emp2 (directs)',
      fn: async () => {
        const cookie = await login(request, 'manager1@nx.test')
        const res = await auth(request.get(`/api/evaluations?campaignId=${camp1._id}`), cookie)
        assert.strictEqual(res.status, 200)
        const evals = res.body.data || res.body
        const evaluateeIds = evals.map(e =>
          (e.evaluateeId?._id || e.evaluateeId)?.toString()
        )
        assert.ok(evaluateeIds.includes(emp1._id.toString()), 'Manager1 doit voir emp1')
        assert.ok(evaluateeIds.includes(emp2._id.toString()), 'Manager1 doit voir emp2')
        assert.ok(!evaluateeIds.includes(emp3._id.toString()), 'Manager1 ne doit PAS voir emp3')
        assert.ok(!evaluateeIds.includes(emp4._id.toString()), 'Manager1 ne doit PAS voir emp4')
      },
    },
    {
      name: 'Manager2 — voit uniquement les évals de emp3 et emp4 (directs)',
      fn: async () => {
        const cookie = await login(request, 'manager2@nx.test')
        const res = await auth(request.get(`/api/evaluations?campaignId=${camp1._id}`), cookie)
        assert.strictEqual(res.status, 200)
        const evals = res.body.data || res.body
        const evaluateeIds = evals.map(e =>
          (e.evaluateeId?._id || e.evaluateeId)?.toString()
        )
        assert.ok(evaluateeIds.includes(emp3._id.toString()), 'Manager2 doit voir emp3')
        assert.ok(evaluateeIds.includes(emp4._id.toString()), 'Manager2 doit voir emp4')
        assert.ok(!evaluateeIds.includes(emp1._id.toString()), 'Manager2 ne doit PAS voir emp1')
        assert.ok(!evaluateeIds.includes(emp2._id.toString()), 'Manager2 ne doit PAS voir emp2')
      },
    },
    {
      name: 'Senior_manager AVEC extendedVisibility — voit emp1, emp2, emp3, emp4 (indirect)',
      fn: async () => {
        const cookie = await login(request, 'senior_manager@nx.test')
        const res = await auth(request.get(`/api/evaluations?campaignId=${camp1._id}`), cookie)
        assert.strictEqual(res.status, 200)
        const evals = res.body.data || res.body
        const evaluateeIds = evals.map(e =>
          (e.evaluateeId?._id || e.evaluateeId)?.toString()
        )
        assert.ok(evaluateeIds.includes(emp1._id.toString()), 'Senior doit voir emp1 (indirect)')
        assert.ok(evaluateeIds.includes(emp2._id.toString()), 'Senior doit voir emp2 (indirect)')
        assert.ok(evaluateeIds.includes(emp3._id.toString()), 'Senior doit voir emp3 (indirect)')
        assert.ok(evaluateeIds.includes(emp4._id.toString()), 'Senior doit voir emp4 (indirect)')
      },
    },
    {
      name: 'Senior_manager SANS campagne (GET /) — voit manager1 et manager2 seulement (directs)',
      fn: async () => {
        const cookie = await login(request, 'senior_manager@nx.test')
        // GET /evaluations sans campaignId → pas d'extendedVisibility → directs uniquement
        const res = await auth(request.get('/api/evaluations'), cookie)
        assert.strictEqual(res.status, 200)
        const evals = res.body.data || res.body
        // Doit voir les évals où seniorManager est evaluatee ou evaluator OU ses directs
        // (manager1 et manager2 sont ses directs)
        const evaluateeIds = evals.map(e =>
          (e.evaluateeId?._id || e.evaluateeId)?.toString()
        )
        // emp1-emp4 NE DOIVENT PAS apparaître sans campagne (pas d'extendedVisibility)
        // manager1 et manager2 peuvent apparaître (directs de seniorManager)
        const hasIndirectEmps =
          evaluateeIds.includes(emp1._id.toString()) ||
          evaluateeIds.includes(emp2._id.toString()) ||
          evaluateeIds.includes(emp3._id.toString()) ||
          evaluateeIds.includes(emp4._id.toString())
        assert.ok(!hasIndirectEmps, 'Senior sans campagne ne doit pas voir emp1-emp4')
      },
    },
    {
      name: 'Employee emp1 — voit uniquement ses propres évals',
      fn: async () => {
        const cookie = await login(request, 'emp1@nx.test')
        const res = await auth(request.get(`/api/evaluations?campaignId=${camp1._id}`), cookie)
        assert.strictEqual(res.status, 200)
        const evals = res.body.data || res.body
        for (const e of evals) {
          const evaluatorId = (e.evaluatorId?._id || e.evaluatorId)?.toString()
          const evaluateeId = (e.evaluateeId?._id || e.evaluateeId)?.toString()
          assert.ok(
            evaluatorId === emp1._id.toString() || evaluateeId === emp1._id.toString(),
            `emp1 ne devrait pas voir l'éval ${e._id}`
          )
        }
      },
    },
    {
      name: 'Admin — voit toutes les évals (pas de filtre)',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const res = await auth(request.get(`/api/evaluations?campaignId=${camp1._id}`), cookie)
        assert.strictEqual(res.status, 200)
        const evals = res.body.data || res.body
        const evaluateeIds = evals.map(e =>
          (e.evaluateeId?._id || e.evaluateeId)?.toString()
        )
        assert.ok(evaluateeIds.includes(emp1._id.toString()), 'Admin doit voir emp1')
        assert.ok(evaluateeIds.includes(emp3._id.toString()), 'Admin doit voir emp3')
        assert.ok(evaluateeIds.includes(emp4._id.toString()), 'Admin doit voir emp4')
      },
    },
  ]

  return runTests(tests)
}

module.exports = { run }
