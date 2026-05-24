'use strict'

// Users route integration tests — no real MongoDB connection.
// Models are mocked; authGuard is mocked with inline JWT verification.

const jwt = require('jsonwebtoken')

// ─── Chainable Mongoose query stub ───────────────────────────────────────────
// Used by User.find() and User.findById() when the route chains .select().lean()
function makeChain(result) {
  return {
    select:   jest.fn().mockReturnThis(),
    sort:     jest.fn().mockReturnThis(),
    skip:     jest.fn().mockReturnThis(),
    limit:    jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean:     jest.fn().mockResolvedValue(result),
  }
}

jest.mock('../../models', () => {
  // MockUser works as a constructor (for POST) and exposes static query methods.
  function MockUser(data) { Object.assign(this, data) }
  MockUser.prototype.save     = jest.fn().mockResolvedValue(undefined)
  MockUser.prototype.toObject = jest.fn().mockImplementation(function () {
    // Return plain data without the mock methods themselves
    const { save, toObject, ...rest } = this  // eslint-disable-line no-unused-vars
    return rest
  })
  MockUser.find           = jest.fn()
  MockUser.findById       = jest.fn()
  MockUser.countDocuments = jest.fn().mockResolvedValue(0)
  MockUser.updateMany     = jest.fn().mockResolvedValue({ modifiedCount: 0 })
  MockUser.updateOne      = jest.fn().mockResolvedValue({ acknowledged: true })

  const Evaluation = {
    find:           jest.fn(),
    findById:       jest.fn(),
    countDocuments: jest.fn().mockResolvedValue(0),
    updateMany:     jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    populate:       jest.fn().mockReturnThis(),
  }

  // AuditLog.create is fire-and-forget; return a resolved Promise so .catch() works.
  const AuditLog = { create: jest.fn().mockResolvedValue({}) }

  return { User: MockUser, Evaluation, AuditLog }
})

