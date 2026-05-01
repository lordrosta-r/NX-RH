'use strict'

// Offboarding route integration tests — no real MongoDB connection.
// Models are mocked; authGuard is mocked with inline JWT verification.
//
// Route handlers tested:
//   POST   /api/offboarding
//   GET    /api/offboarding
//   GET    /api/offboarding/:id
//   PATCH  /api/offboarding/:id
//   PATCH  /api/offboarding/:id/checklist/:itemIndex
//   DELETE /api/offboarding/:id  (admin-only inner check)

const jwt = require('jsonwebtoken')

// ─── Chainable Mongoose query stub ───────────────────────────────────────────
// Used by .find().populate()…sort()…lean() and .findById().populate()…lean()
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

// ─── Model mocks ─────────────────────────────────────────────────────────────
// NOTE: jest.mock is hoisted. We define helpers inline inside factories so they
// are available without relying on outer-scope hoisting across the mock barrier.

jest.mock('../../models/OffboardingRequest', () => {
  function _makeChain(r) {
    return {
      select:   jest.fn().mockReturnThis(),
      sort:     jest.fn().mockReturnThis(),
      skip:     jest.fn().mockReturnThis(),
      limit:    jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean:     jest.fn().mockResolvedValue(r),
    }
  }

  function MockOffboardingRequest(data) { Object.assign(this, data) }
  MockOffboardingRequest.prototype.save  = jest.fn().mockResolvedValue(undefined)
  MockOffboardingRequest.find            = jest.fn(() => _makeChain([]))
  MockOffboardingRequest.findById        = jest.fn()
  MockOffboardingRequest.findByIdAndDelete = jest.fn()
  MockOffboardingRequest.countDocuments  = jest.fn().mockResolvedValue(0)
  MockOffboardingRequest.create          = jest.fn()
  return { OffboardingRequest: MockOffboardingRequest }
})

jest.mock('../../models/User', () => ({
  findById:          jest.fn(),
  findByIdAndUpdate: jest.fn().mockResolvedValue({}),
}))

jest.mock('../../models/AuditLog', () => ({
  create: jest.fn().mockResolvedValue({}),
}))

