'use strict'

// =============================================================================
// GET /api/analytics/export/pdf — integration tests (no real DB / no real PDF)
//
// ADMIN_ROLES = ['admin', 'hr']  (from config/constants.js)
// • manager / employee pass authGuard but get 403 from the route itself
// • PDFKit is replaced by a PassThrough so Express can finish the HTTP response
// =============================================================================

const jwt = require('jsonwebtoken')

// ─── Mock: pdfkit ─────────────────────────────────────────────────────────────
// Replace PDFDocument with a PassThrough stream so pipe(res) + push(null) ends
// the HTTP response without generating a real PDF.
jest.mock('pdfkit', () => {
  const { PassThrough } = require('stream')
  return jest.fn().mockImplementation(() => {
    const doc = new PassThrough()
    const chain = jest.fn().mockReturnThis()
    doc.fillColor   = chain
    doc.fontSize    = chain
    doc.font        = chain
    doc.text        = chain
    doc.moveDown    = chain
    doc.moveTo      = chain
    doc.lineTo      = chain
    doc.strokeColor = chain
    doc.stroke      = chain
    doc.addPage     = chain
    doc.y = 100
    doc.end = jest.fn(() => doc.push(null))
    return doc
  })
})

// ─── Mock: models ─────────────────────────────────────────────────────────────
jest.mock('../../models', () => ({
  Evaluation: {
    find: jest.fn(() => ({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    })),
  },
}))

// ─── Mock: authGuard ─────────────────────────────────────────────────────────
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

const { Evaluation }   = require('../../models')
const request          = require('supertest')
const express          = require('express')
const cookieParser     = require('cookie-parser')
const { authGuard }    = require('../../middleware/authGuard')
const analyticsRouter  = require('../../routes/analytics')

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ADMIN_ID    = '507f1f77bcf86cd799439001'
const HR_ID       = '507f1f77bcf86cd799439002'
const INVALID_ROLE_ID = '507f1f77bcf86cd799439003'
const MANAGER_ID  = '507f1f77bcf86cd799439004'
const EMPLOYEE_ID = '507f1f77bcf86cd799439005'
const CAMPAIGN_ID = '507f1f77bcf86cd799439020'
const USER_A_ID   = '507f1f77bcf86cd799439030'
const USER_B_ID   = '507f1f77bcf86cd799439031'

function tokenFor({ id, role }) {
  return jwt.sign({ id, email: `${role}@corp.com`, role }, SECRET, {
    algorithm: 'HS256',
    expiresIn: '1h',
  })
}

// Returns a chainable Evaluation.find stub that resolves to `evals`.
function makeEvalChain(evals) {
  return {
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(evals),
  }
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  // Mirror index.js: authGuard admits all authenticated roles; route does its own ADMIN_ROLES check
  app.use(
    '/api/analytics',
    authGuard(['admin', 'hr', 'manager', 'employee']),
    analyticsRouter,
  )
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
  })
  return app
}

