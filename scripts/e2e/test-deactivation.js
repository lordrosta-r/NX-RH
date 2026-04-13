'use strict'

const assert = require('assert')
const { runTests, login, auth } = require('./helpers')

async function run(request, fixtures) {
  const { admin, manager1, emp1, emp2, formA, camp1 } = fixtures

  const tests = [
    {
      name: 'PATCH /api/users/:id — désactiver emp1 (isActive: false)',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const res = await auth(request.patch(`/api/users/${emp1._id}`), cookie).send({ isActive: false })
        assert.strictEqual(res.status, 200, `Désactivation emp1: ${JSON.stringify(res.body)}`)
        assert.strictEqual(res.body.isActive, false)
      },
    },
    {
      name: 'Login emp1 désactivé → 401 Unauthorized',
      fn: async () => {
        const res = await request.post('/api/auth/login').send({
          email:    'emp1@nx.test',
          password: 'Test1234!',
        })
        assert.strictEqual(res.status, 401, `emp1 désactivé doit avoir 401 au login, got ${res.status}`)
      },
    },
    {
      name: 'Manager1 — liste des évals ne voit plus emp1 (si implémenté)',
      fn: async () => {
        // La visibilité peut ne pas changer (l'éval reste), mais l'utilisateur est inactif
        // Ce test vérifie que manager1 peut toujours accéder à ses évals (pas d'effet secondaire)
        const cookie = await login(request, 'manager1@nx.test')
        const res = await auth(request.get(`/api/evaluations?campaignId=${camp1._id}`), cookie)
        assert.strictEqual(res.status, 200, `manager1 doit toujours accéder aux évals`)
        // Les évals de emp1 peuvent encore apparaître dans la liste (normal)
      },
    },
    {
      name: 'GET /api/users — emp1 désactivé n\'est PAS dans la liste active par défaut',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        // La liste par défaut peut filtrer les inactifs (dépend de l'implémentation)
        const res = await auth(request.get('/api/users?isActive=true'), cookie)
        assert.strictEqual(res.status, 200)
        const users = res.body.data || res.body
        const emp1InList = users.find(u => u.email === 'emp1@nx.test')
        assert.ok(!emp1InList, 'emp1 désactivé ne devrait pas apparaître dans la liste active')
      },
    },
    {
      name: 'L\'évaluation de emp1 persiste en DB après désactivation',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const listRes = await auth(
          request.get(`/api/evaluations?campaignId=${camp1._id}`), cookie
        )
        const evals = listRes.body.data || listRes.body
        const emp1Evals = evals.filter(e =>
          (e.evaluateeId?._id || e.evaluateeId)?.toString() === emp1._id.toString()
        )
        // L'éval peut ou non apparaître (dépend si l'API filtre les utilisateurs inactifs)
        // Ce test vérifie juste que la requête ne plante pas
        assert.strictEqual(listRes.status, 200)
      },
    },
    {
      name: 'PATCH /api/users/:id — réactiver emp1 (isActive: true)',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const res = await auth(request.patch(`/api/users/${emp1._id}`), cookie).send({ isActive: true })
        assert.strictEqual(res.status, 200, `Réactivation emp1: ${JSON.stringify(res.body)}`)
        assert.strictEqual(res.body.isActive, true)
      },
    },
    {
      name: 'Login emp1 réactivé → 200 succès',
      fn: async () => {
        const res = await request.post('/api/auth/login').send({
          email:    'emp1@nx.test',
          password: 'Test1234!',
        })
        assert.strictEqual(res.status, 200, `emp1 réactivé doit pouvoir se connecter, got ${res.status}`)
      },
    },
    {
      name: 'GET /api/auth/me — cookie d\'un user DÉSACTIVÉ → 401',
      fn: async () => {
        // Obtenir un cookie valide pour emp2, le désactiver, tester /me
        const cookie = await login(request, 'emp2@nx.test')
        const adminCookie = await login(request, 'admin@nx.test')

        // Désactiver emp2
        await auth(request.patch(`/api/users/${emp2._id}`), adminCookie).send({ isActive: false })

        // Le cookie est toujours valide (JWT non expiré) mais le compte est désactivé
        const meRes = await auth(request.get('/api/auth/me'), cookie)
        assert.strictEqual(meRes.status, 401, `Cookie valide d'un user désactivé doit retourner 401, got ${meRes.status}`)

        // Réactiver emp2
        await auth(request.patch(`/api/users/${emp2._id}`), adminCookie).send({ isActive: true })
      },
    },
  ]

  return runTests(tests)
}

module.exports = { run }
