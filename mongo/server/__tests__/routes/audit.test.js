'use strict'

// =============================================================================
// routes/audit.js — Integration tests
// Covers: auth (401/403), GET /api/admin/audit pagination & filters
// AuditLog model is fully mocked — no DB connection required.
// =============================================================================

const jwt = require('jsonwebtoken')

// ─── Mock: authGuard ──────────────────────────────────────────────────────────
jest.mock('../../middleware/authGuard', () => ({
  authGuard: (roles = []) => (req, res, next) => {
    const _jwt = require('jsonwebtoken')
    const token = req.cookies?.accessToken
    if (!token) return res.status(401).json({ error: 'Authentication required' })
    try {
      const payload = _jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
      if (roles.length && !roles.includes(payload.role)) return res.status(403).json({ error: 'Insufficient permissions' })
      req.user = payload
      next()
    } catch { return res.status(401).json({ error: 'Token invalide' }) }
  },
}))

// ─── Mock: models barrel (audit.js uses `require('../models')`) ───────────────
jest.mock('../../models', () => {
  function makeChain(result) {
    return {
      populate: jest.fn().mockReturnThis(),
      sort:     jest.fn().mockReturnThis(),
      skip:     jest.fn().mockReturnThis(),
      limit:    jest.fn().mockReturnThis(),
      lean:     jest.fn().mockResolvedValue(result),
    }
  }

  return {
    AuditLog: {
      find:           jest.fn(() => makeChain([])),
      countDocuments: jest.fn().mockResolvedValue(0),
    },
  }
})

// ─── Environment ─────────────────────────────────────────────────────────────
const SECRET = 'test-secret-long-enough-for-hs256-algorithm'
process.env.JWT_SECRET = SECRET
process.env.NODE_ENV   = 'test'

// ─── Imports (after mocks) ────────────────────────────────────────────────────
const request      = require('supertest')
const express      = require('express')
const cookieParser = require('cookie-parser')

const { authGuard }   = require('../../middleware/authGuard')
const auditRouter     = require('../../routes/audit')
const { AuditLog }    = require('../../models')

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns a fresh chainable query object whose .lean() resolves to result. */
function makeChain(result) {
  return {
    populate: jest.fn().mockReturnThis(),
    sort:     jest.fn().mockReturnThis(),
    skip:     jest.fn().mockReturnThis(),
    limit:    jest.fn().mockReturnThis(),
    lean:     jest.fn().mockResolvedValue(result),
  }
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/admin/audit', authGuard(['admin', 'hr']), auditRouter)
  return app
}

function tokenFor({ id, role }) {
  return jwt.sign({ id, email: `${role}@corp.com`, role }, SECRET, { algorithm: 'HS256', expiresIn: '1h' })
}

// ─── Tokens ───────────────────────────────────────────────────────────────────
const ADMIN_TOKEN    = tokenFor({ id: '507f1f77bcf86cd799439011', role: 'admin' })
const HR_TOKEN       = tokenFor({ id: '507f1f77bcf86cd799439012', role: 'hr' })
const MANAGER_TOKEN  = tokenFor({ id: '507f1f77bcf86cd799439013', role: 'manager' })
const EMPLOYEE_TOKEN = tokenFor({ id: '507f1f77bcf86cd799439014', role: 'employee' })
const DIRECTOR_TOKEN = tokenFor({ id: '507f1f77bcf86cd799439015', role: 'director' })

// Valid MongoDB ObjectId strings used in filter tests
const VALID_OBJECT_ID = '507f1f77bcf86cd799439099'

// =============================================================================
// Test suite
// =============================================================================

