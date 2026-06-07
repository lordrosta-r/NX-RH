'use strict'

const assert = require('assert')

/**
 * Exécute un tableau de tests { name, fn } et retourne { passed, failed }.
 * Affiche ✅ / ❌ pour chaque test avec le message d'erreur si échec.
 */
async function runTests(tests) {
  let passed = 0, failed = 0
  for (const { name, fn } of tests) {
    try {
      await fn()
      console.log(`  ✅ ${name}`)
      passed++
    } catch (err) {
      console.log(`  ❌ ${name}`)
      console.log(`     → ${err.message}`)
      failed++
    }
  }
  return { passed, failed }
}

/**
 * Connecte un utilisateur et retourne son cookie de session.
 * @param {object} request  - supertest instance
 * @param {string} email
 * @param {string} password - défaut : 'Test1234!'
 * @param {boolean} remember - défaut : false
 * @returns {Promise<string>} cookie header value
 */
async function login(request, email, password = 'Test1234!', remember = false) {
  const res = await request
    .post('/api/auth/login')
    .send({ email, password, remember })
  assert.strictEqual(
    res.status, 200,
    `Login failed for ${email} (${res.status}): ${JSON.stringify(res.body)}`
  )
  const cookie = res.headers['set-cookie']?.[0]
  assert.ok(cookie, `No Set-Cookie header for ${email}`)
  return cookie
}

/**
 * Ajoute un cookie d'authentification à la requête.
 */
function auth(req, cookie) {
  return req.set('Cookie', cookie)
}

module.exports = { runTests, login, auth }