jest.mock('../../middleware/authGuard', () => ({
  authGuard: (roles = []) => (req, res, next) => {
    const _jwt = require('jsonwebtoken')
    const token = req.cookies?.token
    if (!token) return res.status(401).json({ error: 'Authentication required' })
    try {
      const payload = _jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
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

const SECRET = 'test-secret-long-enough-for-hs256-algorithm'
process.env.JWT_SECRET = SECRET
process.env.NODE_ENV   = 'test'

const { OffboardingRequest } = require('../../models/OffboardingRequest')
const User                   = require('../../models/User')
const supertest              = require('supertest')
const express                = require('express')
const cookieParser           = require('cookie-parser')
const { authGuard }          = require('../../middleware/authGuard')
const offboardingRouter      = require('../../routes/offboarding')

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ADMIN_ID    = '507f1f77bcf86cd799439001'
const HR_ID       = '507f1f77bcf86cd799439002'
const MANAGER_ID  = '507f1f77bcf86cd799439003'
const EMPLOYEE_ID = '507f1f77bcf86cd799439004'
const DIRECTOR_ID = '507f1f77bcf86cd799439005'
const USER_ID     = '507f1f77bcf86cd799439006'
const VALID_ID    = '507f1f77bcf86cd799439011'

function tokenFor({ id, role }) {
  return jwt.sign({ id, email: `${role}@corp.com`, role }, SECRET, {
    algorithm: 'HS256', expiresIn: '1h',
  })
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/offboarding', authGuard(['admin', 'hr']), offboardingRouter)
  // Minimal error handler so unhandled errors don't leak as 500 HTML
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' })
  })
  return app
}

// Returns a plain object that mimics a saved OffboardingRequest document.
// Has a jest-mocked .save() and a two-item checklist.
function mockRequestDoc(overrides = {}) {
  return {
    _id:       VALID_ID,
    userId:    USER_ID,
    status:    'pending',
    checklist: [
      { label: 'Return equipment', done: false, doneAt: null, doneBy: null },
      { label: 'Revoke access',    done: false, doneAt: null, doneBy: null },
    ],
    notes:     null,
    save:      jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

const app = buildApp()

// ─── POST /api/offboarding ────────────────────────────────────────────────────

describe('POST /api/offboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default: no user found
    User.findById = jest.fn(() => makeChain(null))
  })

  it('401 when no token is provided', async () => {
    const res = await supertest(app).post('/api/offboarding').send({})
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/authentication required/i)
  })

  it('403 for manager (caught by authGuard — not hr or admin)', async () => {
    const res = await supertest(app)
      .post('/api/offboarding')
      .set('Cookie', `token=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
      .send({ userId: USER_ID, reason: 'resignation', lastDay: '2025-12-31' })
    expect(res.status).toBe(403)
  })

  it('403 for employee (caught by authGuard)', async () => {
    const res = await supertest(app)
      .post('/api/offboarding')
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ userId: USER_ID, reason: 'resignation', lastDay: '2025-12-31' })
    expect(res.status).toBe(403)
  })

  it('403 for director (caught by authGuard)', async () => {
    const res = await supertest(app)
      .post('/api/offboarding')
      .set('Cookie', `token=${tokenFor({ id: DIRECTOR_ID, role: 'director' })}`)
      .send({ userId: USER_ID, reason: 'resignation', lastDay: '2025-12-31' })
    expect(res.status).toBe(403)
  })

  it('400 when userId is missing', async () => {
    const res = await supertest(app)
      .post('/api/offboarding')
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ reason: 'resignation', lastDay: '2025-12-31' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/requis/i)
  })

  it('400 when reason is missing', async () => {
    const res = await supertest(app)
      .post('/api/offboarding')
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ userId: USER_ID, lastDay: '2025-12-31' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/requis/i)
  })

  it('400 when lastDay is missing', async () => {
    const res = await supertest(app)
      .post('/api/offboarding')
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ userId: USER_ID, reason: 'resignation' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/requis/i)
  })

  it('400 for an invalid userId ObjectId', async () => {
    const res = await supertest(app)
      .post('/api/offboarding')
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ userId: 'not-an-objectid', reason: 'resignation', lastDay: '2025-12-31' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('400 for reason "fired" (not in valid whitelist)', async () => {
    const res = await supertest(app)
      .post('/api/offboarding')
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ userId: USER_ID, reason: 'fired', lastDay: '2025-12-31' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/reason invalide/i)
  })

  it('400 for reason "layoff" (not in valid whitelist)', async () => {
    const res = await supertest(app)
      .post('/api/offboarding')
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ userId: USER_ID, reason: 'layoff', lastDay: '2025-12-31' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/reason invalide/i)
  })

  it('404 when the target user is not found in DB', async () => {
    User.findById = jest.fn(() => makeChain(null))
    const res = await supertest(app)
      .post('/api/offboarding')
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ userId: USER_ID, reason: 'resignation', lastDay: '2025-12-31' })
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/introuvable/i)
  })

  it('201 — hr successfully creates an offboarding request', async () => {
    User.findById = jest.fn(() => makeChain({
      _id: USER_ID, firstName: 'Alice', lastName: 'Dupont', isActive: true,
    }))
    OffboardingRequest.create = jest.fn().mockResolvedValue({
      _id: VALID_ID, userId: USER_ID, reason: 'resignation', lastDay: '2025-12-31',
    })

    const res = await supertest(app)
      .post('/api/offboarding')
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ userId: USER_ID, reason: 'resignation', lastDay: '2025-12-31', notes: '  notice given  ' })

    expect(res.status).toBe(201)
    expect(OffboardingRequest.create).toHaveBeenCalledWith(expect.objectContaining({
      userId:      USER_ID,
      requestedBy: HR_ID,
      reason:      'resignation',
    }))
  })

  it('201 — admin successfully creates an offboarding request', async () => {
    User.findById = jest.fn(() => makeChain({
      _id: USER_ID, firstName: 'Bob', lastName: 'Martin', isActive: true,
    }))
    OffboardingRequest.create = jest.fn().mockResolvedValue({
      _id: VALID_ID, userId: USER_ID, reason: 'termination',
    })

    const res = await supertest(app)
      .post('/api/offboarding')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ userId: USER_ID, reason: 'termination', lastDay: '2025-11-30' })

    expect(res.status).toBe(201)
  })

  it('201 — accepts all valid reason values (retirement)', async () => {
    User.findById = jest.fn(() => makeChain({ _id: USER_ID, isActive: true }))
    OffboardingRequest.create = jest.fn().mockResolvedValue({
      _id: VALID_ID, userId: USER_ID, reason: 'retirement',
    })

    const res = await supertest(app)
      .post('/api/offboarding')
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ userId: USER_ID, reason: 'retirement', lastDay: '2025-12-31' })

    expect(res.status).toBe(201)
  })

  it('409 when a duplicate offboarding request already exists (code 11000)', async () => {
    User.findById = jest.fn(() => makeChain({ _id: USER_ID, isActive: true }))
    OffboardingRequest.create = jest.fn().mockRejectedValue(Object.assign(new Error('dup'), { code: 11000 }))

    const res = await supertest(app)
      .post('/api/offboarding')
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ userId: USER_ID, reason: 'resignation', lastDay: '2025-12-31' })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/existe déjà/i)
  })
})

// ─── GET /api/offboarding ─────────────────────────────────────────────────────

describe('GET /api/offboarding', () => {
  beforeEach(() => jest.clearAllMocks())

  it('401 when no token is provided', async () => {
    const res = await supertest(app).get('/api/offboarding')
    expect(res.status).toBe(401)
  })

  it('403 for manager (caught by authGuard)', async () => {
    const res = await supertest(app)
      .get('/api/offboarding')
      .set('Cookie', `token=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
    expect(res.status).toBe(403)
  })

  it('200 — admin receives list with data and total', async () => {
    OffboardingRequest.find = jest.fn(() => makeChain([{ _id: VALID_ID, status: 'pending' }]))
    OffboardingRequest.countDocuments = jest.fn().mockResolvedValue(1)

    const res = await supertest(app)
      .get('/api/offboarding')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.total).toBe(1)
    expect(res.body.page).toBe(1)
  })

  it('200 — hr receives list of offboarding requests', async () => {
    OffboardingRequest.find = jest.fn(() => makeChain([]))
    OffboardingRequest.countDocuments = jest.fn().mockResolvedValue(0)

    const res = await supertest(app)
      .get('/api/offboarding')
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })

  it('applies status filter when ?status=pending', async () => {
    OffboardingRequest.find = jest.fn(() => makeChain([]))
    OffboardingRequest.countDocuments = jest.fn().mockResolvedValue(0)

    await supertest(app)
      .get('/api/offboarding?status=pending')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    const [filter] = OffboardingRequest.find.mock.calls[0]
    expect(filter.status).toBe('pending')
  })

  it('ignores an invalid status filter value', async () => {
    OffboardingRequest.find = jest.fn(() => makeChain([]))
    OffboardingRequest.countDocuments = jest.fn().mockResolvedValue(0)

    await supertest(app)
      .get('/api/offboarding?status=unknown')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    const [filter] = OffboardingRequest.find.mock.calls[0]
    expect(filter.status).toBeUndefined()
  })
})

// ─── GET /api/offboarding/:id ─────────────────────────────────────────────────

describe('GET /api/offboarding/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('400 for an invalid ObjectId', async () => {
    const res = await supertest(app)
      .get('/api/offboarding/not-a-valid-id')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('404 when the request is not found', async () => {
    OffboardingRequest.findById = jest.fn(() => makeChain(null))

    const res = await supertest(app)
      .get(`/api/offboarding/${VALID_ID}`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/introuvable/i)
  })

  it('200 — admin retrieves a single offboarding request', async () => {
    OffboardingRequest.findById = jest.fn(() => makeChain({
      _id:    VALID_ID,
      userId: { _id: USER_ID, firstName: 'Alice' },
      status: 'pending',
    }))

    const res = await supertest(app)
      .get(`/api/offboarding/${VALID_ID}`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    expect(res.status).toBe(200)
    expect(res.body._id).toBe(VALID_ID)
  })

  it('200 — hr retrieves a single offboarding request', async () => {
    OffboardingRequest.findById = jest.fn(() => makeChain({
      _id: VALID_ID, status: 'in_progress',
    }))

    const res = await supertest(app)
      .get(`/api/offboarding/${VALID_ID}`)
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)

    expect(res.status).toBe(200)
  })
})

