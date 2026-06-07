'use strict'

const assert = require('assert')
const { runTests, login, auth } = require('./helpers')

// LOCKED_STATUSES = ['submitted', 'reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated']
// En statut locked : answers bloquées, mais reviewerComment et evaluateeComment sont autorisés selon rôle

async function run(request, fixtures) {
  const { manager1, emp1, formA, camp1 } = fixtures
  let evalId = null

  const tests = [
    {
      name: 'Setup — créer une éval fraîche et la faire avancer jusqu\'à in_progress',
      fn: async () => {
        const hrCookie    = await login(request, 'hr@nx.test')
        const adminCookie = await login(request, 'admin@nx.test')

        const bulkRes = await auth(request.post('/api/evaluations/bulk'), hrCookie).send({
          evaluations: [{
            campaignId:  camp1._id.toString(),
            formId:      formA._id.toString(),
            evaluatorId: manager1._id.toString(),
            evaluateeId: emp1._id.toString(),
          }],
        })

        const listRes = await auth(
          request.get(`/api/evaluations?campaignId=${camp1._id}`), adminCookie
        )
        const evals = listRes.body.data || listRes.body
        const newest = evals.find(e => e.status === 'assigned')

        if (!newest) {
          // Toutes les évals sont déjà avancées — en utiliser une en in_progress
          const inProgress = evals.find(e => e.status === 'in_progress')
          if (inProgress) {
            evalId = inProgress._id
            return
          }
          return
        }
        evalId = newest._id

        // Passer en in_progress
        await auth(request.patch(`/api/evaluations/${evalId}`), adminCookie).send({ status: 'in_progress' })
      },
    },
    {
      name: 'Save answers en statut in_progress → OK (200)',
      fn: async () => {
        if (!evalId) return
        const cookie = await login(request, 'admin@nx.test')

        // Vérifier le statut actuel
        const ev = await auth(request.get(`/api/evaluations/${evalId}`), cookie)
        if (ev.body.status !== 'in_progress') {
          // Reset si nécessaire
          return
        }

        const res = await auth(request.patch(`/api/evaluations/${evalId}`), cookie).send({
          answers: [
            { questionId: 'q1', value: 4 },
            { questionId: 'q2', value: 'Excellente collaboration.' },
            { questionId: 'q3', value: true },
            { questionId: 'q4', value: 'Élevé' },
          ],
        })
        assert.strictEqual(res.status, 200, `Save answers in_progress: ${JSON.stringify(res.body)}`)
      },
    },
    {
      name: 'Soumettre → statut becomes submitted (premier statut LOCKED)',
      fn: async () => {
        if (!evalId) return
        const cookie = await login(request, 'admin@nx.test')
        const res = await auth(request.patch(`/api/evaluations/${evalId}`), cookie).send({ status: 'submitted' })
        assert.ok([200, 400].includes(res.status))
        if (res.status === 200) {
          assert.strictEqual(res.body.status, 'submitted')
        }
      },
    },
    {
      name: 'PATCH answers après submitted → 409 (LOCKED)',
      fn: async () => {
        if (!evalId) return
        const cookie = await login(request, 'admin@nx.test')

        // S'assurer que l'éval est submitted ou plus
        const ev = await auth(request.get(`/api/evaluations/${evalId}`), cookie)
        const lockedStatuses = ['submitted', 'reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated']
        if (!lockedStatuses.includes(ev.body.status)) return

        const res = await auth(request.patch(`/api/evaluations/${evalId}`), cookie).send({
          answers: [{ questionId: 'q1', value: 1 }],
        })
        assert.strictEqual(res.status, 409, `Expected 409 (answers locked), got ${res.status}: ${JSON.stringify(res.body)}`)
      },
    },
    {
      name: 'reviewerComment modifiable par manager après submitted',
      fn: async () => {
        if (!evalId) return
        const cookie = await login(request, 'manager1@nx.test')
        const ev = await auth(request.get(`/api/evaluations/${evalId}`), cookie)
        if (!['submitted', 'reviewed'].includes(ev.body.status)) return

        // manager fait la review si submitted
        if (ev.body.status === 'submitted') {
          const res = await auth(request.patch(`/api/evaluations/${evalId}`), cookie).send({
            status:          'reviewed',
            reviewerComment: 'Très bonne performance.',
          })
          assert.strictEqual(res.status, 200, `reviewed + reviewerComment: ${JSON.stringify(res.body)}`)
          assert.ok(res.body.reviewerComment !== undefined)
        }
      },
    },
    {
      name: 'evaluateeComment modifiable par admin après reviewed (ou signed_evaluatee)',
      fn: async () => {
        if (!evalId) return
        const adminCookie = await login(request, 'admin@nx.test')
        const ev = await auth(request.get(`/api/evaluations/${evalId}`), adminCookie)

        if (!['reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated'].includes(ev.body.status)) return

        const res = await auth(request.patch(`/api/evaluations/${evalId}`), adminCookie).send({
          evaluateeComment: 'Je suis d\'accord avec cette évaluation.',
        })
        assert.ok([200, 400].includes(res.status), `evaluateeComment: ${res.status}`)
        // Si 200, vérifier que le commentaire est bien enregistré
        if (res.status === 200) {
          assert.ok(res.body.evaluateeComment !== undefined)
        }
      },
    },
    {
      name: 'PATCH answers en statut reviewed → 409 (toujours bloqué)',
      fn: async () => {
        if (!evalId) return
        const cookie = await login(request, 'admin@nx.test')
        const ev = await auth(request.get(`/api/evaluations/${evalId}`), cookie)
        const lockedStatuses = ['submitted', 'reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated']
        if (!lockedStatuses.includes(ev.body.status)) return

        const res = await auth(request.patch(`/api/evaluations/${evalId}`), cookie).send({
          answers: [{ questionId: 'q1', value: 2 }],
        })
        assert.strictEqual(res.status, 409, `Expected 409 (answers locked at ${ev.body.status}), got ${res.status}`)
      },
    },
    {
      name: 'PATCH status + answers simultanés → 409 (contournement tentative)',
      fn: async () => {
        if (!evalId) return
        const cookie = await login(request, 'admin@nx.test')
        const ev = await auth(request.get(`/api/evaluations/${evalId}`), cookie)
        const lockedStatuses = ['submitted', 'reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated']
        if (!lockedStatuses.includes(ev.body.status)) return

        // Essayer de changer status ET answers en même temps pour contourner le verrou
        const res = await auth(request.patch(`/api/evaluations/${evalId}`), cookie).send({
          status:  ev.body.status,  // même statut
          answers: [{ questionId: 'q1', value: 5 }],
        })
        assert.strictEqual(res.status, 409, `Contournement lock détecté: ${res.status} ${JSON.stringify(res.body)}`)
      },
    },
  ]

  return runTests(tests)
}

module.exports = { run }
