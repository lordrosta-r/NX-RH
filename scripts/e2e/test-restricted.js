'use strict'

const assert = require('assert')
const { runTests, login, auth } = require('./helpers')

// Teste restrictedToManagers :
// Par défaut camp1 a restrictedToManagers: [] (senior voit tout)
// On PATCH camp1 pour restreindre senior_manager à [manager1] → ne voit que emp1+emp2

async function run(request, fixtures) {
  const { seniorManager, manager1, manager2, emp1, emp2, emp3, emp4, camp1, formA } = fixtures

  // S'assurer que les évals existent pour emp1-emp4
  const hrCookie = await login(request, 'hr@nx.test')
  const evaluationsToCreate = [
    { evaluatorId: manager1._id.toString(), evaluateeId: emp1._id.toString() },
    { evaluatorId: manager1._id.toString(), evaluateeId: emp2._id.toString() },
    { evaluatorId: manager2._id.toString(), evaluateeId: emp3._id.toString() },
    { evaluatorId: manager2._id.toString(), evaluateeId: emp4._id.toString() },
  ].map(e => ({
    campaignId: camp1._id.toString(),
    formId:     formA._id.toString(),
    ...e,
  }))
  await auth(request.post('/api/evaluations/bulk'), hrCookie)
    .send({ evaluations: evaluationsToCreate })

  const tests = [
    {
      name: 'Baseline — senior_manager voit emp1+emp2+emp3+emp4 (restriction vide)',
      fn: async () => {
        const cookie = await login(request, 'senior_manager@nx.test')
        const res = await auth(request.get(`/api/evaluations?campaignId=${camp1._id}`), cookie)
        assert.strictEqual(res.status, 200)
        const ids = (res.body.data || res.body).map(e =>
          (e.evaluateeId?._id || e.evaluateeId)?.toString()
        )
        assert.ok(ids.includes(emp1._id.toString()), 'emp1 visible avant restriction')
        assert.ok(ids.includes(emp3._id.toString()), 'emp3 visible avant restriction')
      },
    },
    {
      name: 'PATCH camp1 — restreindre senior_manager à la branche manager1 seulement',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.patch(`/api/campaigns/${camp1._id}`), cookie).send({
          extendedVisibility: [{
            managerId:            seniorManager._id.toString(),
            restrictedToManagers: [manager1._id.toString()],
          }],
        })
        assert.strictEqual(res.status, 200, `PATCH camp1 failed: ${JSON.stringify(res.body)}`)
        // Vérifier que la restriction est bien enregistrée
        const campRes = await auth(request.get(`/api/campaigns/${camp1._id}`), cookie)
        const ev = campRes.body.extendedVisibility?.[0]
        assert.ok(ev, 'extendedVisibility doit être présent')
        assert.strictEqual(ev.restrictedToManagers?.length, 1, 'restrictedToManagers doit avoir 1 entrée')
      },
    },
    {
      name: 'Senior_manager AVEC restriction — voit emp1+emp2 mais PAS emp3+emp4',
      fn: async () => {
        const cookie = await login(request, 'senior_manager@nx.test')
        const res = await auth(request.get(`/api/evaluations?campaignId=${camp1._id}`), cookie)
        assert.strictEqual(res.status, 200)
        const ids = (res.body.data || res.body).map(e =>
          (e.evaluateeId?._id || e.evaluateeId)?.toString()
        )
        assert.ok(ids.includes(emp1._id.toString()),  'emp1 doit être visible (branche autorisée)')
        assert.ok(ids.includes(emp2._id.toString()),  'emp2 doit être visible (branche autorisée)')
        assert.ok(!ids.includes(emp3._id.toString()), 'emp3 ne doit PAS être visible (branche restreinte)')
        assert.ok(!ids.includes(emp4._id.toString()), 'emp4 ne doit PAS être visible (branche restreinte)')
      },
    },
    {
      name: 'Manager2 — restriction senior ne l\'affecte pas, voit toujours emp3+emp4',
      fn: async () => {
        const cookie = await login(request, 'manager2@nx.test')
        const res = await auth(request.get(`/api/evaluations?campaignId=${camp1._id}`), cookie)
        assert.strictEqual(res.status, 200)
        const ids = (res.body.data || res.body).map(e =>
          (e.evaluateeId?._id || e.evaluateeId)?.toString()
        )
        assert.ok(ids.includes(emp3._id.toString()), 'Manager2 doit toujours voir emp3')
        assert.ok(ids.includes(emp4._id.toString()), 'Manager2 doit toujours voir emp4')
      },
    },
    {
      name: 'Restaurer camp1 — suppression de la restriction (restrictedToManagers: [])',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.patch(`/api/campaigns/${camp1._id}`), cookie).send({
          extendedVisibility: [{
            managerId:            seniorManager._id.toString(),
            restrictedToManagers: [],
          }],
        })
        assert.strictEqual(res.status, 200, `Restore camp1 failed: ${JSON.stringify(res.body)}`)
      },
    },
    {
      name: 'Senior_manager APRÈS restauration — revoit emp1+emp2+emp3+emp4',
      fn: async () => {
        const cookie = await login(request, 'senior_manager@nx.test')
        const res = await auth(request.get(`/api/evaluations?campaignId=${camp1._id}`), cookie)
        assert.strictEqual(res.status, 200)
        const ids = (res.body.data || res.body).map(e =>
          (e.evaluateeId?._id || e.evaluateeId)?.toString()
        )
        assert.ok(ids.includes(emp1._id.toString()), 'emp1 visible après restauration')
        assert.ok(ids.includes(emp3._id.toString()), 'emp3 visible après restauration')
      },
    },
  ]

  return runTests(tests)
}

module.exports = { run }
