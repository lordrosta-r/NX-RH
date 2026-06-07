'use strict'

// org.tree.test.js — Unit tests for GET /api/org/tree
// Covers: vue all (arbre récursif), vue teams (groupes par manager), vue sector.
// No real DB — User and Sector models are mocked.

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../models/User')
jest.mock('../../models/Sector')

jest.mock('../../middleware/authGuard', () => ({
  authGuard: (roles = []) => (req, res, next) => {
    const jwt    = require('jsonwebtoken')
    const token  = req.cookies?.accessToken
    if (!token) return res.status(401).json({ error: 'Authentication required' })
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
      if (roles.length && !roles.includes(payload.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }
      req.user = payload
      next()
    } catch {
      return res.status(401).json({ error: 'Token invalide' })
    }
  },
}))

// ─── Imports (after mocks) ────────────────────────────────────────────────────

const jwt          = require('jsonwebtoken')
const request      = require('supertest')
const express      = require('express')
const cookieParser = require('cookie-parser')
const { authGuard } = require('../../middleware/authGuard')
const orgRouter    = require('../../routes/org')
const User         = require('../../models/User')
const Sector       = require('../../models/Sector')

const SECRET = 'test-secret-long-enough-for-hs256-algorithm'
process.env.JWT_SECRET = SECRET
process.env.NODE_ENV   = 'test'

// ─── App builder ──────────────────────────────────────────────────────────────

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/org', authGuard(['admin', 'hr']), orgRouter)
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
  })
  return app
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tokenFor({ id, role }) {
  return jwt.sign({ id, email: `${role}@corp.com`, role }, SECRET, {
    algorithm: 'HS256', expiresIn: '1h',
  })
}

const ADMIN_ID   = '507f1f77bcf86cd799439001'
const MGR_ID     = '507f1f77bcf86cd799439002'
const EMP1_ID    = '507f1f77bcf86cd799439003'
const EMP2_ID    = '507f1f77bcf86cd799439004'
const SECTOR1_ID = '607f1f77bcf86cd799439001'

const ADMIN_TOKEN = tokenFor({ id: ADMIN_ID, role: 'admin' })

// ─── Fixture data ─────────────────────────────────────────────────────────────

const USERS = [
  {
    _id: { toString: () => ADMIN_ID },
    firstName: 'Alice', lastName: 'Admin',
    role: 'admin', department: 'RH', sectorId: null, managerId: null, avatar: null,
  },
  {
    _id: { toString: () => MGR_ID },
    firstName: 'Bob', lastName: 'Manager',
    role: 'manager', department: 'IT', sectorId: { toString: () => SECTOR1_ID }, managerId: { toString: () => ADMIN_ID },
    avatar: null,
  },
  {
    _id: { toString: () => EMP1_ID },
    firstName: 'Charlie', lastName: 'Employee',
    role: 'employee', department: 'IT', sectorId: { toString: () => SECTOR1_ID }, managerId: { toString: () => MGR_ID },
    avatar: null,
  },
  {
    _id: { toString: () => EMP2_ID },
    firstName: 'Diana', lastName: 'Employee2',
    role: 'employee', department: 'IT', sectorId: { toString: () => SECTOR1_ID }, managerId: { toString: () => MGR_ID },
    avatar: null,
  },
]

const SECTORS = [
  { _id: { toString: () => SECTOR1_ID }, name: 'Tech', isActive: true },
]

function mockUserFind(users = USERS) {
  User.find = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(users),
    }),
  })
}