jest.mock('../../middleware/authGuard', () => ({
  authGuard: (roles = []) => (req, res, next) => {
    const _jwt   = require('jsonwebtoken')
    const secret = process.env.JWT_SECRET
    const token  = req.cookies?.token
    if (!token) return res.status(401).json({ error: 'Authentication required' })
    try {
      const payload = _jwt.verify(token, secret, { algorithms: ['HS256'] })
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

const { User, Evaluation }  = require('../../models')
const request               = require('supertest')
const express               = require('express')
const cookieParser          = require('cookie-parser')
const { authGuard }         = require('../../middleware/authGuard')
const userRouter            = require('../../routes/users')

const SECRET = 'test-secret-long-enough-for-hs256-algorithm'
process.env.JWT_SECRET = SECRET
process.env.NODE_ENV   = 'test'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ADMIN_ID    = '507f1f77bcf86cd799439001'
const HR_ID       = '507f1f77bcf86cd799439002'
const MANAGER_ID  = '507f1f77bcf86cd799439003'
const EMPLOYEE_ID = '507f1f77bcf86cd799439004'
const OTHER_ID    = '507f1f77bcf86cd799439005'

function tokenFor({ id, role }) {
  return jwt.sign({ id, email: `${role}@corp.com`, role }, SECRET, {
    algorithm: 'HS256', expiresIn: '1h',
  })
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  // Mirror the middleware stack used in index.js: auth guard + router
  app.use('/api/users', authGuard(['admin', 'director', 'hr', 'manager', 'employee']), userRouter)
  return app
}

// ─── GET /api/users ───────────────────────────────────────────────────────────

describe('GET /api/users', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/users')
    expect(res.status).toBe(401)
  })

  it('admin receives all users with no managerId filter', async () => {
    User.find = jest.fn(() => makeChain([{ _id: EMPLOYEE_ID, role: 'employee' }]))
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    const [filter] = User.find.mock.calls[0]
    expect(filter.managerId).toBeUndefined()
  })

  it('hr receives all users with no managerId filter', async () => {
    User.find = jest.fn(() => makeChain([]))
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
    expect(res.status).toBe(200)
    const [filter] = User.find.mock.calls[0]
    expect(filter.managerId).toBeUndefined()
  })

  it('manager only sees their direct reports', async () => {
    User.find = jest.fn(() => makeChain([{ _id: EMPLOYEE_ID, managerId: MANAGER_ID }]))
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', `token=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
    expect(res.status).toBe(200)
    const [filter] = User.find.mock.calls[0]
    expect(filter.managerId).toBe(MANAGER_ID)
  })

  it('employee gets 403 (cannot list users)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(403)
  })

  it('applies role filter when ?role=manager is passed', async () => {
    User.find = jest.fn(() => makeChain([]))
    const res = await request(app)
      .get('/api/users?role=manager')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    const [filter] = User.find.mock.calls[0]
    expect(filter.role).toBe('manager')
  })

  it('applies search filter when ?search=alice is passed', async () => {
    User.find = jest.fn(() => makeChain([]))
    const res = await request(app)
      .get('/api/users?search=alice')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    const [filter] = User.find.mock.calls[0]
    expect(filter.$or).toBeDefined()
  })

  it('paginates when ?page=1 is passed', async () => {
    User.find           = jest.fn(() => makeChain([]))
    User.countDocuments = jest.fn().mockResolvedValue(42)
    const res = await request(app)
      .get('/api/users?page=1&limit=10')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(42)
    expect(res.body.page).toBe(1)
    expect(res.body.limit).toBe(10)
  })
})

// ─── GET /api/users/:id ───────────────────────────────────────────────────────

describe('GET /api/users/:id', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('returns 400 for an invalid ObjectId', async () => {
    const res = await request(app)
      .get('/api/users/not-a-valid-id')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('returns 404 for a nonexistent user', async () => {
    User.findById = jest.fn(() => makeChain(null))
    const res = await request(app)
      .get(`/api/users/${OTHER_ID}`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(404)
  })

  it('admin can fetch any user', async () => {
    User.findById = jest.fn(() => makeChain({ _id: EMPLOYEE_ID, email: 'emp@corp.com' }))
    const res = await request(app)
      .get(`/api/users/${EMPLOYEE_ID}`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    expect(res.body.email).toBe('emp@corp.com')
  })

  it('employee can fetch their own profile', async () => {
    User.findById = jest.fn(() => makeChain({ _id: EMPLOYEE_ID, email: 'emp@corp.com' }))
    const res = await request(app)
      .get(`/api/users/${EMPLOYEE_ID}`)
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(200)
  })

  it('employee cannot fetch another user — 403', async () => {
    User.findById = jest.fn(() => makeChain({ _id: OTHER_ID, email: 'other@corp.com' }))
    const res = await request(app)
      .get(`/api/users/${OTHER_ID}`)
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(403)
  })

  it('manager can fetch a direct report', async () => {
    User.findById = jest.fn(() =>
      makeChain({ _id: EMPLOYEE_ID, email: 'emp@corp.com', managerId: { toString: () => MANAGER_ID } })
    )
    const res = await request(app)
      .get(`/api/users/${EMPLOYEE_ID}`)
      .set('Cookie', `token=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
    expect(res.status).toBe(200)
  })

  it('manager cannot fetch a user outside their team — 403', async () => {
    User.findById = jest.fn(() =>
      makeChain({ _id: OTHER_ID, email: 'other@corp.com', managerId: { toString: () => 'someone-else' } })
    )
    const res = await request(app)
      .get(`/api/users/${OTHER_ID}`)
      .set('Cookie', `token=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
    expect(res.status).toBe(403)
  })

  it('passwordHash is never included in the response', async () => {
    // The route calls .select('-passwordHash -ldapDn') on the Mongoose query.
    // Our mock simulates this by simply not including the field in the returned object.
    User.findById = jest.fn(() => makeChain({ _id: ADMIN_ID, email: 'admin@corp.com' }))
    const res = await request(app)
      .get(`/api/users/${ADMIN_ID}`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    expect(res.body.passwordHash).toBeUndefined()
  })
})

// ─── POST /api/users ──────────────────────────────────────────────────────────

describe('POST /api/users', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
    User.prototype.save.mockResolvedValue(undefined)
    User.prototype.toObject.mockImplementation(function () {
      const { save, toObject, ...rest } = this  // eslint-disable-line no-unused-vars
      return rest
    })
  })

  it('returns 403 for a non-admin/hr caller (manager)', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', `token=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
      .send({ firstName: 'Bob', lastName: 'Smith', email: 'bob@corp.com', role: 'employee' })
    expect(res.status).toBe(403)
  })

  it('returns 422 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ firstName: 'Bob' })  // missing lastName + email + role
    expect(res.status).toBe(422)
    expect(res.body.error).toBe('Données invalides')
  })

  it('returns 422 for an invalid role value', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ firstName: 'Bob', lastName: 'Smith', email: 'bob@corp.com', role: 'superadmin' })
    expect(res.status).toBe(422)
    expect(res.body.error).toBe('Données invalides')
  })

  it('hr can create a user and receives 201 + tempPassword', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ firstName: 'Bob', lastName: 'Smith', email: 'bob@corp.com', role: 'employee' })
    expect(res.status).toBe(201)
    expect(res.body.tempPassword).toBeDefined()
    expect(typeof res.body.tempPassword).toBe('string')
    expect(res.body.tempPassword.length).toBeGreaterThan(0)
  })

  it('admin can create a user and the response never includes passwordHash', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ firstName: 'Carol', lastName: 'White', email: 'carol@corp.com', role: 'employee' })
    expect(res.status).toBe(201)
    expect(res.body.passwordHash).toBeUndefined()
  })

  it('returns 409 on duplicate email (MongoDB code 11000)', async () => {
    const dupErr = Object.assign(new Error('E11000 duplicate key'), { code: 11000 })
    User.prototype.save.mockRejectedValueOnce(dupErr)
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ firstName: 'Bob', lastName: 'Smith', email: 'existing@corp.com', role: 'employee' })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/déjà utilisé/i)
  })
})

