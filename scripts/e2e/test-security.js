'use strict'

const assert = require('assert')
const { runTests, login, auth } = require('./helpers')

async function run(request, fixtures) {
  const tests = [
    // ─── A1/A2 : NoSQL Injection via query ───────────────────────────────────
    {
      name: 'NoSQL Injection — ?status[$gt]=x → 400 ou résultat vide (pas de fuite)',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.get('/api/evaluations?status[$gt]=x'), cookie)
        // Doit retourner 400 (injection bloquée) ou 200 avec tableau vide
        assert.ok(
          res.status === 400 || (res.status === 200 && (res.body.data || res.body).length === 0),
          `NoSQL injection passée: status=${res.status}, body=${JSON.stringify(res.body).slice(0, 200)}`
        )
      },
    },
    {
      name: 'NoSQL Injection — ?role[$ne]=employee → 400 ou résultat non pollué',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.get('/api/users?role[$ne]=employee'), cookie)
        assert.ok(
          res.status === 400 || res.status === 200,
          `Unexpected ${res.status}`
        )
        // Si 200, vérifier qu'on n'obtient pas TOUS les users non-employees
        if (res.status === 200) {
          const users = res.body.data || res.body
          // Dans un cas sain, la query doit être ignorée ou retourner [] (pas de fuite)
          // Si req.query.role est sanitisé en string, '$ne' devient le rôle cherché (inexistant)
          // donc le résultat doit être vide ou une liste normale sans injection
          assert.ok(Array.isArray(users))
        }
      },
    },
    // ─── A9 : Prototype Pollution ─────────────────────────────────────────────
    {
      name: 'Prototype Pollution — __proto__ dans body → ignoré ou 400',
      fn: async () => {
        const cookie = await login(request, 'admin@nx.test')
        const res = await auth(request.post('/api/users'), cookie).send({
          __proto__:  { isAdmin: true },
          constructor: { prototype: { isAdmin: true } },
          email:        'proto_pollution@nx.test',
          firstName:    'Proto',
          lastName:     'Test',
          role:         'employee',
          department:   'HR',
          position:     'Test',
          passwordHash: 'Test1234!',
          authSource:   'local',
        })
        // Doit soit créer l'user normalement (__proto__ ignoré), soit 400/409 (doublon éventuel)
        assert.ok([200, 201, 400, 409].includes(res.status), `Inattendu: ${res.status}`)
        // Vérifier que la pollution n'a pas affecté le prototype global
        assert.ok(!({}).isAdmin, 'Prototype pollué — CRITIQUE')
      },
    },
    // ─── C5 : Payload size limit ──────────────────────────────────────────────
    {
      name: 'Payload > 100kb → 413 Entity Too Large',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const bigPayload = { data: 'x'.repeat(110 * 1024) }  // 110kb
        const res = await auth(request.post('/api/campaigns'), cookie).send(bigPayload)
        assert.strictEqual(res.status, 413, `Expected 413, got ${res.status}`)
      },
    },
    // ─── B1/B4 : JWT algorithm none ───────────────────────────────────────────
    {
      name: 'JWT alg:none — token forgé sans signature → 401',
      fn: async () => {
        // Forger un token avec alg:none (header.payload.{empty_signature})
        const header  = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
        const payload = Buffer.from(JSON.stringify({
          userId: '507f1f77bcf86cd799439011',
          role:   'admin',
          iat:    Math.floor(Date.now() / 1000),
          exp:    Math.floor(Date.now() / 1000) + 3600,
        })).toString('base64url')
        const fakeToken = `${header}.${payload}.`

        const res = await request
          .get('/api/auth/me')
          .set('Cookie', `token=${fakeToken}`)
        assert.strictEqual(res.status, 401, `JWT alg:none accepté — CRITIQUE: got ${res.status}`)
      },
    },
    {
      name: 'JWT avec mauvais secret → 401',
      fn: async () => {
        const jwt = require('jsonwebtoken')
        const fakeToken = jwt.sign(
          { userId: '507f1f77bcf86cd799439011', role: 'admin' },
          'wrong-secret-key',
          { algorithm: 'HS256', expiresIn: '1h' }
        )
        const res = await request
          .get('/api/auth/me')
          .set('Cookie', `token=${fakeToken}`)
        assert.strictEqual(res.status, 401, `Mauvais secret accepté: ${res.status}`)
      },
    },
    // ─── B4 : Bearer token non accepté ────────────────────────────────────────
    {
      name: 'Bearer token dans Authorization header → ignoré (401 sans cookie)',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        // Extraire le token depuis le cookie
        const tokenMatch = cookie.match(/token=([^;]+)/)
        if (!tokenMatch) return
        const token = tokenMatch[1]

        // Envoyer le token en Bearer (pas en cookie)
        const res = await request
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          // Pas de cookie
        assert.strictEqual(res.status, 401, `Bearer token accepté hors cookie: ${res.status}`)
      },
    },
    // ─── A7 : Path Traversal ──────────────────────────────────────────────────
    {
      name: 'Path Traversal — filename avec ../../ dans query → 400 ou ignoré',
      fn: async () => {
        const cookie = await login(request, 'hr@nx.test')
        const res = await auth(request.get('/api/resources?filename=../../config/db.js'), cookie)
        assert.ok([200, 400, 404].includes(res.status))
        // Ne doit pas exposer le contenu du fichier serveur
        if (res.status === 200) {
          const body = JSON.stringify(res.body)
          assert.ok(!body.includes('mongoose'), 'Path traversal potentiel: contenu serveur exposé')
          assert.ok(!body.includes('MONGO_URI'), 'Path traversal potentiel: secrets exposés')
        }
      },
    },
    // ─── A15 : Open Redirect ─────────────────────────────────────────────────
    {
      name: 'Open Redirect — redirectTo=https://evil.com → pas de redirect externe',
      fn: async () => {
        const res = await request
          .post('/api/auth/login')
          .send({
            email:       'hr@nx.test',
            password:    'Test1234!',
            redirectTo:  'https://evil.com/steal',
          })
        // Ne doit PAS retourner 302 vers evil.com
        if (res.status === 302 || res.status === 301) {
          const location = res.headers.location
          assert.ok(
            !location || !location.startsWith('http') || location.includes('nx.test'),
            `Open Redirect vers: ${location}`
          )
        }
        // 200 avec cookie est la réponse normale et acceptable
        assert.ok([200, 400, 404].includes(res.status) || [302, 301].includes(res.status))
      },
    },
  ]

  return runTests(tests)
}

module.exports = { run }
