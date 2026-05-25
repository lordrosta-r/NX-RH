'use strict'

// =============================================================================
// Integration tests — routes/mobility.js
// Mocked: authGuard (JWT-only, no DB), MobilityRequest, User, paginate
// Routes tested:
//   GET    /api/mobility
//   POST   /api/mobility
//   GET    /api/mobility/:id
//   PATCH  /api/mobility/:id
//   DELETE /api/mobility/:id
// + end-to-end workflow: create → validate → list by status
// =============================================================================

const jwt = require('jsonwebtoken')

// ─── authGuard mock ───────────────────────────────────────────────────────────
// Stateless JWT check — no DB call — matching the pattern from offboarding tests.

jest.mock('../../middleware/authGuard', () => ({
  authGuard: (roles = []) => (req, res, next) => {
    const _jwt = require('jsonwebtoken')
    const token = req.cookies?.accessToken
    if (!token) return res.status(401).json({ error: 'Authentication required' })
    try {
      const payload = _jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
      if (roles.length && !roles.includes(payload.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }
      req.user = { ...payload, _id: payload.id }
      next()
    } catch {
      return res.status(401).json({ error: 'Token invalide' })
    }
  },
}))

// ─── MobilityRequest mock ─────────────────────────────────────────────────────

jest.mock('../../models/MobilityRequest', () => {
  function _chain(r) {
    return {
      populate:      jest.fn().mockReturnThis(),
      sort:          jest.fn().mockReturnThis(),
      skip:          jest.fn().mockReturnThis(),
      limit:         jest.fn().mockReturnThis(),
      lean:          jest.fn().mockResolvedValue(r),
    }
  }
  function MockMR(data) { Object.assign(this, data) }
  MockMR.prototype.save      = jest.fn().mockResolvedValue(undefined)
  MockMR.prototype.deleteOne = jest.fn().mockResolvedValue(undefined)
  MockMR.create              = jest.fn()
  MockMR.findById            = jest.fn()
  MockMR.find                = jest.fn(() => _chain([]))
  MockMR.countDocuments      = jest.fn().mockResolvedValue(0)
  MockMR.aggregate           = jest.fn().mockResolvedValue([])
  return MockMR
})

// ─── paginate mock ────────────────────────────────────────────────────────────

jest.mock('../../utils/paginate', () => ({
  paginate: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, pages: 1 }),
}))

// ─────────────────────────────────────────────────────────────────────────────

const SECRET = 'test-secret-long-enough-for-hs256-algorithm'
process.env.JWT_SECRET = SECRET
process.env.NODE_ENV   = 'test'

const supertest        = require('supertest')
const express          = require('express')
const cookieParser     = require('cookie-parser')
// authGuard is mocked above — required to ensure the mock is registered
const { authGuard: _authGuard } = require('../../middleware/authGuard')   
const MobilityRequest  = require('../../models/MobilityRequest')
const { paginate }     = require('../../utils/paginate')
const mobilityRouter   = require('../../routes/mobility')

// ─── IDs ──────────────────────────────────────────────────────────────────────

const EMPLOYEE_ID = '507f1f77bcf86cd799439012'
const HR_ID       = '507f1f77bcf86cd799439013'
const VALID_ID    = '507f1f77bcf86cd799439011'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tokenFor({ id, role }) {
  return jwt.sign({ id, email: `${role}@corp.com`, role }, SECRET, {
    algorithm: 'HS256', expiresIn: '1h',
  })
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/mobility', mobilityRouter)
   
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' })
  })
  return app
}

function makePendingDoc(overrides = {}) {
  const doc = {
    _id:        VALID_ID,
    employeeId: EMPLOYEE_ID,
    status:     'pending',
    ...overrides,
  }
  doc.save      = jest.fn().mockResolvedValue(doc)
  doc.deleteOne = jest.fn().mockResolvedValue(undefined)
  return doc
}

const app = buildApp()

// ─── GET /api/mobility ────────────────────────────────────────────────────────