// ─── PATCH /api/users/:id ─────────────────────────────────────────────────────

describe('PATCH /api/users/:id', () => {
  const app = buildApp()

  // Return a full Mongoose-like doc (with save/toObject) from findById
  function mockFindByIdUser(overrides = {}) {
    const data = {
      _id: EMPLOYEE_ID, email: 'emp@corp.com',
      firstName: 'Alice', lastName: 'Martin', role: 'employee',
      ...overrides,
    }
    const doc = Object.assign({}, data, {
      save:     User.prototype.save,
      toObject: User.prototype.toObject,
    })
    User.findById = jest.fn().mockResolvedValue(doc)
  }

  beforeEach(() => {
    jest.clearAllMocks()
    User.prototype.save.mockResolvedValue(undefined)
    User.prototype.toObject.mockImplementation(function () {
      const { save, toObject, ...rest } = this  // eslint-disable-line no-unused-vars
      return rest
    })
  })

  it('returns 403 when a non-admin/non-self tries to patch', async () => {
    // Employee tries to patch a different user's profile
    const res = await request(app)
      .patch(`/api/users/${OTHER_ID}`)
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ firstName: 'Hacked' })
    expect(res.status).toBe(403)
  })

  it('returns 403 when employee tries to change their own role', async () => {
    mockFindByIdUser()
    const res = await request(app)
      .patch(`/api/users/${EMPLOYEE_ID}`)
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ role: 'admin' })
    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/role/i)
  })

  it('returns 403 when employee tries to change their own department', async () => {
    mockFindByIdUser()
    const res = await request(app)
      .patch(`/api/users/${EMPLOYEE_ID}`)
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ department: 'Engineering' })
    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/department/i)
  })

  it('admin can update protected fields (role, isActive)', async () => {
    mockFindByIdUser()
    const res = await request(app)
      .patch(`/api/users/${EMPLOYEE_ID}`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ role: 'manager', isActive: false })
    expect(res.status).toBe(200)
  })

  it('returns 404 for a nonexistent user', async () => {
    User.findById = jest.fn().mockResolvedValue(null)
    const res = await request(app)
      .patch(`/api/users/${OTHER_ID}`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ role: 'hr' })
    expect(res.status).toBe(404)
  })

  it('returns 400 for an invalid ObjectId', async () => {
    const res = await request(app)
      .patch('/api/users/bad-id')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ role: 'hr' })
    expect(res.status).toBe(400)
  })
})
