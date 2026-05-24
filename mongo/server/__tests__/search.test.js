'use strict'

// =============================================================================
// Tests recherche globale — GET /api/search
// =============================================================================

const request    = require('supertest')
const express    = require('express')
const cookieParser = require('cookie-parser')
const bcrypt     = require('bcrypt')
const jwt        = require('jsonwebtoken')
const { User }   = require('../models')
const searchRoutes = require('../routes/search')
const { authGuard } = require('../middleware/authGuard')
const { errorHandler } = require('../middleware/errorHandler')

function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/search', authGuard(['admin', 'hr', 'manager', 'employee']), searchRoutes)
  app.use(errorHandler)
  return app
}

function createToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '8h' }
  )
}

describe('Search Routes — /api/search', () => {
  let app
  let adminUser, adminToken

  beforeAll(() => {
    app = createTestApp()
  })

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('password123', 12)
    adminUser = await User.create({
      email: 'admin@nanoxplore.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      authSource: 'local',
      isActive: true,
      passwordHash,
    })
    adminToken = createToken(adminUser)
  })

  describe('GET /api/search — Authentification', () => {
    test('devrait retourner 401 sans token', async () => {
      await request(app)
        .get('/api/search?q=test')
        .expect(401)
    })

    test('devrait retourner 401 avec un token invalide', async () => {
      await request(app)
        .get('/api/search?q=test')
        .set('Cookie', 'token=invalid.token.here')
        .expect(401)
    })
  })

  describe('GET /api/search — Validation du paramètre q', () => {
    test('devrait retourner 400 sans paramètre q', async () => {
      const response = await request(app)
        .get('/api/search')
        .set('Cookie', `token=${adminToken}`)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    test('devrait retourner 400 si q est vide', async () => {
      const response = await request(app)
        .get('/api/search?q=')
        .set('Cookie', `token=${adminToken}`)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    test('devrait retourner 400 si q fait moins de 2 caractères', async () => {
      const response = await request(app)
        .get('/api/search?q=a')
        .set('Cookie', `token=${adminToken}`)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('GET /api/search — Résultats', () => {
    test('devrait retourner 200 avec users/campaigns/forms avec un token admin', async () => {
      const response = await request(app)
        .get('/api/search?q=test')
        .set('Cookie', `token=${adminToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('users')
      expect(response.body).toHaveProperty('campaigns')
      expect(response.body).toHaveProperty('forms')
      expect(Array.isArray(response.body.users)).toBe(true)
      expect(Array.isArray(response.body.campaigns)).toBe(true)
      expect(Array.isArray(response.body.forms)).toBe(true)
    })

    test('devrait retourner 200 avec des tableaux vides pour une requête sans résultat', async () => {
      const response = await request(app)
        .get('/api/search?q=ZZZNORESULTXYZ')
        .set('Cookie', `token=${adminToken}`)
        .expect(200)

      expect(response.body.users).toEqual([])
      expect(response.body.campaigns).toEqual([])
      expect(response.body.forms).toEqual([])
    })

    test('devrait retourner 200 pour un employee authentifié', async () => {
      const passwordHash = await bcrypt.hash('password123', 12)
      const employeeUser = await User.create({
        email: 'employee@nanoxplore.com',
        firstName: 'Employee',
        lastName: 'User',
        role: 'employee',
        authSource: 'local',
        isActive: true,
        passwordHash,
      })
      const employeeToken = createToken(employeeUser)

      const response = await request(app)
        .get('/api/search?q=test')
        .set('Cookie', `token=${employeeToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('users')
    })
  })
})