describe('GET /api/mobility', () => {
  beforeEach(() => jest.clearAllMocks())

  it('should return 401 when not authenticated', async () => {
    const res = await supertest(app).get('/api/mobility')
    expect(res.status).toBe(401)
  })

  it('should return list for authenticated employee', async () => {
    paginate.mockResolvedValueOnce({ data: [], total: 0, page: 1, limit: 20, pages: 1 })

    const res = await supertest(app)
      .get('/api/mobility')
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('should return list for HR', async () => {
    const fakeData = [{ _id: VALID_ID, status: 'pending' }]
    paginate.mockResolvedValueOnce({ data: fakeData, total: 1, page: 1, limit: 20, pages: 1 })

    const res = await supertest(app)
      .get('/api/mobility')
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)

    expect(res.status).toBe(200)
    expect(res.body.total).toBe(1)
    expect(res.body.data).toHaveLength(1)
  })

  it('should pass status query param to service', async () => {
    paginate.mockResolvedValueOnce({ data: [], total: 0, page: 1, limit: 20, pages: 1 })

    await supertest(app)
      .get('/api/mobility?status=approved')
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)

    expect(paginate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'approved' }),
      expect.any(Object),
    )
  })
})

// ─── POST /api/mobility ───────────────────────────────────────────────────────

describe('POST /api/mobility', () => {
  beforeEach(() => jest.clearAllMocks())

  it('should return 401 when not authenticated', async () => {
    const res = await supertest(app)
      .post('/api/mobility')
      .send({ targetPosition: 'Manager' })
    expect(res.status).toBe(401)
  })

  it('should create request and return 201 when authenticated', async () => {
    const created = {
      _id:            VALID_ID,
      employeeId:     EMPLOYEE_ID,
      targetPosition: 'Manager',
      status:         'pending',
      populate:       jest.fn().mockResolvedValue({
        _id: VALID_ID, targetPosition: 'Manager', status: 'pending',
      }),
    }
    MobilityRequest.create.mockResolvedValue(created)

    const res = await supertest(app)
      .post('/api/mobility')
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ targetPosition: 'Manager', requestType: 'promotion' })

    expect(res.status).toBe(201)
    expect(res.body.data).toHaveProperty('_id', VALID_ID)
  })

  it('should return 400 when targetPosition is missing', async () => {
    const res = await supertest(app)
      .post('/api/mobility')
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ requestType: 'promotion' })

    expect(res.status).toBe(400)
  })
})

// ─── GET /api/mobility/:id ────────────────────────────────────────────────────