describe('routes/audit.js', () => {
  let app

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset to a safe default implementation after clearAllMocks
    AuditLog.find.mockImplementation(() => makeChain([]))
    AuditLog.countDocuments.mockResolvedValue(0)
    app = buildApp()
  })

  // ── Authentication (401) ────────────────────────────────────────────────────

  describe('401 — unauthenticated request', () => {
    it('returns 401 when no cookie is provided', async () => {
      const res = await request(app).get('/api/admin/audit')
      expect(res.status).toBe(401)
      expect(res.body).toHaveProperty('error')
    })
  })

  // ── Authorization (403) ─────────────────────────────────────────────────────

  describe('403 — roles without access', () => {
    it('manager → 403', async () => {
      const res = await request(app)
        .get('/api/admin/audit')
        .set('Cookie', `accessToken=${MANAGER_TOKEN}`)
      expect(res.status).toBe(403)
    })

    it('employee → 403', async () => {
      const res = await request(app)
        .get('/api/admin/audit')
        .set('Cookie', `accessToken=${EMPLOYEE_TOKEN}`)
      expect(res.status).toBe(403)
    })

    it('director → 403', async () => {
      const res = await request(app)
        .get('/api/admin/audit')
        .set('Cookie', `accessToken=${DIRECTOR_TOKEN}`)
      expect(res.status).toBe(403)
    })
  })

  // ── 200 — authorized roles ──────────────────────────────────────────────────

  describe('200 — authorized roles', () => {
    it('admin can list audit logs', async () => {
      const res = await request(app)
        .get('/api/admin/audit')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
      expect(res.status).toBe(200)
    })

    it('hr can list audit logs', async () => {
      const res = await request(app)
        .get('/api/admin/audit')
        .set('Cookie', `accessToken=${HR_TOKEN}`)
      expect(res.status).toBe(200)
    })
  })

  // ── Response shape ──────────────────────────────────────────────────────────

  describe('Response shape', () => {
    it('returns { data, total, page, limit }', async () => {
      const fakeLog = { _id: '1', action: 'login', targetType: 'User' }
      AuditLog.find.mockImplementation(() => makeChain([fakeLog]))
      AuditLog.countDocuments.mockResolvedValue(1)

      const res = await request(app)
        .get('/api/admin/audit')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({
        data:  expect.any(Array),
        total: expect.any(Number),
        page:  expect.any(Number),
        limit: expect.any(Number),
      })
    })

    it('total reflects countDocuments result', async () => {
      AuditLog.countDocuments.mockResolvedValue(42)

      const res = await request(app)
        .get('/api/admin/audit')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
      expect(res.body.total).toBe(42)
    })

    it('page and limit echo the requested values', async () => {
      const res = await request(app)
        .get('/api/admin/audit?page=2&limit=10')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
      expect(res.body.page).toBe(2)
      expect(res.body.limit).toBe(10)
    })

    it('defaults to page=1 and limit=20 when not specified', async () => {
      const res = await request(app)
        .get('/api/admin/audit')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
      expect(res.body.page).toBe(1)
      expect(res.body.limit).toBe(20)
    })
  })

  // ── Filters ─────────────────────────────────────────────────────────────────

  describe('?action filter', () => {
    it('passes action to AuditLog.find when valid', async () => {
      await request(app)
        .get('/api/admin/audit?action=login')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
        .expect(200)
      expect(AuditLog.find).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'login' })
      )
    })

    it('400 when action is not in the whitelist', async () => {
      const res = await request(app)
        .get('/api/admin/audit?action=HACKED')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
      expect(res.status).toBe(400)
      expect(res.body).toHaveProperty('error')
    })
  })

  describe('?targetType filter', () => {
    it('passes targetType to AuditLog.find when valid', async () => {
      await request(app)
        .get('/api/admin/audit?targetType=User')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
        .expect(200)
      expect(AuditLog.find).toHaveBeenCalledWith(
        expect.objectContaining({ targetType: 'User' })
      )
    })

    it('400 when targetType is not in the whitelist', async () => {
      const res = await request(app)
        .get('/api/admin/audit?targetType=Secret')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
      expect(res.status).toBe(400)
      expect(res.body).toHaveProperty('error')
    })
  })

  describe('?userId filter', () => {
    it('passes userId to AuditLog.find when it is a valid ObjectId', async () => {
      await request(app)
        .get(`/api/admin/audit?userId=${VALID_OBJECT_ID}`)
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
        .expect(200)
      expect(AuditLog.find).toHaveBeenCalledWith(
        expect.objectContaining({ userId: VALID_OBJECT_ID })
      )
    })

    it('ignores userId when it is not a valid ObjectId', async () => {
      await request(app)
        .get('/api/admin/audit?userId=not-an-objectid')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
        .expect(200)
      expect(AuditLog.find).toHaveBeenCalledWith(
        expect.not.objectContaining({ userId: expect.anything() })
      )
    })
  })

  describe('?from / ?to date filters', () => {
    it('sets filter.createdAt.$gte when ?from is provided', async () => {
      await request(app)
        .get('/api/admin/audit?from=2024-01-01')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
        .expect(200)
      expect(AuditLog.find).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: expect.objectContaining({ $gte: expect.any(Date) }),
        })
      )
    })

    it('sets filter.createdAt.$lte when ?to is provided', async () => {
      await request(app)
        .get('/api/admin/audit?to=2024-12-31')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
        .expect(200)
      expect(AuditLog.find).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: expect.objectContaining({ $lte: expect.any(Date) }),
        })
      )
    })

    it('sets both $gte and $lte when ?from and ?to are both provided', async () => {
      await request(app)
        .get('/api/admin/audit?from=2024-01-01&to=2024-12-31')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
        .expect(200)
      expect(AuditLog.find).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date),
          }),
        })
      )
    })
  })

  // ── Pagination ──────────────────────────────────────────────────────────────

  describe('Pagination — skip / limit on the query chain', () => {
    it('applies correct skip and limit for page=3 limit=5', async () => {
      const chain = makeChain([])
      AuditLog.find.mockReturnValue(chain)

      await request(app)
        .get('/api/admin/audit?page=3&limit=5')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
        .expect(200)

      // page=3, limit=5 → skip = (3-1)*5 = 10
      expect(chain.skip).toHaveBeenCalledWith(10)
      expect(chain.limit).toHaveBeenCalledWith(5)
    })

    it('clamps limit to 100 when a larger value is requested', async () => {
      const chain = makeChain([])
      AuditLog.find.mockReturnValue(chain)

      await request(app)
        .get('/api/admin/audit?limit=9999')
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
        .expect(200)

      expect(chain.limit).toHaveBeenCalledWith(100)
    })

    it('passes the same filter to both find and countDocuments', async () => {
      await request(app)
        .get(`/api/admin/audit?action=login&userId=${VALID_OBJECT_ID}`)
        .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
        .expect(200)

      const expectedFilter = expect.objectContaining({
        action: 'login',
        userId: VALID_OBJECT_ID,
      })
      expect(AuditLog.find).toHaveBeenCalledWith(expectedFilter)
      expect(AuditLog.countDocuments).toHaveBeenCalledWith(expectedFilter)
    })
  })
})
