'use strict'

const assert = require('assert')
const { runTests, login, auth } = require('./helpers')

// ROLE_TRANSITIONS.director = { submitted: 'reviewed', signed_evaluatee: 'signed_manager' }
// ROLE_TRANSITIONS.hr = { reviewed: 'signed_hr', signed_evaluatee: 'signed_hr', signed_manager: 'signed_hr' }

async function run(request, fixtures) {
  const { directeur, manager1, emp1, formA, camp1 } = fixtures

  let directorEvalId = null  // éval pour le flux director
  let hrBypassEvalId = null  // éval pour le bypass HR

  const tests = [
    // Préparer des évals spécifiques pour ce module
    {
      name: 'Setup — créer des évals fraîches pour les tests director + HR bypass',
      fn: async () => {
        const hrCookie = await login(request, 'hr@nx.test')
        const adminCookie = await login(request, 'admin@nx.test')

        // Créer 2 évals sur camp1/formA pour emp1
        // Récupérer les évals existantes
        const listRes = await auth(
          request.get(`/api/evaluations?campaignId=${camp1._id}`), adminCookie
        )
        const evals = listRes.body.data || listRes.body

        // Chercher une éval assigned pour le flux director
        const assignedEval = evals.find(e => e.status === 'assigned')
        if (assignedEval) {
          directorEvalId = assignedEval._id
        }

        // Chercher une éval soumise pour le bypass HR
        const submittedEval = evals.find(e => e.status === 'submitted')
        if (submittedEval) {
          hrBypassEvalId = submittedEval._id
        }

        // Si pas d'éval dans le bon statut, créer et faire progresser
        if (!directorEvalId) {
          const bulkRes = await auth(request.post('/api/evaluations/bulk'), hrCookie).send({
            evaluations: [{
              campaignId:  camp1._id.toString(),
              formId:      formA._id.toString(),
              evaluatorId: manager1._id.toString(),
              evaluateeId: emp1._id.toString(),
            }],
          })
          if (bulkRes.status === 201) {
            const newListRes = await auth(
              request.get(`/api/evaluations?campaignId=${camp1._id}`), adminCookie
            )
            const newEvals = newListRes.body.data || newListRes.body
            const newest = newEvals.find(e => e.status === 'assigned')
            if (newest) directorEvalId = newest._id
          }
        }
      },
    },
    // ─── Director workflow ────────────────────────────────────────────────────
    {
      name: 'Director — passe assigned → in_progress (admin fait la progression)',
      fn: async () => {
        if (!directorEvalId) return
        const adminCookie = await login(request, 'admin@nx.test')
        // admin fait avancer jusqu'à signed_evaluatee pour que director puisse signer
        const e = await auth(request.get(`/api/evaluations/${directorEvalId}`), adminCookie)
        const currentStatus = e.body.status

        if (currentStatus === 'assigned') {
          await auth(request.patch(`/api/evaluations/${directorEvalId}`), adminCookie).send({
            answers: [{ questionId: 'q1', value: 3 }, { questionId: 'q2', value: 'Test' }],
          })
          await auth(request.patch(`/api/evaluations/${directorEvalId}`), adminCookie).send({ status: 'in_progress' })
          await auth(request.patch(`/api/evaluations/${directorEvalId}`), adminCookie).send({ status: 'submitted' })
          await auth(request.patch(`/api/evaluations/${directorEvalId}`), adminCookie).send({ status: 'reviewed' })
          await auth(request.patch(`/api/evaluations/${directorEvalId}`), adminCookie).send({ status: 'signed_evaluatee' })
        }

        const ev = await auth(request.get(`/api/evaluations/${directorEvalId}`), adminCookie)
        assert.ok(
          ['signed_evaluatee', 'signed_manager', 'signed_hr', 'validated'].includes(ev.body.status),
          `Éval doit être avancée, got: ${ev.body.status}`
        )
      },
    },
    {
      name: 'Director — signed_evaluatee → signed_manager (transition director autorisée)',
      fn: async () => {
        if (!directorEvalId) return
        const adminCookie = await login(request, 'admin@nx.test')
        const e = await auth(request.get(`/api/evaluations/${directorEvalId}`), adminCookie)

        if (e.body.status !== 'signed_evaluatee') {
          // Déjà plus avancé, skip
          return
        }

        const cookie = await login(request, 'directeur@nx.test')
        const res = await auth(request.patch(`/api/evaluations/${directorEvalId}`), cookie)
          .send({ status: 'signed_manager' })
        assert.strictEqual(res.status, 200, `Director signed_manager: ${JSON.stringify(res.body)}`)
        assert.strictEqual(res.body.status, 'signed_manager')
      },
    },
    // ─── HR Bypass ────────────────────────────────────────────────────────────
    {
      name: 'HR Bypass — reviewed → signed_hr sans passer par signed_evaluatee+signed_manager',
      fn: async () => {
        if (!hrBypassEvalId) {
          // Créer et faire progresser jusqu'à reviewed
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
          if (bulkRes.status === 201) {
            const listRes = await auth(
              request.get(`/api/evaluations?campaignId=${camp1._id}`), adminCookie
            )
            const newest = (listRes.body.data || listRes.body).find(e => e.status === 'assigned')
            if (newest) {
              hrBypassEvalId = newest._id
              await auth(request.patch(`/api/evaluations/${hrBypassEvalId}`), adminCookie).send({
                answers: [{ questionId: 'q1', value: 4 }],
              })
              await auth(request.patch(`/api/evaluations/${hrBypassEvalId}`), adminCookie).send({ status: 'in_progress' })
              await auth(request.patch(`/api/evaluations/${hrBypassEvalId}`), adminCookie).send({ status: 'submitted' })
              await auth(request.patch(`/api/evaluations/${hrBypassEvalId}`), adminCookie).send({ status: 'reviewed' })
            }
          }
        }

        if (!hrBypassEvalId) return

        // Vérifier le statut actuel
        const adminCookie = await login(request, 'admin@nx.test')
        const e = await auth(request.get(`/api/evaluations/${hrBypassEvalId}`), adminCookie)
        if (e.body.status !== 'reviewed') return

        // HR bypass : reviewed → signed_hr directement
        const hrCookie = await login(request, 'hr@nx.test')
        const res = await auth(request.patch(`/api/evaluations/${hrBypassEvalId}`), hrCookie)
          .send({ status: 'signed_hr' })
        assert.strictEqual(res.status, 200, `HR bypass reviewed→signed_hr: ${JSON.stringify(res.body)}`)
        assert.strictEqual(res.body.status, 'signed_hr')
      },
    },
    {
      name: 'HR Bypass — signed_evaluatee → signed_hr (sans signed_manager)',
      fn: async () => {
        // Créer une éval fraîche et la faire avancer jusqu'à signed_evaluatee
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
        const newest = (listRes.body.data || listRes.body).find(e => e.status === 'assigned')
        if (!newest) return

        const eid = newest._id
        await auth(request.patch(`/api/evaluations/${eid}`), adminCookie).send({
          answers: [{ questionId: 'q1', value: 5 }],
        })
        await auth(request.patch(`/api/evaluations/${eid}`), adminCookie).send({ status: 'in_progress' })
        await auth(request.patch(`/api/evaluations/${eid}`), adminCookie).send({ status: 'submitted' })
        await auth(request.patch(`/api/evaluations/${eid}`), adminCookie).send({ status: 'reviewed' })
        await auth(request.patch(`/api/evaluations/${eid}`), adminCookie).send({ status: 'signed_evaluatee' })

        // HR → signed_hr directement (bypass signed_manager)
        const res = await auth(request.patch(`/api/evaluations/${eid}`), hrCookie)
          .send({ status: 'signed_hr' })
        assert.strictEqual(res.status, 200, `HR bypass signed_evaluatee→signed_hr: ${JSON.stringify(res.body)}`)
        assert.strictEqual(res.body.status, 'signed_hr')
      },
    },
    {
      name: 'Director — transition interdite (director ne peut PAS passer submitted → signed_hr)',
      fn: async () => {
        // Director n'a que submitted→reviewed et signed_evaluatee→signed_manager
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
        const newest = (listRes.body.data || listRes.body).find(e => e.status === 'assigned')
        if (!newest) return

        const eid = newest._id
        await auth(request.patch(`/api/evaluations/${eid}`), adminCookie).send({
          answers: [{ questionId: 'q1', value: 3 }],
        })
        await auth(request.patch(`/api/evaluations/${eid}`), adminCookie).send({ status: 'in_progress' })
        await auth(request.patch(`/api/evaluations/${eid}`), adminCookie).send({ status: 'submitted' })

        // Director essaie signed_hr → doit être refusé
        const dirCookie = await login(request, 'directeur@nx.test')
        const res = await auth(request.patch(`/api/evaluations/${eid}`), dirCookie)
          .send({ status: 'signed_hr' })
        assert.strictEqual(res.status, 400, `Director ne doit pas passer submitted→signed_hr, got ${res.status}`)
      },
    },
  ]

  return runTests(tests)
}

module.exports = { run }
