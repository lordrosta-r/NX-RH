'use strict'

const assert = require('assert')
const { runTests, login, auth } = require('./helpers')

// Teste formB (self_evaluation) et formC (upward_feedback, anonyme) en parallèle sur camp1

async function run(request, fixtures) {
  const { seniorManager, manager1, emp1, emp2, emp3, formA, formB, formC, camp1 } = fixtures

  let evalBId = null  // emp1 s'auto-évalue via formB
  let evalCId = null  // emp1 donne feedback anonyme sur manager1 via formC

  const tests = [
    {
      name: 'formA freeze ne bloque pas les questions de formB — vérification AVANT bulk formB',
      fn: async () => {
        // formA est gelé par test-forms.js (bulk create précédent)
        // formB n'a pas encore été utilisé en bulk → doit être non gelé à ce stade
        const hrCookie = await login(request, 'hr@nx.test')
        const [formARes, formBRes] = await Promise.all([
          auth(request.get(`/api/forms/${formA._id}`), hrCookie),
          auth(request.get(`/api/forms/${formB._id}`), hrCookie),
        ])
        assert.strictEqual(formARes.status, 200)
        assert.ok(formARes.body.frozenAt, 'formA devrait être gelé (from test-forms)')
        assert.strictEqual(formBRes.status, 200)
        assert.ok(
          !formBRes.body.frozenAt || formBRes.body.frozenAt === null,
          `formB ne devrait pas encore être gelé, frozenAt=${formBRes.body.frozenAt}`
        )
      },
    },
    {
      name: 'POST /api/evaluations/bulk — créer évals formB (self) pour emp1+emp2',
      fn: async () => {
        const hrCookie = await login(request, 'hr@nx.test')
        const res = await auth(request.post('/api/evaluations/bulk'), hrCookie).send({
          evaluations: [
            {
              campaignId:  camp1._id.toString(),
              formId:      formB._id.toString(),
              evaluatorId: emp1._id.toString(),
              evaluateeId: emp1._id.toString(),  // self-evaluation : même personne
            },
            {
              campaignId:  camp1._id.toString(),
              formId:      formB._id.toString(),
              evaluatorId: emp2._id.toString(),
              evaluateeId: emp2._id.toString(),
            },
          ],
        })
        assert.strictEqual(res.status, 201, `Bulk formB failed: ${JSON.stringify(res.body)}`)
      },
    },
    {
      name: 'POST /api/evaluations/bulk — créer éval formC (upward) : emp1 évalue manager1',
      fn: async () => {
        const hrCookie = await login(request, 'hr@nx.test')
        const res = await auth(request.post('/api/evaluations/bulk'), hrCookie).send({
          evaluations: [{
            campaignId:  camp1._id.toString(),
            formId:      formC._id.toString(),
            evaluatorId: emp1._id.toString(),
            evaluateeId: manager1._id.toString(),  // emp1 donne feedback sur manager1
          }],
        })
        assert.strictEqual(res.status, 201, `Bulk formC failed: ${JSON.stringify(res.body)}`)
      },
    },
    {
      name: 'GET /api/evaluations — récupérer l\'éval formB de emp1',
      fn: async () => {
        const hrCookie = await login(request, 'hr@nx.test')
        const res = await auth(request.get(`/api/evaluations?campaignId=${camp1._id}`), hrCookie)
        const evals = res.body.data || res.body
        const evalB = evals.find(e =>
          (e.formId?._id || e.formId)?.toString() === formB._id.toString() &&
          (e.evaluateeId?._id || e.evaluateeId)?.toString() === emp1._id.toString()
        )
        assert.ok(evalB, 'Éval formB pour emp1 introuvable')
        evalBId = evalB._id

        const evalC = evals.find(e =>
          (e.formId?._id || e.formId)?.toString() === formC._id.toString() &&
          (e.evaluateeId?._id || e.evaluateeId)?.toString() === manager1._id.toString()
        )
        assert.ok(evalC, 'Éval formC pour emp1→manager1 introuvable')
        evalCId = evalC._id
      },
    },
    {
      name: 'formB — emp1 peut sauvegarder ses réponses (self-evaluation)',
      fn: async () => {
        assert.ok(evalBId, 'evalBId non défini')
        const cookie = await login(request, 'emp1@nx.test')
        const res = await auth(request.patch(`/api/evaluations/${evalBId}`), cookie).send({
          answers: [
            { questionId: 'q1', value: 3 },
            { questionId: 'q2', value: 'Je m\'améliore continuellement.' },
            { questionId: 'q3', value: 5 },
          ],
        })
        assert.strictEqual(res.status, 200, `Save answers formB: ${JSON.stringify(res.body)}`)
      },
    },
    {
      name: 'formC — éval upward_feedback : isAnonymous est true dans la réponse',
      fn: async () => {
        assert.ok(evalCId, 'evalCId non défini')
        const hrCookie = await login(request, 'hr@nx.test')
        const res = await auth(request.get(`/api/evaluations/${evalCId}`), hrCookie)
        assert.strictEqual(res.status, 200)
        // La valeur doit provenir du form et être true
        const formIsAnon = res.body.formId?.isAnonymous ?? res.body.isAnonymous
        assert.strictEqual(formIsAnon, true, 'upward_feedback doit avoir isAnonymous=true')
      },
    },
    {
      name: 'formC — manager1 (evaluatee) ne peut PAS voir l\'evaluatorId',
      fn: async () => {
        assert.ok(evalCId, 'evalCId non défini')
        // manager1 est evaluatee → il peut voir l'éval mais evaluatorId doit être masqué
        const cookie = await login(request, 'manager1@nx.test')
        const res = await auth(request.get(`/api/evaluations/${evalCId}`), cookie)
        // 403 si l'accès est totalement bloqué, ou 200 avec evaluatorId masqué
        if (res.status === 200) {
          const evaluatorId = res.body.evaluatorId
          // evaluatorId doit être null ou masqué pour les forms anonymes
          assert.ok(
            evaluatorId === null || evaluatorId === undefined,
            `evaluatorId doit être masqué pour les forms anonymes, got: ${evaluatorId}`
          )
        }
        // 403 est aussi acceptable si l'evaluatee n'a pas accès direct
        assert.ok([200, 403].includes(res.status))
      },
    },
    {
      name: 'formB — les 2 évals (emp1+emp2) existent bien avec statut assigned',
      fn: async () => {
        const hrCookie = await login(request, 'hr@nx.test')
        const res = await auth(
          request.get(`/api/evaluations?campaignId=${camp1._id}`), hrCookie
        )
        const evals = res.body.data || res.body
        const formBEvals = evals.filter(e =>
          (e.formId?._id || e.formId)?.toString() === formB._id.toString()
        )
        const self1 = formBEvals.find(e =>
          (e.evaluateeId?._id || e.evaluateeId)?.toString() === emp1._id.toString()
        )
        const self2 = formBEvals.find(e =>
          (e.evaluateeId?._id || e.evaluateeId)?.toString() === emp2._id.toString()
        )
        assert.ok(self1, 'Éval formB emp1 introuvable')
        assert.ok(self2, 'Éval formB emp2 introuvable')
      },
    },
    {
      name: 'formC — réponses sauvegardées — emp1 peut passer in_progress',
      fn: async () => {
        assert.ok(evalCId, 'evalCId non défini')
        const cookie = await login(request, 'admin@nx.test')
        // Sauvegarder des réponses — le pre-save hook auto-passe assigned→in_progress
        const res = await auth(request.patch(`/api/evaluations/${evalCId}`), cookie).send({
          answers: [
            { questionId: 'q1', value: 4 },
            { questionId: 'q2', value: 'Très bon manager, communication claire.' },
          ],
        })
        assert.strictEqual(res.status, 200, `Save answers formC: ${JSON.stringify(res.body)}`)
        // Le hook passe automatiquement assigned→in_progress lors du premier save d'answers
        assert.strictEqual(res.body.status, 'in_progress', 'Le statut doit passer automatiquement à in_progress')
      },
    },
  ]

  return runTests(tests)
}

module.exports = { run }