// ─── PATCH /api/offboarding/:id ───────────────────────────────────────────────

describe('PATCH /api/offboarding/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('400 for an invalid ObjectId', async () => {
    const res = await supertest(app)
      .patch('/api/offboarding/not-valid')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ status: 'in_progress' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('404 when the request does not exist', async () => {
    OffboardingRequest.findById = jest.fn().mockResolvedValue(null)

    const res = await supertest(app)
      .patch(`/api/offboarding/${VALID_ID}`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ status: 'in_progress' })

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/introuvable/i)
  })

  it('400 for an invalid status value', async () => {
    OffboardingRequest.findById = jest.fn().mockResolvedValue(mockRequestDoc())

    const res = await supertest(app)
      .patch(`/api/offboarding/${VALID_ID}`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ status: 'cancelled' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/status invalide/i)
  })

  it('200 — hr updates status to in_progress', async () => {
    const doc = mockRequestDoc()
    // Call 1: direct await — returns mutable doc
    // Call 2: .populate().lean() chain for populated response
    OffboardingRequest.findById = jest.fn()
      .mockResolvedValueOnce(doc)
      .mockReturnValueOnce(makeChain({ ...doc, status: 'in_progress' }))

    const res = await supertest(app)
      .patch(`/api/offboarding/${VALID_ID}`)
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ status: 'in_progress' })

    expect(res.status).toBe(200)
    expect(doc.save).toHaveBeenCalled()
    expect(doc.status).toBe('in_progress')
  })

  it('200 — admin updates notes', async () => {
    const doc = mockRequestDoc()
    OffboardingRequest.findById = jest.fn()
      .mockResolvedValueOnce(doc)
      .mockReturnValueOnce(makeChain({ ...doc, notes: 'Updated notes' }))

    const res = await supertest(app)
      .patch(`/api/offboarding/${VALID_ID}`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ notes: 'Updated notes' })

    expect(res.status).toBe(200)
    expect(doc.notes).toBe('Updated notes')
  })

  it('200 — completing offboarding archives the user via findByIdAndUpdate', async () => {
    const doc = mockRequestDoc({ userId: USER_ID })
    OffboardingRequest.findById = jest.fn()
      .mockResolvedValueOnce(doc)
      .mockReturnValueOnce(makeChain({ ...doc, status: 'completed' }))
    User.findByIdAndUpdate = jest.fn().mockResolvedValue({})

    const res = await supertest(app)
      .patch(`/api/offboarding/${VALID_ID}`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ status: 'completed' })

    expect(res.status).toBe(200)
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ isActive: false, offboardingStatus: 'offboarded' }),
    )
  })
})