function mockSectorFind(sectors = SECTORS) {
  Sector.find = jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(sectors),
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/org/tree', () => {
  const app = buildApp()

  beforeEach(() => {
    mockUserFind()
    mockSectorFind()
  })

  // ── 1. Auth guard ────────────────────────────────────────────────────────────

  it('401 — sans token', async () => {
    const res = await request(app).get('/api/org/tree')
    expect(res.status).toBe(401)
  })

  it('403 — rôle insuffisant (employee)', async () => {
    const res = await request(app)
      .get('/api/org/tree')
      .set('Cookie', `accessToken=${tokenFor({ id: EMP1_ID, role: 'employee' })}`)
    expect(res.status).toBe(403)
  })

  // ── 2. Paramètre view invalide ───────────────────────────────────────────────

  it('400 — view=invalid retourne 400', async () => {
    const res = await request(app)
      .get('/api/org/tree?view=invalid')
      .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/view invalide/i)
  })

  // ── 3. Vue all (défaut) ──────────────────────────────────────────────────────

  it('200 — vue all : retourne un tableau avec les racines au premier niveau', async () => {
    const res = await request(app)
      .get('/api/org/tree')
      .set('Cookie', `accessToken=${ADMIN_TOKEN}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    // Alice Admin a managerId=null → root
    const root = res.body.find(n => n.lastName === 'Admin')
    expect(root).toBeDefined()
    expect(root.children).toBeDefined()
  })

  it('200 — vue all : les enfants sont imbriqués sous leur manager', async () => {
    const res = await request(app)
      .get('/api/org/tree?view=all')
      .set('Cookie', `accessToken=${ADMIN_TOKEN}`)

    expect(res.status).toBe(200)
    const root = res.body.find(n => n.lastName === 'Admin')
    // Bob Manager → child of Alice Admin
    const mgr = root?.children?.find(c => c.lastName === 'Manager')
    expect(mgr).toBeDefined()
    // Charlie et Diana → children of Bob Manager
    expect(mgr?.children?.length).toBe(2)
  })

  // ── 4. Vue teams ──────────────────────────────────────────────────────────────

  it('200 — vue teams : retourne des groupes par manager direct', async () => {
    const res = await request(app)
      .get('/api/org/tree?view=teams')
      .set('Cookie', `accessToken=${ADMIN_TOKEN}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    // Bob Manager has 2 direct reports
    const mgrGroup = res.body.find(g => g.manager?.lastName === 'Manager')
    expect(mgrGroup).toBeDefined()
    expect(mgrGroup.directReports.length).toBe(2)
  })

  it('200 — vue teams : Alice Admin a 1 direct report (Bob Manager)', async () => {
    const res = await request(app)
      .get('/api/org/tree?view=teams')
      .set('Cookie', `accessToken=${ADMIN_TOKEN}`)

    expect(res.status).toBe(200)
    const adminGroup = res.body.find(g => g.manager?.lastName === 'Admin')
    expect(adminGroup).toBeDefined()
    expect(adminGroup.directReports.length).toBe(1)
  })

  // ── 5. Vue sector ─────────────────────────────────────────────────────────────

  it('200 — vue sector : retourne des groupes par secteur', async () => {
    const res = await request(app)
      .get('/api/org/tree?view=sector')
      .set('Cookie', `accessToken=${ADMIN_TOKEN}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    // Sector "Tech" contains Bob, Charlie, Diana
    const techGroup = res.body.find(g => g.sector?.name === 'Tech')
    expect(techGroup).toBeDefined()
    expect(techGroup.users.length).toBe(3)
  })

  it('200 — vue sector : Alice sans secteur apparaît dans le groupe null', async () => {
    const res = await request(app)
      .get('/api/org/tree?view=sector')
      .set('Cookie', `accessToken=${ADMIN_TOKEN}`)

    expect(res.status).toBe(200)
    const nullGroup = res.body.find(g => g.sector === null)
    expect(nullGroup).toBeDefined()
    expect(nullGroup.users.some(u => u.lastName === 'Admin')).toBe(true)
  })

  // ── 6. Liste vide ─────────────────────────────────────────────────────────────

  it('200 — retourne [] quand aucun utilisateur actif (vue all)', async () => {
    mockUserFind([])
    const res = await request(app)
      .get('/api/org/tree?view=all')
      .set('Cookie', `accessToken=${ADMIN_TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})
