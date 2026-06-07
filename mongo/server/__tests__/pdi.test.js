'use strict'

// =============================================================================
// Tests PDI — /api/pdi
// createPDI, listPDIs (filtré par rôle), addAction, signPDI, archivePDI
// =============================================================================

const request      = require('supertest')
const express      = require('express')
const cookieParser = require('cookie-parser')
const bcrypt       = require('bcrypt')
const jwt          = require('jsonwebtoken')
const { User }     = require('../models')
const PDI          = require('../models/PDI')
const pdiRoutes    = require('../routes/pdi')
const pdiService   = require('../services/pdiService')
const { authGuard }    = require('../middleware/authGuard')
const { errorHandler } = require('../middleware/errorHandler')

// ─── App de test ─────────────────────────────────────────────────────────────

function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/pdi', authGuard(), pdiRoutes)
  app.use(errorHandler)
  return app
}

function createToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '8h' },
  )
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

describe('PDI Routes — /api/pdi', () => {
  let app
  let adminUser, managerUser, employeeUser, otherEmployee
  let adminToken, managerToken, employeeToken, otherToken

  beforeAll(() => { app = createTestApp() })

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('password123', 12)

    adminUser = await User.create({
      email: 'admin@test.com', firstName: 'Admin', lastName: 'Doe',
      role: 'admin', authSource: 'local', isActive: true, passwordHash,
    })
    managerUser = await User.create({
      email: 'manager@test.com', firstName: 'Manager', lastName: 'Doe',
      role: 'manager', authSource: 'local', isActive: true, passwordHash,
    })
    employeeUser = await User.create({
      email: 'employee@test.com', firstName: 'Employee', lastName: 'Doe',
      role: 'employee', managerId: managerUser._id, authSource: 'local', isActive: true, passwordHash,
    })
    otherEmployee = await User.create({
      email: 'other@test.com', firstName: 'Other', lastName: 'Emp',
      role: 'employee', authSource: 'local', isActive: true, passwordHash,
    })

    adminToken    = createToken(adminUser)
    managerToken  = createToken(managerUser)
    employeeToken = createToken(employeeUser)
    otherToken    = createToken(otherEmployee)
  })

  // ─── Helper ────────────────────────────────────────────────────────────────

  function pdiPayload(overrides = {}) {
    return {
      employee:    employeeUser._id.toString(),
      manager:     managerUser._id.toString(),
      period:      { start: '2025-01-01', end: '2025-12-31' },
      objectives:  ['Améliorer les compétences JS', 'Obtenir une certification Cloud'],
      notes:       'Notes initiales',
      ...overrides,
    }
  }

  // ─── TEST 1 : createPDI ────────────────────────────────────────────────────

  describe('POST /api/pdi — createPDI', () => {
    it('manager peut créer un PDI pour son employé', async () => {
      const res = await request(app)
        .post('/api/pdi')
        .set('Cookie', [`accessToken=${managerToken}`])
        .send(pdiPayload())

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('draft')
      expect(res.body.data.employee).toBeDefined()
      expect(res.body.data.manager).toBeDefined()
    })

    it('admin peut créer un PDI', async () => {
      const res = await request(app)
        .post('/api/pdi')
        .set('Cookie', [`accessToken=${adminToken}`])
        .send(pdiPayload())

      expect(res.status).toBe(201)
      expect(res.body.data.objectives).toHaveLength(2)
    })

    it('retourne 400 si employee manquant', async () => {
      const res = await request(app)
        .post('/api/pdi')
        .set('Cookie', [`accessToken=${adminToken}`])
        .send({ manager: managerUser._id, period: { start: '2025-01-01', end: '2025-12-31' } })

      expect(res.status).toBe(400)
    })

    it('retourne 401 sans token', async () => {
      const res = await request(app).post('/api/pdi').send(pdiPayload())
      expect(res.status).toBe(401)
    })
  })

  // ─── TEST 2 : listPDIs filtrée par rôle ──────────────────────────────────

  describe('GET /api/pdi — listPDIs (RBAC)', () => {
    beforeEach(async () => {
      await PDI.create({
        employee: employeeUser._id, manager: managerUser._id,
        period: { start: '2025-01-01', end: '2025-12-31' },
      })
      await PDI.create({
        employee: otherEmployee._id, manager: adminUser._id,
        period: { start: '2025-01-01', end: '2025-12-31' },
      })
    })

    it('admin voit tous les PDIs', async () => {
      const res = await request(app)
        .get('/api/pdi')
        .set('Cookie', [`accessToken=${adminToken}`])

      expect(res.status).toBe(200)
      expect(res.body.data.length).toBeGreaterThanOrEqual(2)
    })

    it('manager voit uniquement ses PDIs', async () => {
      const res = await request(app)
        .get('/api/pdi')
        .set('Cookie', [`accessToken=${managerToken}`])

      expect(res.status).toBe(200)
      // Le manager ne voit que le PDI où il est manager ou employee
      const ids = res.body.data.map(p => p.manager._id)
      expect(ids.every(id => id === managerUser._id.toString())).toBe(true)
    })

    it('employee voit uniquement son propre PDI', async () => {
      const res = await request(app)
        .get('/api/pdi')
        .set('Cookie', [`accessToken=${employeeToken}`])

      expect(res.status).toBe(200)
      expect(res.body.data.every(p => p.employee._id === employeeUser._id.toString())).toBe(true)
    })
  })

  // ─── TEST 3 : addAction ──────────────────────────────────────────────────

  describe('POST /api/pdi/:id/actions — addAction', () => {
    let pdi

    beforeEach(async () => {
      pdi = await PDI.create({
        employee: employeeUser._id, manager: managerUser._id,
        period: { start: '2025-01-01', end: '2025-12-31' },
      })
    })

    it('manager peut ajouter une action', async () => {
      const res = await request(app)
        .post(`/api/pdi/${pdi._id}/actions`)
        .set('Cookie', [`accessToken=${managerToken}`])
        .send({ title: 'Formation React avancé', type: 'formation', targetDate: '2025-06-30' })

      expect(res.status).toBe(200)
      expect(res.body.data.actions).toHaveLength(1)
      expect(res.body.data.actions[0].title).toBe('Formation React avancé')
    })

    it('employee peut ajouter une action à son propre PDI', async () => {
      const res = await request(app)
        .post(`/api/pdi/${pdi._id}/actions`)
        .set('Cookie', [`accessToken=${employeeToken}`])
        .send({ title: 'Lecture Clean Code', type: 'lecture' })

      expect(res.status).toBe(200)
      expect(res.body.data.actions).toHaveLength(1)
    })

    it('un tiers ne peut pas ajouter une action', async () => {
      const res = await request(app)
        .post(`/api/pdi/${pdi._id}/actions`)
        .set('Cookie', [`accessToken=${otherToken}`])
        .send({ title: 'Action non autorisée', type: 'autre' })

      expect(res.status).toBe(403)
    })

    it('retourne 400 si le titre est absent', async () => {
      const res = await request(app)
        .post(`/api/pdi/${pdi._id}/actions`)
        .set('Cookie', [`accessToken=${managerToken}`])
        .send({ type: 'formation' })

      expect(res.status).toBe(400)
    })
  })

  // ─── TEST 4 : signPDI — employee puis manager ────────────────────────────

  describe('POST /api/pdi/:id/sign — signPDI', () => {
    let pdi

    beforeEach(async () => {
      pdi = await PDI.create({
        employee: employeeUser._id, manager: managerUser._id,
        period: { start: '2025-01-01', end: '2025-12-31' },
      })
    })

    it('employee peut signer son PDI', async () => {
      const res = await request(app)
        .post(`/api/pdi/${pdi._id}/sign`)
        .set('Cookie', [`accessToken=${employeeToken}`])

      expect(res.status).toBe(200)
      expect(res.body.data.employeeSignedAt).toBeDefined()
      expect(res.body.data.status).toBe('active')
    })

    it('manager peut signer le PDI', async () => {
      const res = await request(app)
        .post(`/api/pdi/${pdi._id}/sign`)
        .set('Cookie', [`accessToken=${managerToken}`])

      expect(res.status).toBe(200)
      expect(res.body.data.managerSignedAt).toBeDefined()
    })

    it('employee ne peut pas signer un PDI qui n\'est pas le sien', async () => {
      const otherPDI = await PDI.create({
        employee: otherEmployee._id, manager: adminUser._id,
        period: { start: '2025-01-01', end: '2025-12-31' },
      })

      const res = await request(app)
        .post(`/api/pdi/${otherPDI._id}/sign`)
        .set('Cookie', [`accessToken=${employeeToken}`])

      expect(res.status).toBe(403)
    })

    it('double signature retourne 409', async () => {
      // Première signature
      await request(app)
        .post(`/api/pdi/${pdi._id}/sign`)
        .set('Cookie', [`accessToken=${employeeToken}`])

      // Deuxième tentative
      const res = await request(app)
        .post(`/api/pdi/${pdi._id}/sign`)
        .set('Cookie', [`accessToken=${employeeToken}`])

      expect(res.status).toBe(409)
    })
  })

  // ─── TEST 5 : archivePDI ─────────────────────────────────────────────────

  describe('PATCH → archivePDI via service', () => {
    it('manager peut archiver son PDI via le service', async () => {
      const pdi = await PDI.create({
        employee: employeeUser._id, manager: managerUser._id,
        period: { start: '2025-01-01', end: '2025-12-31' },
        status: 'active',
      })
      const archived = await pdiService.archivePDI(
        pdi._id.toString(),
        managerUser._id.toString(),
        'manager',
      )

      expect(archived.status).toBe('archived')
    })

    it('double archivage retourne une erreur', async () => {
      const pdi = await PDI.create({
        employee: employeeUser._id, manager: managerUser._id,
        period: { start: '2025-01-01', end: '2025-12-31' },
        status: 'archived',
      })

      await expect(
        pdiService.archivePDI(pdi._id.toString(), adminUser._id.toString(), 'admin'),
      ).rejects.toMatchObject({ status: 409 })
    })

    it('un employé ne peut pas archiver', async () => {
      const pdi = await PDI.create({
        employee: employeeUser._id, manager: managerUser._id,
        period: { start: '2025-01-01', end: '2025-12-31' },
        status: 'active',
      })

      await expect(
        pdiService.archivePDI(pdi._id.toString(), employeeUser._id.toString(), 'employee'),
      ).rejects.toMatchObject({ status: 403 })
    })
  })

  // ─── TEST 6 : getPDIById RBAC ────────────────────────────────────────────

  describe('GET /api/pdi/:id — getPDIById', () => {
    it('retourne 404 pour un ID inexistant', async () => {
      const fakeId = '507f1f77bcf86cd799439011'
      const res = await request(app)
        .get(`/api/pdi/${fakeId}`)
        .set('Cookie', [`accessToken=${adminToken}`])

      expect(res.status).toBe(404)
    })

    it('un tiers ne peut pas accéder au PDI', async () => {
      const pdi = await PDI.create({
        employee: employeeUser._id, manager: managerUser._id,
        period: { start: '2025-01-01', end: '2025-12-31' },
      })

      const res = await request(app)
        .get(`/api/pdi/${pdi._id}`)
        .set('Cookie', [`accessToken=${otherToken}`])

      expect(res.status).toBe(403)
    })
  })
})