describe('GET /api/mobility/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('should return 401 when not authenticated', async () => {
    const res = await supertest(app).get(`/api/mobility/${VALID_ID}`)
    expect(res.status).toBe(401)
  })

  it('should return request detail for HR', async () => {
    const fakeRequest = {
      _id:        VALID_ID,
      employeeId: { _id: EMPLOYEE_ID, firstName: 'Alice' },
      status:     'pending',
    }
    const chain = {
      populate: jest.fn().mockReturnThis(),
      lean:     jest.fn().mockResolvedValue(fakeRequest),
    }
    MobilityRequest.findById.mockReturnValue(chain)

    const res = await supertest(app)
      .get(`/api/mobility/${VALID_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('_id', VALID_ID)
  })

  it('should return 404 for non-existent id', async () => {
    const chain = {
      populate: jest.fn().mockReturnThis(),
      lean:     jest.fn().mockResolvedValue(null),
    }
    MobilityRequest.findById.mockReturnValue(chain)

    const res = await supertest(app)
      .get(`/api/mobility/${VALID_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)

    expect(res.status).toBe(404)
  })

  it('should return 403 if employee tries to access another user\'s request', async () => {
    const OTHER_ID = '507f1f77bcf86cd799439099'
    const fakeRequest = {
      _id:        VALID_ID,
      employeeId: { _id: OTHER_ID },
      status:     'pending',
    }
    const chain = {
      populate: jest.fn().mockReturnThis(),
      lean:     jest.fn().mockResolvedValue(fakeRequest),
    }
    MobilityRequest.findById.mockReturnValue(chain)

    const res = await supertest(app)
      .get(`/api/mobility/${VALID_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)

    expect(res.status).toBe(403)
  })
})

// ─── PATCH /api/mobility/:id ──────────────────────────────────────────────────

describe('PATCH /api/mobility/:id — validate (HR)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('should return 401 when not authenticated', async () => {
    const res = await supertest(app)
      .patch(`/api/mobility/${VALID_ID}`)
      .send({ status: 'approved' })
    expect(res.status).toBe(401)
  })

  it('should allow HR to approve a request', async () => {
    const doc = makePendingDoc()
    MobilityRequest.findById.mockResolvedValue(doc)

    const res = await supertest(app)
      .patch(`/api/mobility/${VALID_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ status: 'approved' })

    expect(res.status).toBe(200)
    expect(doc.save).toHaveBeenCalled()
  })

  it('should allow HR to reject with comment', async () => {
    const doc = makePendingDoc()
    MobilityRequest.findById.mockResolvedValue(doc)

    const res = await supertest(app)
      .patch(`/api/mobility/${VALID_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ status: 'rejected', hrComment: 'Budget freeze' })

    expect(res.status).toBe(200)
    expect(doc.hrComment).toBe('Budget freeze')
  })

  it('should return 403 for employee trying to approve their own request', async () => {
    const doc = makePendingDoc({ employeeId: '507f1f77bcf86cd799439099' }) // not employee's own
    MobilityRequest.findById.mockResolvedValue(doc)

    const res = await supertest(app)
      .patch(`/api/mobility/${VALID_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ status: 'approved' })

    expect(res.status).toBe(403)
  })

  it('should return 404 for non-existent request', async () => {
    MobilityRequest.findById.mockResolvedValue(null)

    const res = await supertest(app)
      .patch(`/api/mobility/${VALID_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ status: 'approved' })

    expect(res.status).toBe(404)
  })
})

// ─── DELETE /api/mobility/:id ─────────────────────────────────────────────────

describe('DELETE /api/mobility/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('should return 401 when not authenticated', async () => {
    const res = await supertest(app).delete(`/api/mobility/${VALID_ID}`)
    expect(res.status).toBe(401)
  })

  it('should allow HR to delete any request', async () => {
    const doc = makePendingDoc({ status: 'approved' })
    MobilityRequest.findById.mockResolvedValue(doc)

    const res = await supertest(app)
      .delete(`/api/mobility/${VALID_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)

    expect(res.status).toBe(200)
    expect(doc.deleteOne).toHaveBeenCalled()
  })

  it('should allow employee to delete their own pending request', async () => {
    const doc = makePendingDoc({ employeeId: EMPLOYEE_ID, status: 'pending' })
    MobilityRequest.findById.mockResolvedValue(doc)

    const res = await supertest(app)
      .delete(`/api/mobility/${VALID_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)

    expect(res.status).toBe(200)
    expect(doc.deleteOne).toHaveBeenCalled()
  })
})

// ─── Workflow end-to-end: create → validate → list by status ─────────────────

describe('Mobility workflow: create → validate → list by status', () => {
  beforeEach(() => jest.clearAllMocks())

  it('should follow full lifecycle', async () => {
    // ── Step 1: Employee creates a request ────────────────────────────────────
    const pendingDoc = {
      _id:            VALID_ID,
      employeeId:     EMPLOYEE_ID,
      targetPosition: 'Manager',
      status:         'pending',
      populate:       jest.fn().mockResolvedValue({
        _id:            VALID_ID,
        employeeId:     EMPLOYEE_ID,
        targetPosition: 'Manager',
        status:         'pending',
      }),
      save:      jest.fn(),
      deleteOne: jest.fn(),
    }
    MobilityRequest.create.mockResolvedValue(pendingDoc)

    const createRes = await supertest(app)
      .post('/api/mobility')
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ targetPosition: 'Manager', requestType: 'promotion' })

    expect(createRes.status).toBe(201)
    const requestId = createRes.body.data._id
    expect(createRes.body.data.status).toBe('pending')

    // ── Step 2: HR approves the request ───────────────────────────────────────
    const approvedDoc = { ...pendingDoc, status: 'approved' }
    approvedDoc.save = jest.fn().mockImplementation(function () {
      return Promise.resolve(this)
    })
    MobilityRequest.findById.mockResolvedValue(approvedDoc)

    const validateRes = await supertest(app)
      .patch(`/api/mobility/${requestId}`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ status: 'approved' })

    expect(validateRes.status).toBe(200)

    // ── Step 3: List approved requests ────────────────────────────────────────
    paginate.mockResolvedValueOnce({
      data:  [{ _id: requestId, status: 'approved' }],
      total: 1, page: 1, limit: 20, pages: 1,
    })

    const listRes = await supertest(app)
      .get('/api/mobility?status=approved')
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)

    expect(listRes.status).toBe(200)
    expect(listRes.body.data.some(r => r._id === requestId)).toBe(true)
    expect(paginate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'approved' }),
      expect.any(Object),
    )
  })
})

// ─── GET /api/mobility/stats ──────────────────────────────────────────────────

describe('GET /api/mobility/stats', () => {
  beforeEach(() => jest.clearAllMocks())

  it('should return 401 when not authenticated', async () => {
    const res = await supertest(app).get('/api/mobility/stats')
    expect(res.status).toBe(401)
  })

  it('should return 403 for employee role', async () => {
    const res = await supertest(app)
      .get('/api/mobility/stats')
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(403)
  })

  it('should return stats for HR with correct shape', async () => {
    MobilityRequest.aggregate
      .mockResolvedValueOnce([{ _id: 'approved', count: 5 }, { _id: 'pending', count: 3 }])
      .mockResolvedValueOnce([{ _id: 'internal_transfer', count: 4 }, { _id: 'promotion', count: 4 }])
      .mockResolvedValueOnce([{ _id: null, avgDays: 7.3 }])
    MobilityRequest.countDocuments.mockResolvedValue(8)

    const res = await supertest(app)
      .get('/api/mobility/stats')
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      total: 8,
      approvalRate: 63,
      avgProcessingDays: 7,
      byStatus: expect.objectContaining({ approved: 5, pending: 3 }),
      byType: expect.objectContaining({ internal_transfer: 4, promotion: 4 }),
    })
  })

  it('should return stats for admin role', async () => {
    MobilityRequest.aggregate.mockResolvedValue([])
    MobilityRequest.countDocuments.mockResolvedValue(0)

    const res = await supertest(app)
      .get('/api/mobility/stats')
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'admin' })}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ total: 0, approvalRate: 0, byStatus: {}, byType: {} })
  })
})

// ─── POST /api/mobility/:id/complete ─────────────────────────────────────────

describe('POST /api/mobility/:id/complete', () => {
  beforeEach(() => jest.clearAllMocks())

  it('should return 401 when not authenticated', async () => {
    const res = await supertest(app).post(`/api/mobility/${VALID_ID}/complete`)
    expect(res.status).toBe(401)
  })

  it('should return 403 when employee tries to complete', async () => {
    const doc = makePendingDoc({ status: 'approved', employeeId: EMPLOYEE_ID })
    MobilityRequest.findById.mockResolvedValue(doc)

    const res = await supertest(app)
      .post(`/api/mobility/${VALID_ID}/complete`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ notes: 'Done' })

    expect(res.status).toBe(403)
  })

  it('should allow HR to mark an approved request as completed', async () => {
    const doc = makePendingDoc({ status: 'approved' })
    MobilityRequest.findById.mockResolvedValue(doc)

    const res = await supertest(app)
      .post(`/api/mobility/${VALID_ID}/complete`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ notes: 'Transition effectuée' })

    expect(res.status).toBe(200)
    expect(doc.save).toHaveBeenCalled()
    expect(doc.implementation).toMatchObject({ status: 'completed', notes: 'Transition effectuée' })
  })

  it('should return 400 when trying to complete a non-approved request', async () => {
    const doc = makePendingDoc({ status: 'pending' })
    MobilityRequest.findById.mockResolvedValue(doc)

    const res = await supertest(app)
      .post(`/api/mobility/${VALID_ID}/complete`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)

    expect(res.status).toBe(400)
  })

  it('should return 404 for non-existent request', async () => {
    MobilityRequest.findById.mockResolvedValue(null)

    const res = await supertest(app)
      .post(`/api/mobility/${VALID_ID}/complete`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)

    expect(res.status).toBe(404)
  })
})

// ─── GET /api/mobility/history/:employeeId ────────────────────────────────────

describe('GET /api/mobility/history/:employeeId', () => {
  beforeEach(() => jest.clearAllMocks())

  it('should return 401 when not authenticated', async () => {
    const res = await supertest(app).get(`/api/mobility/history/${EMPLOYEE_ID}`)
    expect(res.status).toBe(401)
  })

  it('should allow HR to view any employee history', async () => {
    const fakeHistory = [
      { _id: VALID_ID, status: 'approved', createdAt: new Date().toISOString() },
    ]
    const chain = {
      populate: jest.fn().mockReturnThis(),
      sort:     jest.fn().mockReturnThis(),
      lean:     jest.fn().mockResolvedValue(fakeHistory),
    }
    MobilityRequest.find.mockReturnValue(chain)

    const res = await supertest(app)
      .get(`/api/mobility/history/${EMPLOYEE_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data).toHaveLength(1)
  })

  it('should allow employee to view their own history', async () => {
    const chain = {
      populate: jest.fn().mockReturnThis(),
      sort:     jest.fn().mockReturnThis(),
      lean:     jest.fn().mockResolvedValue([]),
    }
    MobilityRequest.find.mockReturnValue(chain)

    const res = await supertest(app)
      .get(`/api/mobility/history/${EMPLOYEE_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('should return 403 when employee tries to view another employee history', async () => {
    const OTHER_EMPLOYEE = '507f1f77bcf86cd799439099'

    const res = await supertest(app)
      .get(`/api/mobility/history/${OTHER_EMPLOYEE}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)

    expect(res.status).toBe(403)
  })
})
