'use strict'

// =============================================================================
// GET /api/dashboard — integration tests (no real MongoDB connection)
//
// The route applies its own authGuard internally; we mock the middleware and
// all Mongoose models so tests run in isolation.
// =============================================================================

const jwt = require('jsonwebtoken')

// ─── Mock: models (barrel export) ────────────────────────────────────────────
jest.mock('../../models', () => ({
  Campaign:   { find: jest.fn(), findOne: jest.fn() },
  Evaluation: { find: jest.fn() },
  User:       { find: jest.fn(), countDocuments: jest.fn() },
}))

// ─── Mock: authGuard ─────────────────────────────────────────────────────────
jest.mock('../../middleware/authGuard', () => ({
  authGuard: (roles = []) => (req, res, next) => {
    const _jwt  = require('jsonwebtoken')
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

const { Campaign, Evaluation, User } = require('../../models')
const request         = require('supertest')
const express         = require('express')
const cookieParser    = require('cookie-parser')
const dashboardRouter = require('../../routes/dashboard')

const SECRET = 'test-secret-long-enough-for-hs256-algorithm'
process.env.JWT_SECRET = SECRET
process.env.NODE_ENV   = 'test'

// ─── IDs ─────────────────────────────────────────────────────────────────────

const ADMIN_ID    = '507f1f77bcf86cd799439001'
const HR_ID       = '507f1f77bcf86cd799439002'
const DIRECTOR_ID = '507f1f77bcf86cd799439003'
const MANAGER_ID  = '507f1f77bcf86cd799439004'
const EMPLOYEE_ID = '507f1f77bcf86cd799439005'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tokenFor({ id, role, firstName = 'John', lastName = 'Doe' }) {
  return jwt.sign(
    { id, email: `${role}@corp.com`, role, firstName, lastName },
    SECRET,
    { algorithm: 'HS256', expiresIn: '1h' },
  )
}

// Returns a chainable Mongoose query stub resolving to `result`.
function makeChain(result = []) {
  return {
    select:   jest.fn().mockReturnThis(),
    sort:     jest.fn().mockReturnThis(),
    skip:     jest.fn().mockReturnThis(),
    limit:    jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean:     jest.fn().mockResolvedValue(result),
  }
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  // The dashboard route applies its own authGuard — just mount the router.
  app.use('/api/dashboard', dashboardRouter)
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
  })
  return app
}

const app = buildApp()

// =============================================================================
// Tests
// =============================================================================

describe('GET /api/dashboard', () => {
  beforeEach(() => jest.clearAllMocks())

  // ── Auth guard ──────────────────────────────────────────────────────────────

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/dashboard')
    expect(res.status).toBe(401)
  })

  it('returns 401 for an invalid / malformed token', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Cookie', 'accessToken=this.is.not.valid')
    expect(res.status).toBe(401)
  })

  // ── JWT payload includes firstName / lastName (fix-auth) ───────────────────

  it('JWT payload includes firstName and lastName', () => {
    const token   = tokenFor({ id: EMPLOYEE_ID, role: 'employee', firstName: 'Alice', lastName: 'Martin' })
    const payload = jwt.verify(token, SECRET, { algorithms: ['HS256'] })
    expect(payload.firstName).toBe('Alice')
    expect(payload.lastName).toBe('Martin')
  })

  // ── Employee ────────────────────────────────────────────────────────────────

  it('returns role-specific payload for employee', async () => {
    Campaign.find.mockReturnValue(makeChain([{ _id: 'c1', name: 'Camp A' }]))
    Evaluation.find
      .mockReturnValueOnce(makeChain([]))   // myEvals
      .mockReturnValueOnce(makeChain([]))   // myRequests

    const res = await request(app)
      .get('/api/dashboard')
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)

    expect(res.status).toBe(200)
    expect(res.body.role).toBe('employee')
    expect(res.body).toHaveProperty('activeCampaigns')
    expect(res.body).toHaveProperty('myEvals')
    expect(res.body).toHaveProperty('myRequests')
  })

  // ── Manager ─────────────────────────────────────────────────────────────────

  it('returns team stats for manager', async () => {
    User.find.mockReturnValue(makeChain([]))   // teamMembers → teamSize 0
    Campaign.find.mockReturnValue(makeChain([]))
    Evaluation.find
      .mockReturnValueOnce(makeChain([]))   // teamEvals
      .mockReturnValueOnce(makeChain([]))   // pendingRequests

    const res = await request(app)
      .get('/api/dashboard')
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)

    expect(res.status).toBe(200)
    expect(res.body.role).toBe('manager')
    expect(res.body).toHaveProperty('activeCampaigns')
    expect(res.body).toHaveProperty('team')
    expect(res.body.team).toMatchObject({ total: 0, submitted: 0, completionRate: 0 })
    expect(res.body).toHaveProperty('teamSize', 0)
    expect(res.body).toHaveProperty('pendingRequests')
  })

  // ── Director ─────────────────────────────────────────────────────────────────

  it('returns subtree stats for director', async () => {
    // Two sequential User.find calls: direct reports then second level
    User.find
      .mockReturnValueOnce(makeChain([]))   // directReports
      .mockReturnValueOnce(makeChain([]))   // secondLevel
    Campaign.find.mockReturnValue(makeChain([]))
    Evaluation.find
      .mockReturnValueOnce(makeChain([]))   // subtreeEvals
      .mockReturnValueOnce(makeChain([]))   // pendingRequests

    const res = await request(app)
      .get('/api/dashboard')
      .set('Cookie', `accessToken=${tokenFor({ id: DIRECTOR_ID, role: 'director' })}`)

    expect(res.status).toBe(200)
    expect(res.body.role).toBe('director')
    expect(res.body).toHaveProperty('activeCampaigns')
    expect(res.body).toHaveProperty('subtree')
    expect(res.body.subtree).toMatchObject({ total: 0, submitted: 0, completionRate: 0, size: 0 })
    expect(res.body).toHaveProperty('pendingRequests')
  })

  // ── HR — no active campaign ──────────────────────────────────────────────────

  it('returns eval stats for hr when there is no active campaign', async () => {
    Campaign.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) })
    Evaluation.find.mockReturnValue(makeChain([]))    // openRequests
    User.countDocuments
      .mockResolvedValueOnce(3)    // usersWithoutManager
      .mockResolvedValueOnce(20)   // totalUsers

    const res = await request(app)
      .get('/api/dashboard')
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)

    expect(res.status).toBe(200)
    expect(res.body.role).toBe('hr')
    expect(res.body.activeCampaign).toBeNull()
    expect(res.body).toHaveProperty('evalStats')
    expect(res.body.evalStats).toMatchObject({
      total: 0, assigned: 0, in_progress: 0, submitted: 0, validated: 0, expired: 0,
    })
    expect(res.body).toHaveProperty('usersWithoutManager', 3)
    expect(res.body).toHaveProperty('totalUsers', 20)
  })

  // ── Admin — with active campaign ─────────────────────────────────────────────

  it('returns eval stats for admin when there is an active campaign', async () => {
    const mockCampaign = { _id: 'camp1', name: 'Q1 Review', status: 'active' }
    Campaign.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(mockCampaign) })
    Evaluation.find
      // allEvals — uses .select('status').lean(), not the populate chain
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { status: 'assigned' },
            { status: 'in_progress' },
            { status: 'submitted' },
            { status: 'validated' },
          ]),
        }),
      })
      .mockReturnValueOnce(makeChain([]))   // openRequests
    User.countDocuments
      .mockResolvedValueOnce(1)    // usersWithoutManager
      .mockResolvedValueOnce(15)   // totalUsers

    const res = await request(app)
      .get('/api/dashboard')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    expect(res.status).toBe(200)
    expect(res.body.role).toBe('admin')
    expect(res.body.activeCampaign).toMatchObject({ _id: 'camp1' })
    expect(res.body.evalStats.total).toBe(4)
    expect(res.body.evalStats.assigned).toBe(1)
    expect(res.body.evalStats.in_progress).toBe(1)
    expect(res.body.evalStats.submitted).toBe(1)
    expect(res.body.evalStats.validated).toBe(1)
    expect(res.body).toHaveProperty('usersWithoutManager', 1)
    expect(res.body).toHaveProperty('totalUsers', 15)
    expect(res.body).toHaveProperty('openRequests')
  })
})
