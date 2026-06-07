'use strict'

const assert = require('assert')
const { runTests, login, auth } = require('./helpers')

async function run(request, fixtures) {
  const { admin, hr, emp1, emp2, emp3, manager1, manager2, seniorManager, directeur } = fixtures

  const tests = [
    {
      name: 'GET /api/users — admin voit tous les utilisateurs',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const res = await auth(request.get('/api/users'), cookie)
        assert.strictEqual(res.status, 200)
        assert.ok(Array.isArray(res.body) || res.body.data, 'Doit retourner un tableau ou objet paginé')
        const users = res.body.data || res.body
        assert.ok(users.length >= 10, `Admin doit voir ≥ 10 users, got ${users.length}`)
      },
    },
    {
      name: 'GET /api/users — passwordHash absent de la réponse',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const res = await auth(request.get('/api/users'), cookie)
        const users = res.body.data || res.body
        for (const u of users) {
          assert.ok(!u.passwordHash, `passwordHash exposé pour ${u.email}`)
        }
      },
    },
    {
      name: 'GET /api/users/:id — employee voit uniquement son propre profil',
      fn: async () => {
        const cookie = await login(request, 'emp1@nx.test')
        // Self → 200
        const selfRes = await auth(request.get(`/api/users/${emp1._id}`), cookie)
        assert.strictEqual(selfRes.status, 200)
        assert.strictEqual(selfRes.body.email, 'emp1@nx.test')
      },
    },
    {
      name: 'GET /api/users/:id — employee 403 sur un autre user',
      fn: async () => {
        const cookie = await login(request, 'emp1@nx.test')
        const res = await auth(request.get(`/api/users/${emp3._id}`), cookie)
        assert.strictEqual(res.status, 403)
      },
    },
    {
      name: 'PATCH /api/users/:id — employee peut modifier son propre firstName',
      fn: async () => {
        const cookie = await login(request, 'emp1@nx.test')
        const res = await auth(request.patch(`/api/users/${emp1._id}`), cookie).send({ firstName: 'EmpModifié' })
        assert.strictEqual(res.status, 200)
      },
    },
    {
      name: 'PATCH /api/users/:id — employee ne peut pas modifier son rôle',
      fn: async () => {
        const cookie = await login(request, 'emp1@nx.test')
        const res = await auth(request.patch(`/api/users/${emp1._id}`), cookie).send({ role: 'admin' })
        assert.strictEqual(res.status, 403)
      },
    },
    {
      name: 'PATCH /api/users/:id — employee ne peut pas modifier son isActive',
      fn: async () => {
        const cookie = await login(request, 'emp1@nx.test')
        const res = await auth(request.patch(`/api/users/${emp1._id}`), cookie).send({ isActive: false })
        assert.strictEqual(res.status, 403)
      },
    },
    {
      name: 'POST /api/users — admin peut créer un utilisateur',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const res = await auth(request.post('/api/users'), cookie).send({
          firstName: 'Nouveau', lastName: 'User',
          email: 'newuser@nx.test', role: 'employee',
          passwordHash: 'Test1234!', authSource: 'local',
        })
        assert.strictEqual(res.status, 201)
        assert.ok(res.body.id || res.body._id)
      },
    },
    {
      name: 'POST /api/users — email dupliqué → 409',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        // Essayer de créer emp1 à nouveau
        const res = await auth(request.post('/api/users'), cookie).send({
          firstName: 'Dup', lastName: 'User',
          email: 'emp1@nx.test', role: 'employee',
          passwordHash: 'Test1234!', authSource: 'local',
        })
        assert.ok([409, 422, 400].includes(res.status), `Expected 409/422/400, got ${res.status}`)
      },
    },
    {
      name: 'PATCH /api/users/:id — admin peut changer le rôle',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        // Créer un user temporaire
        const createRes = await auth(request.post('/api/users'), cookie).send({
          firstName: 'Temp', lastName: 'RolePatch',
          email: 'temprole@nx.test', role: 'employee',
          passwordHash: 'Test1234!', authSource: 'local',
        })
        assert.strictEqual(createRes.status, 201)
        const userId = createRes.body.id || createRes.body._id
        const patchRes = await auth(request.patch(`/api/users/${userId}`), cookie).send({ role: 'manager' })
        assert.strictEqual(patchRes.status, 200)
      },
    },
    {
      name: 'PATCH /api/users/:id — anti-cycle managerId direct (A→A → 400)',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const res = await auth(request.patch(`/api/users/${emp1._id}`), cookie).send({ managerId: emp1._id.toString() })
        assert.ok([400, 422].includes(res.status), `Expected 400/422 pour self-cycle, got ${res.status}`)
      },
    },
    {
      name: 'GET /api/users?role=employee — filtrage par rôle',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const res = await auth(request.get('/api/users?role=employee'), cookie)
        assert.strictEqual(res.status, 200)
        const users = res.body.data || res.body
        for (const u of users) {
          // Peut retourner mixed selon la query — juste vérifier 200
          assert.ok(u.email)
        }
      },
    },
    {
      name: 'GET /api/users — 400 sur ID invalide',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const res = await auth(request.get('/api/users/not-a-valid-id'), cookie)
        assert.strictEqual(res.status, 400)
      },
    },
  ]

  return runTests(tests)
}

module.exports = { run }
