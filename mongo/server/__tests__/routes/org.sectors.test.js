'use strict'

// org.sectors.test.js — Tests for sectors CRUD:
//   GET    /api/org/sectors         → list active sectors (admin/hr only)
//   POST   /api/org/sectors         → create sector
//   PATCH  /api/org/sectors/:id     → update sector
//   DELETE /api/org/sectors/:id     → delete sector (blocked if users assigned)
// Models are mocked; no real DB.

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../models/User')
jest.mock('../../models/Sector')

jest.mock('../../middleware/authGuard', () => ({
  authGuard: (roles = []) => (req, res, next) => {
    const jwt   = require('jsonwebtoken')
    const token = req.cookies?.accessToken
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

const jwt            = require('jsonwebtoken')
const request        = require('supertest')
const express        = require('express')
const cookieParser   = require('cookie-parser')
const mongoose       = require('mongoose')
const { authGuard }  = require('../../middleware/authGuard')
const orgRouter      = require('../../routes/org')
const User           = require('../../models/User')
const Sector         = require('../../models/Sector')

const SECRET = 'test-secret-long-enough-for-hs256-algorithm'
process.env.JWT_SECRET = SECRET
process.env.NODE_ENV   = 'test'

// ─── App builder ──────────────────────────────────────────────────────────────

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/org', authGuard(['admin', 'hr', 'manager', 'director', 'employee']), orgRouter)
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
  })
  return app
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FAKE_ID  = new mongoose.Types.ObjectId().toString()
const FAKE_ID2 = new mongoose.Types.ObjectId().toString()

function token(role = 'hr') {
  return jwt.sign(
    { id: 'user-abc', role, firstName: 'Marie', lastName: 'Test' },
    SECRET,
    { algorithm: 'HS256', expiresIn: '1h' },
  )
}

function makeSectorChain(result) {
  return {
    sort:     jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean:     jest.fn().mockResolvedValue(result),
  }
}

const SECTOR_FIXTURE = {
  _id:         FAKE_ID,
  name:        'Technologie',
  description: 'Équipe tech',
  color:       '#17A8D4',
  isActive:    true,
  createdBy:   { firstName: 'Admin', lastName: 'Super' },
}

// ─── Tests: GET /api/org/sectors ─────────────────────────────────────────────

describe('GET /api/org/sectors', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/org/sectors')
    expect(res.status).toBe(401)
  })

  it('should return 403 for employee role', async () => {
    Sector.find = jest.fn().mockReturnValue(makeSectorChain([]))
    const res = await request(app)
      .get('/api/org/sectors')
      .set('Cookie', `accessToken=${token('employee')}`)
    expect(res.status).toBe(403)
  })

  it('should return 403 for manager role', async () => {
    Sector.find = jest.fn().mockReturnValue(makeSectorChain([]))
    const res = await request(app)
      .get('/api/org/sectors')
      .set('Cookie', `accessToken=${token('manager')}`)
    expect(res.status).toBe(403)
  })

  it('should return list of sectors for hr', async () => {
    Sector.find = jest.fn().mockReturnValue(makeSectorChain([SECTOR_FIXTURE]))
    const res = await request(app)
      .get('/api/org/sectors')
      .set('Cookie', `accessToken=${token('hr')}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0]).toHaveProperty('name', 'Technologie')
  })

  it('should return list of sectors for admin', async () => {
    Sector.find = jest.fn().mockReturnValue(makeSectorChain([SECTOR_FIXTURE]))
    const res = await request(app)
      .get('/api/org/sectors')
      .set('Cookie', `accessToken=${token('admin')}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })

  it('should return empty array when no sectors', async () => {
    Sector.find = jest.fn().mockReturnValue(makeSectorChain([]))
    const res = await request(app)
      .get('/api/org/sectors')
      .set('Cookie', `accessToken=${token('hr')}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

// ─── Tests: POST /api/org/sectors ────────────────────────────────────────────

describe('POST /api/org/sectors', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
    Sector.mockImplementation(function (data) {
      Object.assign(this, data)
      this.save = jest.fn().mockResolvedValue(this)
      this.toObject = jest.fn().mockReturnValue({ ...data, _id: FAKE_ID2 })
    })
  })

  it('should return 403 for manager role', async () => {
    const res = await request(app)
      .post('/api/org/sectors')
      .set('Cookie', `accessToken=${token('manager')}`)
      .send({ name: 'Finance' })
    expect(res.status).toBe(403)
  })

  it('should create a sector and return 201', async () => {
    const res = await request(app)
      .post('/api/org/sectors')
      .set('Cookie', `accessToken=${token('hr')}`)
      .send({ name: 'Finance', description: 'Équipe finance', color: '#FF5733' })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('name', 'Finance')
  })

  it('should return 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/org/sectors')
      .set('Cookie', `accessToken=${token('hr')}`)
      .send({ description: 'no name' })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
    expect(res.body.error).toMatch(/name/)
  })

  it('should return 400 when name is too short (< 2 chars)', async () => {
    const res = await request(app)
      .post('/api/org/sectors')
      .set('Cookie', `accessToken=${token('hr')}`)
      .send({ name: 'A' })
    expect(res.status).toBe(400)
  })

  it('should return 400 when name is too long (> 100 chars)', async () => {
    const res = await request(app)
      .post('/api/org/sectors')
      .set('Cookie', `accessToken=${token('hr')}`)
      .send({ name: 'A'.repeat(101) })
    expect(res.status).toBe(400)
  })

  it('should apply default color when not provided', async () => {
    const res = await request(app)
      .post('/api/org/sectors')
      .set('Cookie', `accessToken=${token('admin')}`)
      .send({ name: 'Marketing' })
    expect(res.status).toBe(201)
    expect(Sector).toHaveBeenCalledWith(
      expect.objectContaining({ color: '#17A8D4' }),
    )
  })

  it('should return 409 on duplicate name (code 11000)', async () => {
    Sector.mockImplementation(function (data) {
      Object.assign(this, data)
      this.save = jest.fn().mockRejectedValue({ code: 11000 })
      this.toObject = jest.fn().mockReturnValue(data)
    })
    const res = await request(app)
      .post('/api/org/sectors')
      .set('Cookie', `accessToken=${token('hr')}`)
      .send({ name: 'Technologie' })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/existe déjà/)
  })
})

// ─── Tests: PATCH /api/org/sectors/:id ───────────────────────────────────────

describe('PATCH /api/org/sectors/:id', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 403 for non-admin/hr roles', async () => {
    const res = await request(app)
      .patch(`/api/org/sectors/${FAKE_ID}`)
      .set('Cookie', `accessToken=${token('manager')}`)
      .send({ name: 'Updated' })
    expect(res.status).toBe(403)
  })

  it('should return 400 for invalid ObjectId', async () => {
    const res = await request(app)
      .patch('/api/org/sectors/not-valid-id')
      .set('Cookie', `accessToken=${token('hr')}`)
      .send({ name: 'Updated' })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error', 'ID invalide')
  })

  it('should return 404 when sector not found', async () => {
    Sector.findByIdAndUpdate = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    })
    const res = await request(app)
      .patch(`/api/org/sectors/${FAKE_ID}`)
      .set('Cookie', `accessToken=${token('hr')}`)
      .send({ name: 'Inexistant' })
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error', 'Secteur introuvable')
  })

  it('should update a sector and return 200', async () => {
    const updated = { ...SECTOR_FIXTURE, name: 'Tech & Infra' }
    Sector.findByIdAndUpdate = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue({ ...updated, toObject: () => updated }),
    })
    const res = await request(app)
      .patch(`/api/org/sectors/${FAKE_ID}`)
      .set('Cookie', `accessToken=${token('hr')}`)
      .send({ name: 'Tech & Infra' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('name', 'Tech & Infra')
  })

  it('should return 409 on duplicate name', async () => {
    Sector.findByIdAndUpdate = jest.fn().mockReturnValue({
      populate: jest.fn().mockRejectedValue({ code: 11000 }),
    })
    const res = await request(app)
      .patch(`/api/org/sectors/${FAKE_ID}`)
      .set('Cookie', `accessToken=${token('hr')}`)
      .send({ name: 'Technologie' })
    expect(res.status).toBe(409)
  })
})

// ─── Tests: DELETE /api/org/sectors/:id ──────────────────────────────────────

describe('DELETE /api/org/sectors/:id', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 403 for non-admin/hr roles', async () => {
    const res = await request(app)
      .delete(`/api/org/sectors/${FAKE_ID}`)
      .set('Cookie', `accessToken=${token('employee')}`)
    expect(res.status).toBe(403)
  })

  it('should return 400 for invalid ObjectId', async () => {
    const res = await request(app)
      .delete('/api/org/sectors/bad-id')
      .set('Cookie', `accessToken=${token('hr')}`)
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error', 'ID invalide')
  })

  it('should return 404 when sector not found', async () => {
    Sector.findById = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) })
    const res = await request(app)
      .delete(`/api/org/sectors/${FAKE_ID}`)
      .set('Cookie', `accessToken=${token('hr')}`)
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error', 'Secteur introuvable')
  })

  it('should return 409 when sector has assigned users', async () => {
    Sector.findById = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(SECTOR_FIXTURE) })
    User.countDocuments = jest.fn().mockResolvedValue(3)
    const res = await request(app)
      .delete(`/api/org/sectors/${FAKE_ID}`)
      .set('Cookie', `accessToken=${token('hr')}`)
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/3 utilisateurs/)
  })

  it('should delete sector and return 204 when no users assigned', async () => {
    Sector.findById    = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(SECTOR_FIXTURE) })
    User.countDocuments = jest.fn().mockResolvedValue(0)
    Sector.deleteOne   = jest.fn().mockResolvedValue({ deletedCount: 1 })
    const res = await request(app)
      .delete(`/api/org/sectors/${FAKE_ID}`)
      .set('Cookie', `accessToken=${token('hr')}`)
    expect(res.status).toBe(204)
    expect(Sector.deleteOne).toHaveBeenCalledWith({ _id: FAKE_ID })
  })

  it('should include singular form in error when 1 user assigned', async () => {
    Sector.findById    = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(SECTOR_FIXTURE) })
    User.countDocuments = jest.fn().mockResolvedValue(1)
    const res = await request(app)
      .delete(`/api/org/sectors/${FAKE_ID}`)
      .set('Cookie', `accessToken=${token('hr')}`)
    expect(res.status).toBe(409)
    expect(res.body.error).not.toMatch(/utilisateurs/)
    expect(res.body.error).toMatch(/1 utilisateur/)
  })
})