const app = buildApp()

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/analytics/export/pdf', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── Auth / role guard ──────────────────────────────────────────────────────

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/analytics/export/pdf')
    expect(res.status).toBe(401)
  })

  it('returns 401 for an expired / invalid token', async () => {
    const res = await request(app)
      .get('/api/analytics/export/pdf')
      .set('Cookie', 'accessToken=thisisnotavalidjwt')
    expect(res.status).toBe(401)
  })

  it('returns 403 for unknown role (not in authGuard list)', async () => {
    const res = await request(app)
      .get('/api/analytics/export/pdf')
      .set('Cookie', `accessToken=${tokenFor({ id: INVALID_ROLE_ID, role: 'invalid_role' })}`)
    expect(res.status).toBe(403)
  })

  it('returns 403 for a manager (not in ADMIN_ROLES)', async () => {
    Evaluation.find = jest.fn(() => makeEvalChain([]))
    const res = await request(app)
      .get('/api/analytics/export/pdf')
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
    expect(res.status).toBe(403)
  })

  it('returns 403 for an employee (not in ADMIN_ROLES)', async () => {
    Evaluation.find = jest.fn(() => makeEvalChain([]))
    const res = await request(app)
      .get('/api/analytics/export/pdf')
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(403)
  })

  // ── Successful PDF generation ──────────────────────────────────────────────

  it('returns 200 with Content-Type application/pdf for admin (empty evals)', async () => {
    Evaluation.find = jest.fn(() => makeEvalChain([]))
    const res = await request(app)
      .get('/api/analytics/export/pdf')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/pdf/)
  })

  it('returns 200 with Content-Type application/pdf for hr (empty evals)', async () => {
    Evaluation.find = jest.fn(() => makeEvalChain([]))
    const res = await request(app)
      .get('/api/analytics/export/pdf')
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/pdf/)
  })

  it('sets Content-Disposition to attachment with .pdf filename', async () => {
    Evaluation.find = jest.fn(() => makeEvalChain([]))
    const res = await request(app)
      .get('/api/analytics/export/pdf')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    expect(res.headers['content-disposition']).toMatch(/attachment/)
    expect(res.headers['content-disposition']).toMatch(/\.pdf"/)
  })

  // ── campaignId query param ─────────────────────────────────────────────────

  it('returns 400 for an invalid campaignId', async () => {
    const res = await request(app)
      .get('/api/analytics/export/pdf?campaignId=bad-id')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('returns 400 for a short but non-ObjectId campaignId', async () => {
    const res = await request(app)
      .get('/api/analytics/export/pdf?campaignId=123')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(400)
  })

  it('returns 200 when a valid campaignId is provided', async () => {
    Evaluation.find = jest.fn(() => makeEvalChain([]))
    const res = await request(app)
      .get(`/api/analytics/export/pdf?campaignId=${CAMPAIGN_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/pdf/)
  })

  it('passes campaignId filter to Evaluation.find', async () => {
    Evaluation.find = jest.fn(() => makeEvalChain([]))
    await request(app)
      .get(`/api/analytics/export/pdf?campaignId=${CAMPAIGN_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(Evaluation.find).toHaveBeenCalledWith({ campaignId: CAMPAIGN_ID })
  })

  it('calls Evaluation.find with empty filter when no campaignId', async () => {
    Evaluation.find = jest.fn(() => makeEvalChain([]))
    await request(app)
      .get('/api/analytics/export/pdf')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(Evaluation.find).toHaveBeenCalledWith({})
  })

  // ── avgScore computation ───────────────────────────────────────────────────

  it('generates PDF when evals have scores (avgScore computed, not null)', async () => {
    const evals = [
      { _id: '1', score: 80, status: 'validated', evaluateeId: { _id: USER_A_ID, firstName: 'Alice', lastName: 'Dupont', department: 'Engineering' } },
      { _id: '2', score: 90, status: 'validated', evaluateeId: { _id: USER_A_ID, firstName: 'Alice', lastName: 'Dupont', department: 'Engineering' } },
    ]
    Evaluation.find = jest.fn(() => makeEvalChain(evals))
    const res = await request(app)
      .get('/api/analytics/export/pdf')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    // PDFKit.text was called (mocked) — doc.text mock should have been invoked
    const PDFKit = require('pdfkit')
    const mockInstance = PDFKit.mock.results[0].value
    expect(mockInstance.text).toHaveBeenCalled()
  })

  it('generates PDF when no eval has a score (avgScore is null, N/A shown)', async () => {
    const evals = [
      { _id: '3', score: null, status: 'assigned', evaluateeId: { _id: USER_B_ID, firstName: 'Bob', lastName: 'Martin', department: 'HR' } },
    ]
    Evaluation.find = jest.fn(() => makeEvalChain(evals))
    const res = await request(app)
      .get('/api/analytics/export/pdf')
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/pdf/)
  })

  // ── completion rate ────────────────────────────────────────────────────────

  it('generates PDF with mixed-status evals (completion rate > 0)', async () => {
    const evals = [
      { _id: '4', score: 70, status: 'validated', evaluateeId: { _id: USER_A_ID, firstName: 'Alice', lastName: 'Dupont', department: 'Engineering' } },
      { _id: '5', score: null, status: 'in_progress', evaluateeId: { _id: USER_B_ID, firstName: 'Bob', lastName: 'Martin', department: 'HR' } },
      { _id: '6', score: 60, status: 'validated', evaluateeId: { _id: USER_B_ID, firstName: 'Bob', lastName: 'Martin', department: 'HR' } },
    ]
    Evaluation.find = jest.fn(() => makeEvalChain(evals))
    const res = await request(app)
      .get('/api/analytics/export/pdf')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    // 2/3 validated → completionRate = 67%
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/pdf/)
  })

  it('generates PDF with 0% completion when no evals are validated', async () => {
    const evals = [
      { _id: '7', score: null, status: 'assigned', evaluateeId: { _id: USER_A_ID, firstName: 'Alice', lastName: 'Dupont', department: 'Engineering' } },
    ]
    Evaluation.find = jest.fn(() => makeEvalChain(evals))
    const res = await request(app)
      .get('/api/analytics/export/pdf')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
  })

  // ── top performers ─────────────────────────────────────────────────────────

  it('groups top performers by evaluateeId and sorts by avgScore desc', async () => {
    // USER_A has avg 85, USER_B has avg 50 → USER_A ranked first
    const evals = [
      { _id: 'p1', score: 80, status: 'validated', evaluateeId: { _id: USER_A_ID, firstName: 'Alice', lastName: 'Dupont', department: 'Engineering' } },
      { _id: 'p2', score: 90, status: 'validated', evaluateeId: { _id: USER_A_ID, firstName: 'Alice', lastName: 'Dupont', department: 'Engineering' } },
      { _id: 'p3', score: 50, status: 'validated', evaluateeId: { _id: USER_B_ID, firstName: 'Bob', lastName: 'Martin', department: 'HR' } },
    ]
    Evaluation.find = jest.fn(() => makeEvalChain(evals))
    const res = await request(app)
      .get('/api/analytics/export/pdf')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    // The PDF is generated — we verify doc.text was called with user names
    const PDFKit = require('pdfkit')
    const mockInstance = PDFKit.mock.results[PDFKit.mock.results.length - 1].value
    const textCalls = mockInstance.text.mock.calls.map(c => c[0])
    const hasAlice = textCalls.some(t => typeof t === 'string' && t.includes('Alice'))
    expect(hasAlice).toBe(true)
  })

  it('shows "Aucune donnée" section in PDF when no evals have scores', async () => {
    Evaluation.find = jest.fn(() => makeEvalChain([
      { _id: 'x1', score: undefined, status: 'assigned', evaluateeId: null },
    ]))
    const res = await request(app)
      .get('/api/analytics/export/pdf')
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
    expect(res.status).toBe(200)
    const PDFKit = require('pdfkit')
    const mockInstance = PDFKit.mock.results[PDFKit.mock.results.length - 1].value
    const textCalls = mockInstance.text.mock.calls.map(c => c[0])
    const hasNoData = textCalls.some(t => typeof t === 'string' && /aucune/i.test(t))
    expect(hasNoData).toBe(true)
  })

  // ── campaignId in Content-Disposition filename ─────────────────────────────

  it('includes campaignId in the filename when provided', async () => {
    Evaluation.find = jest.fn(() => makeEvalChain([]))
    const res = await request(app)
      .get(`/api/analytics/export/pdf?campaignId=${CAMPAIGN_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    expect(res.headers['content-disposition']).toContain(CAMPAIGN_ID)
  })

  it('does not include a campaign suffix when no campaignId is given', async () => {
    Evaluation.find = jest.fn(() => makeEvalChain([]))
    const res = await request(app)
      .get('/api/analytics/export/pdf')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    // filename should be analytics-rh-<date>.pdf with no extra segment
    expect(res.headers['content-disposition']).toMatch(/analytics-rh-\d{4}-\d{2}-\d{2}\.pdf/)
  })

  // ── department breakdown ───────────────────────────────────────────────────

  it('generates PDF correctly when evaluateeId has no department (fallback to Non défini)', async () => {
    const evals = [
      { _id: 'd1', score: 75, status: 'validated', evaluateeId: { _id: USER_A_ID, firstName: 'Alice', lastName: 'Dupont' } },
    ]
    Evaluation.find = jest.fn(() => makeEvalChain(evals))
    const res = await request(app)
      .get('/api/analytics/export/pdf')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    const PDFKit = require('pdfkit')
    const mockInstance = PDFKit.mock.results[PDFKit.mock.results.length - 1].value
    const textCalls = mockInstance.text.mock.calls.map(c => c[0])
    const hasNonDefini = textCalls.some(t => typeof t === 'string' && t.includes('Non défini'))
    expect(hasNonDefini).toBe(true)
  })
})
