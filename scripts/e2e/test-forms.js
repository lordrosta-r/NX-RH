'use strict'

const assert = require('assert')
const { runTests, login, auth } = require('./helpers')

async function run(request, fixtures) {
  const { hr, emp1, formA, formB, formC, camp1 } = fixtures

  let frozenFormId = null  // sera peuplé après bulk create

  const tests = [
    {
      name: 'GET /api/forms — liste les 3 forms créés',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.get('/api/forms'), cookie)
        assert.strictEqual(res.status, 200)
        const forms = res.body.data || res.body
        const e2eForms = forms.filter(f => f.title.startsWith('[E2E]'))
        assert.ok(e2eForms.length >= 3, `Attendu ≥ 3 forms E2E, got ${e2eForms.length}`)
      },
    },
    {
      name: 'GET /api/forms/:id — retourne Form A complet',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.get(`/api/forms/${formA._id}`), cookie)
        assert.strictEqual(res.status, 200)
        assert.strictEqual(res.body.formType, 'manager_evaluation')
        assert.ok(Array.isArray(res.body.questions))
        assert.strictEqual(res.body.questions.length, 4)
      },
    },
    {
      name: 'GET /api/forms/:id — Form A a les 4 types de questions (rating, text, yes_no, choice)',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.get(`/api/forms/${formA._id}`), cookie)
        const types = res.body.questions.map(q => q.type)
        assert.ok(types.includes('rating'),  'Manque question rating')
        assert.ok(types.includes('text'),    'Manque question text')
        assert.ok(types.includes('yes_no'),  'Manque question yes_no')
        assert.ok(types.includes('choice'),  'Manque question choice')
      },
    },
    {
      name: 'Form C (upward_feedback) — isAnonymous forcé à true',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.get(`/api/forms/${formC._id}`), cookie)
        assert.strictEqual(res.status, 200)
        assert.strictEqual(res.body.formType, 'upward_feedback')
        assert.strictEqual(res.body.isAnonymous, true, 'upward_feedback doit forcer isAnonymous=true')
      },
    },
    {
      name: 'Form A (manager_evaluation) — isAnonymous est false',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.get(`/api/forms/${formA._id}`), cookie)
        assert.strictEqual(res.body.isAnonymous, false)
      },
    },
    {
      name: 'POST /api/forms — HR peut créer un nouveau form',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.post('/api/forms'), cookie).send({
          title: '[E2E] Form Temporaire',
          formType: 'peer_review',
          campaignId: camp1._id.toString(),
          questions: [{ id: 'q1', type: 'text', label: 'Question test', required: true }],
        })
        assert.strictEqual(res.status, 201)
        assert.ok(res.body.id || res.body._id)
      },
    },
    {
      name: 'POST /api/forms — type invalide → 400',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.post('/api/forms'), cookie).send({
          title: '[E2E] Form invalide',
          formType: 'type_inexistant',
          campaignId: fixtures.camp1._id.toString(),
          questions: [],
        })
        assert.ok([400, 422].includes(res.status), `Expected 400/422, got ${res.status}`)
      },
    },
    {
      name: 'PATCH /api/forms/:id — modifier le title est toujours possible',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.patch(`/api/forms/${formB._id}`), cookie).send({
          title: '[E2E] Self Evaluation (modifié)',
        })
        assert.strictEqual(res.status, 200)
      },
    },
    {
      name: 'PATCH /api/forms/:id — modifier les questions AVANT freeze est possible',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        // formB n'a pas encore d'évaluations → pas gelé
        const res = await auth(request.patch(`/api/forms/${formB._id}`), cookie).send({
          questions: [
            { id: 'q1', type: 'rating', label: 'Modifié', required: true, scale: 5 },
            { id: 'q2', type: 'text', label: 'Texte', required: false },
          ],
        })
        assert.strictEqual(res.status, 200)
      },
    },
    {
      name: 'Bulk create sur formA → formA devient gelé (frozenAt non null)',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        // Créer 1 évaluation sur formA pour déclencher le freeze
        const { manager2, emp4 } = fixtures
        const res = await auth(request.post('/api/evaluations/bulk'), cookie).send({
          evaluations: [{
            campaignId:  camp1._id.toString(),
            formId:      formA._id.toString(),
            evaluatorId: manager2._id.toString(),
            evaluateeId: emp4._id.toString(),
          }],
        })
        assert.strictEqual(res.status, 201, `Bulk create failed: ${JSON.stringify(res.body)}`)
        frozenFormId = formA._id.toString()
      },
    },
    {
      name: 'PATCH /api/forms/:id — modifier les questions APRÈS freeze → 409',
      fn: async () => {
        if (!frozenFormId) return  // dépend du test précédent
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.patch(`/api/forms/${frozenFormId}`), cookie).send({
          questions: [
            { id: 'q1_new', type: 'text', label: 'Question modifiée', required: true },
          ],
        })
        assert.strictEqual(res.status, 409, `Expected 409 (frozen), got ${res.status}: ${JSON.stringify(res.body)}`)
      },
    },
    {
      name: 'PATCH /api/forms/:id — modifier title APRÈS freeze reste possible',
      fn: async () => {
        if (!frozenFormId) return
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.patch(`/api/forms/${frozenFormId}`), cookie).send({
          title: '[E2E] Manager Evaluation (titre ok après freeze)',
        })
        assert.strictEqual(res.status, 200)
      },
    },
  ]

  return runTests(tests)
}

module.exports = { run }
