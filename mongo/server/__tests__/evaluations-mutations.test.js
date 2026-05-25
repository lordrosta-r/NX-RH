'use strict'

// =============================================================================
// Tests mutations évaluations — POST/PATCH /api/evaluations
// =============================================================================

const request      = require('supertest')
const express      = require('express')
const cookieParser = require('cookie-parser')
const bcrypt       = require('bcrypt')
const jwt          = require('jsonwebtoken')
const { User }     = require('../models')
const evaluationRoutes = require('../routes/evaluations')
const { authGuard }    = require('../middleware/authGuard')
const { errorHandler } = require('../middleware/errorHandler')

// Mock notificationHelper pour éviter les erreurs d'écriture en DB lors du fire-and-forget
jest.mock('../services/notificationHelper', () => ({
  notify: jest.fn().mockResolvedValue(undefined),
}))

function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/evaluations', authGuard(['admin', 'director', 'manager', 'employee', 'hr']), evaluationRoutes)
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

const FAKE_OBJECT_ID = '507f1f77bcf86cd799439011'

describe('Evaluation Mutation Routes — /api/evaluations', () => {
  let app
  let adminUser, hrUser, employeeUser
  let adminToken, hrToken, employeeToken

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

    hrUser = await User.create({
      email: 'hr@nanoxplore.com',
      firstName: 'HR',
      lastName: 'User',
      role: 'hr',
      authSource: 'local',
      isActive: true,
      passwordHash,
    })

    employeeUser = await User.create({
      email: 'employee@nanoxplore.com',
      firstName: 'Employee',
      lastName: 'User',
      role: 'employee',
      authSource: 'local',
      isActive: true,
      passwordHash,
    })

    adminToken    = createToken(adminUser)
    hrToken       = createToken(hrUser)
    employeeToken = createToken(employeeUser)
  })

  // ─── POST /api/evaluations ──────────────────────────────────────────────────

  describe('POST /api/evaluations', () => {
    test('devrait retourner 401 sans token', async () => {
      await request(app)
        .post('/api/evaluations')
        .send({ campaignId: FAKE_OBJECT_ID, formId: FAKE_OBJECT_ID })
        .expect(401)
    })

    test('devrait retourner 400 pour un employee sans formId valide', async () => {
      // Les employés peuvent créer uniquement des évaluations standalone (formType request)
      // mais sans formId → 400
      const response = await request(app)
        .post('/api/evaluations')
        .set('Cookie', `accessToken=${employeeToken}`)
        .send({})
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    test('devrait retourner 400 pour un admin sans les champs requis', async () => {
      // admin doit fournir campaignId, formId, evaluatorId, evaluateeId
      const response = await request(app)
        .post('/api/evaluations')
        .set('Cookie', `accessToken=${adminToken}`)
        .send({})
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    test('devrait retourner 400 pour un hr avec des IDs invalides', async () => {
      const response = await request(app)
        .post('/api/evaluations')
        .set('Cookie', `accessToken=${hrToken}`)
        .send({
          campaignId:  'not-a-valid-id',
          formId:      'not-a-valid-id',
          evaluatorId: 'not-a-valid-id',
          evaluateeId: 'not-a-valid-id',
        })
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  // ─── PATCH /api/evaluations/:id ─────────────────────────────────────────────

  describe('PATCH /api/evaluations/:id', () => {
    test('devrait retourner 401 sans token', async () => {
      await request(app)
        .patch(`/api/evaluations/${FAKE_OBJECT_ID}`)
        .send({ answers: [] })
        .expect(401)
    })

    test('devrait retourner 404 avec token hr si évaluation introuvable', async () => {
      const response = await request(app)
        .patch(`/api/evaluations/${FAKE_OBJECT_ID}`)
        .set('Cookie', `accessToken=${hrToken}`)
        .send({ answers: [] })
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })

    test('devrait retourner 404 avec token admin si évaluation introuvable', async () => {
      const response = await request(app)
        .patch(`/api/evaluations/${FAKE_OBJECT_ID}`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ answers: [] })
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })

    test('devrait retourner 404 avec token employee si évaluation introuvable', async () => {
      // L'employee n'est pas l'évaluateur → soit 403, soit 404 selon impl
      const response = await request(app)
        .patch(`/api/evaluations/${FAKE_OBJECT_ID}`)
        .set('Cookie', `accessToken=${employeeToken}`)
        .send({ answers: [] })

      expect([403, 404]).toContain(response.status)
    })
  })

  // ─── POST /api/evaluations/:id/sign ─────────────────────────────────────────

  describe('POST /api/evaluations/:id/sign', () => {
    test('devrait retourner 401 sans token', async () => {
      await request(app)
        .post(`/api/evaluations/${FAKE_OBJECT_ID}/sign`)
        .expect(401)
    })

    test('devrait retourner 404 avec token admin si évaluation introuvable', async () => {
      const response = await request(app)
        .post(`/api/evaluations/${FAKE_OBJECT_ID}/sign`)
        .set('Cookie', `accessToken=${adminToken}`)
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })
  })

  // ─── POST /api/evaluations/:id/expire ───────────────────────────────────────

  describe('POST /api/evaluations/:id/expire', () => {
    test('devrait retourner 401 sans token', async () => {
      await request(app)
        .post(`/api/evaluations/${FAKE_OBJECT_ID}/expire`)
        .expect(401)
    })

    test('devrait retourner 403 pour un employee (réservé admin/hr)', async () => {
      const response = await request(app)
        .post(`/api/evaluations/${FAKE_OBJECT_ID}/expire`)
        .set('Cookie', `accessToken=${employeeToken}`)

      // expire est réservé admin/hr ; employee reçoit 403 ou 404
      expect([403, 404]).toContain(response.status)
    })
  })
})
