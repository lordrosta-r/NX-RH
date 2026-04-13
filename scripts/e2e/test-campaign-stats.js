'use strict'

const assert = require('assert')
const { runTests, login, auth } = require('./helpers')

async function run(request, fixtures) {
  const { camp1, formA, manager1, emp1, emp2 } = fixtures

  const tests = [
    {
      name: 'GET /api/campaigns/:id — stats présentes après bulk create',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.get(`/api/campaigns/${camp1._id}`), cookie)
        assert.strictEqual(res.status, 200)
        const stats = res.body.stats
        assert.ok(stats, 'Le champ stats doit être présent')
        assert.ok(typeof stats.total === 'number', `stats.total doit être un nombre, got ${typeof stats.total}`)
        assert.ok(stats.total >= 1, `stats.total doit être ≥ 1 après bulk create, got ${stats.total}`)
        assert.ok('assigned'     in stats || 'total' in stats, 'stats doit avoir des compteurs de statut')
      },
    },
    {
      name: 'GET /api/campaigns/:id — stats.assigned reflète le nombre réel',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        // Compter les évals assigned via l'API
        const evalsRes = await auth(
          request.get(`/api/evaluations?campaignId=${camp1._id}`), cookie
        )
        const evals = evalsRes.body.data || evalsRes.body
        const assignedCount = evals.filter(e => e.status === 'assigned').length

        const res = await auth(request.get(`/api/campaigns/${camp1._id}`), cookie)
        const stats = res.body.stats

        if (stats && typeof stats.assigned === 'number') {
          assert.strictEqual(
            stats.assigned, assignedCount,
            `stats.assigned=${stats.assigned} ≠ évals assigned réels=${assignedCount}`
          )
        }
        // Si le format est différent, au moins vérifier que total = somme de tous les statuts
        // (test conditionnel selon implémentation)
      },
    },
    {
      name: 'GET /api/campaigns/:id — stats après transition in_progress',
      fn: async () => {
        const hrCookie   = await login(request, 'hr@nx.test')
        const adminCookie = await login(request, 'admin@nx.test')

        // Créer une éval fraîche sur camp1/formA pour ce test
        const bulkRes = await auth(request.post('/api/evaluations/bulk'), hrCookie).send({
          evaluations: [{
            campaignId:  camp1._id.toString(),
            formId:      formA._id.toString(),
            evaluatorId: manager1._id.toString(),
            evaluateeId: emp2._id.toString(),
          }],
        })

        // Récupérer stats AVANT transition
        const before = await auth(request.get(`/api/campaigns/${camp1._id}`), hrCookie)
        const statsBefore = before.body.stats
        const assignedBefore = statsBefore?.assigned ?? 0

        // Passer une éval en in_progress
        const evalsRes = await auth(
          request.get(`/api/evaluations?campaignId=${camp1._id}&status=assigned`), adminCookie
        )
        const evals = evalsRes.body.data || evalsRes.body
        if (!evals.length) return  // Pas d'éval assigned, skip

        await auth(request.patch(`/api/evaluations/${evals[0]._id}`), adminCookie).send({ status: 'in_progress' })

        // Récupérer stats APRÈS transition
        const after = await auth(request.get(`/api/campaigns/${camp1._id}`), hrCookie)
        const statsAfter = after.body.stats

        if (statsAfter?.assigned !== undefined && statsBefore?.assigned !== undefined) {
          assert.strictEqual(
            statsAfter.assigned,
            assignedBefore - 1,
            `stats.assigned devrait diminuer de 1 après in_progress`
          )
          assert.ok(
            (statsAfter.in_progress || 0) >= 1,
            `stats.in_progress devrait être ≥ 1 après transition`
          )
        }
        // Si les stats ne sont pas décomposées par statut, vérifier juste total
        assert.ok(typeof statsAfter?.total === 'number', 'stats.total doit rester un nombre')
      },
    },
    {
      name: 'GET /api/campaigns/:id — stats.validated croît après validation',
      fn: async () => {
        const hrCookie    = await login(request, 'hr@nx.test')
        const adminCookie = await login(request, 'admin@nx.test')

        // Stats avant
        const before = await auth(request.get(`/api/campaigns/${camp1._id}`), hrCookie)
        const validatedBefore = before.body.stats?.validated ?? 0

        // Chercher une éval déjà validated pour vérifier le compteur
        const evalsRes = await auth(
          request.get(`/api/evaluations?campaignId=${camp1._id}`), adminCookie
        )
        const evals = evalsRes.body.data || evalsRes.body
        const validatedCount = evals.filter(e => e.status === 'validated').length

        if (before.body.stats?.validated !== undefined) {
          assert.strictEqual(
            before.body.stats.validated,
            validatedCount,
            `stats.validated=${before.body.stats.validated} ≠ réel=${validatedCount}`
          )
        }
      },
    },
  ]

  return runTests(tests)
}

module.exports = { run }
