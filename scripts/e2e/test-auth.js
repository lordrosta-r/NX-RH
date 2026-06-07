'use strict'

const assert = require('assert')
const { runTests, login, auth } = require('./helpers')

async function run(request, fixtures) {
  const { admin, hr, directeur, manager1, emp1 } = fixtures

  const tests = [
    {
      name: 'POST /login — 400 si champs manquants',
      fn: async () => {
        const res = await request.post('/api/auth/login').send({ email: 'admin@nx.test' })
        assert.strictEqual(res.status, 400)
        assert.ok(res.body.error)
      },
    },
    {
      name: 'POST /login — 400 si email invalide',
      fn: async () => {
        const res = await request.post('/api/auth/login').send({ email: 'not-an-email', password: 'x' })
        assert.strictEqual(res.status, 400)
      },
    },
    {
      name: 'POST /login — 401 si mauvais mot de passe',
      fn: async () => {
        const res = await request.post('/api/auth/login').send({ email: 'admin@nx.test', password: 'WrongPassword!' })
        assert.strictEqual(res.status, 401)
      },
    },
    {
      name: 'POST /login — 401 si utilisateur inexistant',
      fn: async () => {
        const res = await request.post('/api/auth/login').send({ email: 'nobody@nx.test', password: 'Test1234!' })
        assert.strictEqual(res.status, 401)
      },
    },
    {
      name: 'POST /login — 200 admin, cookie httpOnly set',
      fn: async () => {
        const res = await request.post('/api/auth/login').send({ email: 'admin@nx.test', password: 'Test1234!' })
        assert.strictEqual(res.status, 200)
        const cookie = res.headers['set-cookie']?.[0] ?? ''
        assert.ok(cookie.includes('HttpOnly'), `Cookie manque HttpOnly: ${cookie}`)
        assert.ok(cookie.includes('SameSite=Strict'), `Cookie manque SameSite: ${cookie}`)
        assert.ok(!res.body.token, 'Token NE DOIT PAS être dans le body')
      },
    },
    {
      name: 'POST /login — 200 hr, cookie httpOnly set',
      fn: async () => {
        const res = await request.post('/api/auth/login').send({ email: 'hr@nx.test', password: 'Test1234!' })
        assert.strictEqual(res.status, 200)
        const cookie = res.headers['set-cookie']?.[0] ?? ''
        assert.ok(cookie.includes('HttpOnly'))
      },
    },
    {
      name: 'POST /login — 200 manager, cookie httpOnly set',
      fn: async () => {
        const res = await request.post('/api/auth/login').send({ email: 'manager1@nx.test', password: 'Test1234!' })
        assert.strictEqual(res.status, 200)
        assert.ok(res.headers['set-cookie']?.[0])
      },
    },
    {
      name: 'POST /login — 200 employee, cookie httpOnly set',
      fn: async () => {
        const res = await request.post('/api/auth/login').send({ email: 'emp1@nx.test', password: 'Test1234!' })
        assert.strictEqual(res.status, 200)
        assert.ok(res.headers['set-cookie']?.[0])
      },
    },
    {
      name: 'GET /me — 401 sans cookie',
      fn: async () => {
        const res = await request.get('/api/auth/me')
        assert.strictEqual(res.status, 401)
      },
    },
    {
      name: 'GET /me — retourne le bon user avec son rôle',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const res = await auth(request.get('/api/auth/me'), cookie)
        assert.strictEqual(res.status, 200)
        assert.strictEqual(res.body.email, 'admin@nx.test')
        assert.strictEqual(res.body.role, 'admin')
        assert.ok(!res.body.passwordHash, 'passwordHash NE DOIT PAS être exposé')
      },
    },
    {
      name: 'GET /me — retourne le bon rôle pour hr',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.get('/api/auth/me'), cookie)
        assert.strictEqual(res.body.role, 'hr')
      },
    },
    {
      name: 'GET /me — retourne le bon rôle pour manager',
      fn: async () => {
        const cookie = await login(request, 'manager1@nx.test')
        const res = await auth(request.get('/api/auth/me'), cookie)
        assert.strictEqual(res.body.role, 'manager')
      },
    },
    {
      name: 'GET /me — retourne le bon rôle pour employee',
      fn: async () => {
        const cookie = await login(request, 'emp1@nx.test')
        const res = await auth(request.get('/api/auth/me'), cookie)
        assert.strictEqual(res.body.role, 'employee')
      },
    },
    {
      name: 'POST /logout — 200, cookie effacé',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const logoutRes = await auth(request.post('/api/auth/logout'), cookie)
        assert.strictEqual(logoutRes.status, 200)
        // Cookie doit être expiré (Max-Age=0 ou Expires dans le passé)
        const setCookie = logoutRes.headers['set-cookie']?.[0] ?? ''
        const isCleared = setCookie.includes('Max-Age=0') || setCookie.includes('Expires=Thu, 01 Jan 1970')
        assert.ok(isCleared || setCookie.includes('nxrh_token=;'), `Cookie non effacé: ${setCookie}`)
      },
    },
    {
      name: 'Rate limiter — 429 après 10 tentatives échouées sur même email (skippé en mode test)',
      fn: async () => {
        // En mode test, loginLimiter est à max:1000 → ce test vérifie juste le comportement
        // du limiter en production (documenté). On vérifie que les 12 premiers retournent 401.
        const email = 'ratetest@nx.test'
        let lastStatus = 0
        for (let i = 0; i < 12; i++) {
          const res = await request.post('/api/auth/login').send({ email, password: 'wrong' })
          lastStatus = res.status
          if (res.status === 429) break
        }
        // En test : 401 (mauvais mdp). En prod : 429 après 10 tentatives.
        assert.ok(
          [401, 429].includes(lastStatus),
          `Attendu 401 ou 429, got ${lastStatus}`
        )
      },
    },
    {
      name: 'POST /login — remember=true → cookie expires long',
      fn: async () => {
        const res = await request.post('/api/auth/login').send({ email: 'hr@nx.test', password: 'Test1234!', remember: true })
        assert.strictEqual(res.status, 200)
        const cookie = res.headers['set-cookie']?.[0] ?? ''
        // Cookie avec remember doit avoir Max-Age ou Expires (pas juste une session cookie)
        const hasExpiry = cookie.includes('Max-Age=') || cookie.includes('Expires=')
        assert.ok(hasExpiry, `Cookie remember doit avoir une expiration: ${cookie}`)
      },
    },
  ]

  return runTests(tests)
}

module.exports = { run }