// ─── PATCH /api/offboarding/:id/checklist/:itemIndex ─────────────────────────

describe('PATCH /api/offboarding/:id/checklist/:itemIndex', () => {
  beforeEach(() => jest.clearAllMocks())

  it('400 for an invalid ObjectId in :id', async () => {
    const res = await supertest(app)
      .patch('/api/offboarding/not-valid/checklist/0')
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ done: true })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('400 for a non-numeric itemIndex', async () => {
    const res = await supertest(app)
      .patch(`/api/offboarding/${VALID_ID}/checklist/abc`)
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ done: true })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/itemIndex invalide/i)
  })

  it('400 for a negative itemIndex', async () => {
    const res = await supertest(app)
      .patch(`/api/offboarding/${VALID_ID}/checklist/-1`)
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ done: true })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/itemIndex invalide/i)
  })

  it('404 when the offboarding request is not found', async () => {
    OffboardingRequest.findById = jest.fn().mockResolvedValue(null)

    const res = await supertest(app)
      .patch(`/api/offboarding/${VALID_ID}/checklist/0`)
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ done: true })

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/introuvable/i)
  })

  it('400 when itemIndex is out of checklist bounds', async () => {
    OffboardingRequest.findById = jest.fn().mockResolvedValue(
      mockRequestDoc({ checklist: [{ label: 'Only item', done: false }] }),
    )

    const res = await supertest(app)
      .patch(`/api/offboarding/${VALID_ID}/checklist/5`)
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ done: true })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/hors limites/i)
  })

  it('200 — marks a checklist item as done and auto-transitions to in_progress', async () => {
    const doc = mockRequestDoc({ status: 'pending' })
    const populatedDoc = {
      ...doc,
      checklist: [
        { label: 'Return equipment', done: true, doneAt: new Date().toISOString(), doneBy: HR_ID },
        { label: 'Revoke access',    done: false, doneAt: null, doneBy: null },
      ],
      status: 'in_progress',
    }
    OffboardingRequest.findById = jest.fn()
      .mockResolvedValueOnce(doc)
      .mockReturnValueOnce(makeChain(populatedDoc))

    const res = await supertest(app)
      .patch(`/api/offboarding/${VALID_ID}/checklist/0`)
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ done: true })

    expect(res.status).toBe(200)
    expect(doc.save).toHaveBeenCalled()
    // Auto-transition: first done item on a pending request → in_progress
    expect(doc.status).toBe('in_progress')
    expect(doc.checklist[0].done).toBe(true)
    expect(doc.checklist[0].doneBy).toBe(HR_ID)
  })

  it('200 — marks a checklist item as undone', async () => {
    const doc = mockRequestDoc({
      status: 'in_progress',
      checklist: [
        { label: 'Return equipment', done: true, doneAt: new Date(), doneBy: HR_ID },
      ],
    })
    OffboardingRequest.findById = jest.fn()
      .mockResolvedValueOnce(doc)
      .mockReturnValueOnce(makeChain({ ...doc }))

    const res = await supertest(app)
      .patch(`/api/offboarding/${VALID_ID}/checklist/0`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ done: false })

    expect(res.status).toBe(200)
    expect(doc.checklist[0].done).toBe(false)
    expect(doc.checklist[0].doneAt).toBeNull()
    expect(doc.checklist[0].doneBy).toBeNull()
  })
})

// ─── DELETE /api/offboarding/:id ─────────────────────────────────────────────

describe('DELETE /api/offboarding/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('403 for hr — route has an inner admin-only check (ADMIN_ROLES = ["admin"])', async () => {
    const res = await supertest(app)
      .delete(`/api/offboarding/${VALID_ID}`)
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/administrateur/i)
  })

  it('400 for an invalid ObjectId', async () => {
    const res = await supertest(app)
      .delete('/api/offboarding/not-valid')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('404 when the request does not exist', async () => {
    OffboardingRequest.findByIdAndDelete = jest.fn().mockResolvedValue(null)

    const res = await supertest(app)
      .delete(`/api/offboarding/${VALID_ID}`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/introuvable/i)
  })

  it('204 — admin successfully deletes an offboarding request', async () => {
    OffboardingRequest.findByIdAndDelete = jest.fn().mockResolvedValue({
      _id: VALID_ID, userId: USER_ID,
    })

    const res = await supertest(app)
      .delete(`/api/offboarding/${VALID_ID}`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    expect(res.status).toBe(204)
    expect(res.body).toEqual({})
  })
})
