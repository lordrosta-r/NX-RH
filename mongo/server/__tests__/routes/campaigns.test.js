'use strict'

// =============================================================================
// /api/campaigns — Integration tests (pure mocks, no real DB)
// =============================================================================

const jwt = require('jsonwebtoken')

// ─── Chainable Mongoose query stub ───────────────────────────────────────────
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

// ─── Mock: ../../models ───────────────────────────────────────────────────────
jest.mock('../../models', () => {
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

  function MockCampaign(data) { Object.assign(this, data) }
  MockCampaign.prototype.save     = jest.fn().mockResolvedValue(undefined)
  MockCampaign.prototype.toObject = jest.fn().mockImplementation(function () { return { ...this } })
  MockCampaign.prototype.deleteOne = jest.fn().mockResolvedValue({})
  MockCampaign.find           = jest.fn(() => makeChain([]))
  MockCampaign.findById       = jest.fn()
  MockCampaign.countDocuments = jest.fn().mockResolvedValue(0)
  MockCampaign.create         = jest.fn()
  MockCampaign.aggregate      = jest.fn().mockResolvedValue([])

  const Evaluation = {
    find:        jest.fn(() => makeChain([])),
    aggregate:   jest.fn().mockResolvedValue([]),
    deleteMany:  jest.fn().mockResolvedValue({ deletedCount: 0 }),
  }
  const Form = {
    find:        jest.fn(() => makeChain([])),
    findById:    jest.fn(() => makeChain(null)),
    insertMany:  jest.fn().mockResolvedValue([]),
    deleteMany:  jest.fn().mockResolvedValue({ deletedCount: 0 }),
  }
  const User     = { find: jest.fn(() => makeChain([])) }
  const AuditLog = { create: jest.fn().mockResolvedValue({}) }

  const CAMPAIGN_TRANSITIONS = {
    draft:    ['active'],
    active:   ['closed'],
    closed:   ['archived'],
    archived: [],
  }

  return { Campaign: MockCampaign, Evaluation, Form, User, AuditLog, CAMPAIGN_TRANSITIONS }
})

// ─── Mock: authGuard ──────────────────────────────────────────────────────────
jest.mock('../../middleware/authGuard', () => ({
  authGuard: (roles = []) => (req, res, next) => {
    const _jwt   = require('jsonwebtoken')
    const secret = process.env.JWT_SECRET
    const token  = req.cookies?.accessToken
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

// ─── Mock: notificationService ────────────────────────────────────────────────
jest.mock('../../services/notificationService', () => ({
  notifyMany: jest.fn().mockResolvedValue([]),
}))

// ─── Imports (after mocks) ────────────────────────────────────────────────────
const mongoose       = require('mongoose')
const { Campaign, Evaluation, Form, AuditLog } = require('../../models')
const request        = require('supertest')
const express        = require('express')
const cookieParser   = require('cookie-parser')
const { authGuard }  = require('../../middleware/authGuard')
const campaignRouter = require('../../routes/campaigns')

const SECRET = 'test-secret-long-enough-for-hs256-algorithm'
process.env.JWT_SECRET = SECRET
process.env.NODE_ENV   = 'test'

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const ADMIN_ID    = '507f1f77bcf86cd799439001'
const HR_ID       = '507f1f77bcf86cd799439002'
const DIRECTOR_ID = '507f1f77bcf86cd799439003'
const MANAGER_ID  = '507f1f77bcf86cd799439004'
const EMPLOYEE_ID = '507f1f77bcf86cd799439005'
const CAMPAIGN_ID = '507f1f77bcf86cd799439010'
const FORM_ID     = '507f1f77bcf86cd799439011'

function tokenFor({ id, role }) {
  return jwt.sign({ id, email: `${role}@corp.com`, role }, SECRET, {
    algorithm: 'HS256', expiresIn: '1h',
  })
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use(
    '/api/campaigns',
    authGuard(['admin', 'hr', 'director', 'manager', 'employee']),
    campaignRouter,
  )
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
  })
  return app
}

// ─── Campaign document factory ────────────────────────────────────────────────
function mockCampaignDoc(overrides = {}) {
  const base = {
    _id:       CAMPAIGN_ID,
    name:      'Test Campaign',
    status:    'draft',
    startDate: new Date('2025-01-01'),
    endDate:   new Date('2025-03-31'),
    createdBy: ADMIN_ID,
  }
  const data = { ...base, ...overrides }
  return Object.assign(data, {
    save:     Campaign.prototype.save,
    toObject: jest.fn().mockReturnValue({ ...data }),
    deleteOne: Campaign.prototype.deleteOne,
  })
}

// =============================================================================
// GET /api/campaigns
// =============================================================================

describe('GET /api/campaigns', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/campaigns')
    expect(res.status).toBe(401)
  })

  it('admin can list campaigns (no status filter forced)', async () => {
    Campaign.find = jest.fn(() => makeChain([{ _id: CAMPAIGN_ID, status: 'draft' }]))
    Campaign.countDocuments = jest.fn().mockResolvedValue(1)
    const res = await request(app)
      .get('/api/campaigns')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    const [filter] = Campaign.find.mock.calls[0]
    expect(filter.status).toBeUndefined()
  })

  it('hr can list campaigns without status restriction', async () => {
    Campaign.find = jest.fn(() => makeChain([]))
    Campaign.countDocuments = jest.fn().mockResolvedValue(0)
    const res = await request(app)
      .get('/api/campaigns')
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
    expect(res.status).toBe(200)
    const [filter] = Campaign.find.mock.calls[0]
    expect(filter.status).toBeUndefined()
  })

  it('director can list campaigns without status restriction', async () => {
    Campaign.find = jest.fn(() => makeChain([]))
    Campaign.countDocuments = jest.fn().mockResolvedValue(0)
    const res = await request(app)
      .get('/api/campaigns')
      .set('Cookie', `accessToken=${tokenFor({ id: DIRECTOR_ID, role: 'director' })}`)
    expect(res.status).toBe(200)
    const [filter] = Campaign.find.mock.calls[0]
    expect(filter.status).toBeUndefined()
  })

  it('manager can list campaigns without status restriction', async () => {
    Campaign.find = jest.fn(() => makeChain([]))
    Campaign.countDocuments = jest.fn().mockResolvedValue(0)
    const res = await request(app)
      .get('/api/campaigns')
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
    expect(res.status).toBe(200)
    const [filter] = Campaign.find.mock.calls[0]
    expect(filter.status).toBeUndefined()
  })

  it('employee is forced to see only active campaigns', async () => {
    Campaign.find = jest.fn(() => makeChain([]))
    Campaign.countDocuments = jest.fn().mockResolvedValue(0)
    const res = await request(app)
      .get('/api/campaigns')
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(200)
    const [filter] = Campaign.find.mock.calls[0]
    expect(filter.status).toBe('active')
  })

  it('applies valid ?status= filter for admin', async () => {
    Campaign.find = jest.fn(() => makeChain([]))
    Campaign.countDocuments = jest.fn().mockResolvedValue(0)
    const res = await request(app)
      .get('/api/campaigns?status=closed')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    const [filter] = Campaign.find.mock.calls[0]
    expect(filter.status).toBe('closed')
  })

  it('ignores invalid ?status= value (whitelist anti-injection)', async () => {
    Campaign.find = jest.fn(() => makeChain([]))
    Campaign.countDocuments = jest.fn().mockResolvedValue(0)
    const res = await request(app)
      .get('/api/campaigns?status=malicious')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    const [filter] = Campaign.find.mock.calls[0]
    expect(filter.status).toBeUndefined()
  })

  it('returns pagination metadata (total, page, limit)', async () => {
    Campaign.find = jest.fn(() => makeChain([]))
    Campaign.countDocuments = jest.fn().mockResolvedValue(42)
    const res = await request(app)
      .get('/api/campaigns?page=2&limit=10')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    expect(res.body.meta.total).toBe(42)
    expect(res.body.meta.page).toBe(2)
    expect(res.body.meta.limit).toBe(10)
  })
})

// =============================================================================
// GET /api/campaigns/:id
// =============================================================================

describe('GET /api/campaigns/:id', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('returns 400 for an invalid ObjectId', async () => {
    const res = await request(app)
      .get('/api/campaigns/not-a-valid-id')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('returns 404 when campaign is not found', async () => {
    Campaign.findById = jest.fn(() => makeChain(null))
    const res = await request(app)
      .get(`/api/campaigns/${CAMPAIGN_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/introuvable/i)
  })

  it('returns campaign with stats object when found', async () => {
    Campaign.findById = jest.fn(() =>
      makeChain({ _id: CAMPAIGN_ID, name: 'Q1 2025', status: 'active' })
    )
    Evaluation.aggregate = jest.fn().mockResolvedValue([
      { total: 10, started: 7, submitted: 5, validated: 3 },
    ])
    const res = await request(app)
      .get(`/api/campaigns/${CAMPAIGN_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    expect(res.body.data.stats).toBeDefined()
    expect(res.body.data.stats.total).toBe(10)
  })

  it('returns default zero stats when no evaluations exist', async () => {
    Campaign.findById = jest.fn(() =>
      makeChain({ _id: CAMPAIGN_ID, name: 'Q2 2025', status: 'draft' })
    )
    Evaluation.aggregate = jest.fn().mockResolvedValue([])
    const res = await request(app)
      .get(`/api/campaigns/${CAMPAIGN_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    expect(res.body.data.stats).toEqual({ total: 0, started: 0, submitted: 0, validated: 0 })
  })
})

// =============================================================================
// POST /api/campaigns
// =============================================================================

describe('POST /api/campaigns', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
    Campaign.prototype.save.mockResolvedValue(undefined)
  })

  it('returns 403 for employee', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ name: 'Camp', startDate: '2025-01-01', endDate: '2025-03-31', formId: FORM_ID })
    expect(res.status).toBe(403)
  })

  it('returns 403 for manager', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
      .send({ name: 'Camp', startDate: '2025-01-01', endDate: '2025-03-31', formId: FORM_ID })
    expect(res.status).toBe(403)
  })

  it('returns 403 for director', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('Cookie', `accessToken=${tokenFor({ id: DIRECTOR_ID, role: 'director' })}`)
      .send({ name: 'Camp', startDate: '2025-01-01', endDate: '2025-03-31', formId: FORM_ID })
    expect(res.status).toBe(403)
  })

  it('returns 422 when name is missing', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ startDate: '2025-01-01', endDate: '2025-03-31', formId: FORM_ID })
    expect(res.status).toBe(422)
    expect(res.body.error).toBe('Données invalides')
  })

  it('returns 422 when startDate is missing', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ name: 'Camp', endDate: '2025-03-31', formId: FORM_ID })
    expect(res.status).toBe(422)
  })

  it('returns 422 when endDate is missing', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ name: 'Camp', startDate: '2025-01-01', formId: FORM_ID })
    expect(res.status).toBe(422)
  })

  it('returns 422 when endDate is before startDate', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ name: 'Camp', startDate: '2025-06-01', endDate: '2025-01-01', formId: FORM_ID })
    expect(res.status).toBe(422)
    expect(res.body.details[0].message).toMatch(/endDate/i)
  })

  it('returns 400 for an invalid initial status (e.g. "closed")', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ name: 'Camp', startDate: '2025-01-01', endDate: '2025-03-31', formId: FORM_ID, status: 'closed' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/statut initial/i)
  })

  it('admin creates a campaign and receives 201', async () => {
    const created = { _id: CAMPAIGN_ID, name: 'Q1', status: 'draft', createdBy: ADMIN_ID }
    Campaign.create   = jest.fn().mockResolvedValue({ _id: CAMPAIGN_ID })
    Campaign.findById = jest.fn(() => makeChain(created))
    const res = await request(app)
      .post('/api/campaigns')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ name: 'Q1', startDate: '2025-01-01', endDate: '2025-03-31', formId: FORM_ID })
    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe('Q1')
  })

  it('hr creates a campaign and receives 201', async () => {
    const created = { _id: CAMPAIGN_ID, name: 'HR Camp', status: 'draft', createdBy: HR_ID }
    Campaign.create   = jest.fn().mockResolvedValue({ _id: CAMPAIGN_ID })
    Campaign.findById = jest.fn(() => makeChain(created))
    const res = await request(app)
      .post('/api/campaigns')
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ name: 'HR Camp', startDate: '2025-01-01', endDate: '2025-03-31', formId: FORM_ID })
    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe('HR Camp')
  })

  it('allows initial status "active"', async () => {
    const created = { _id: CAMPAIGN_ID, name: 'Launched', status: 'active', createdBy: ADMIN_ID }
    Campaign.create   = jest.fn().mockResolvedValue({ _id: CAMPAIGN_ID })
    Campaign.findById = jest.fn(() => makeChain(created))
    const res = await request(app)
      .post('/api/campaigns')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ name: 'Launched', startDate: '2025-01-01', endDate: '2025-03-31', formId: FORM_ID, status: 'active' })
    expect(res.status).toBe(201)
  })
})

// =============================================================================
// PATCH /api/campaigns/:id
// =============================================================================

describe('PATCH /api/campaigns/:id', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
    Campaign.prototype.save.mockResolvedValue(undefined)
  })

  it('returns 403 for employee', async () => {
    const res = await request(app)
      .patch(`/api/campaigns/${CAMPAIGN_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ name: 'New name' })
    expect(res.status).toBe(403)
  })

  it('returns 400 for an invalid ObjectId', async () => {
    const res = await request(app)
      .patch('/api/campaigns/bad-id')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ name: 'Updated' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('returns 404 when campaign not found', async () => {
    Campaign.findById = jest.fn().mockResolvedValue(null)
    const res = await request(app)
      .patch(`/api/campaigns/${CAMPAIGN_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ name: 'Updated' })
    expect(res.status).toBe(404)
  })

  it('returns 400 for an invalid status transition (archived → active)', async () => {
    Campaign.findById = jest.fn().mockResolvedValue(mockCampaignDoc({ status: 'archived' }))
    const res = await request(app)
      .patch(`/api/campaigns/${CAMPAIGN_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ status: 'active' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/transition/i)
  })

  it('returns 400 for invalid transition (active → draft)', async () => {
    Campaign.findById = jest.fn().mockResolvedValue(mockCampaignDoc({ status: 'active' }))
    const res = await request(app)
      .patch(`/api/campaigns/${CAMPAIGN_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ status: 'draft' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/transition/i)
  })

  it('allows valid transition draft → active', async () => {
    const doc = mockCampaignDoc({ status: 'draft' })
    Campaign.findById = jest.fn().mockResolvedValue(doc)
    const res = await request(app)
      .patch(`/api/campaigns/${CAMPAIGN_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ status: 'active' })
    expect(res.status).toBe(200)
    expect(Campaign.prototype.save).toHaveBeenCalledTimes(1)
  })

  it('updates editable fields (name, description) without transition', async () => {
    const doc = mockCampaignDoc({ status: 'draft', name: 'Old' })
    Campaign.findById = jest.fn().mockResolvedValue(doc)
    const res = await request(app)
      .patch(`/api/campaigns/${CAMPAIGN_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ name: 'Updated', description: 'New desc' })
    expect(res.status).toBe(200)
    expect(doc.name).toBe('Updated')
    expect(doc.description).toBe('New desc')
  })

  it('calls AuditLog.create after a successful patch', async () => {
    const doc = mockCampaignDoc({ status: 'draft' })
    Campaign.findById = jest.fn().mockResolvedValue(doc)
    await request(app)
      .patch(`/api/campaigns/${CAMPAIGN_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ name: 'Audit test' })
    // Fire-and-forget: give microtasks a tick
    await new Promise(r => setImmediate(r))
    expect(AuditLog.create).toHaveBeenCalled()
  })
})

// =============================================================================
// DELETE /api/campaigns/:id
// =============================================================================

describe('DELETE /api/campaigns/:id', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
    // Stub mongoose session: throw a "no replica set" error so the fallback sequential path runs
    jest.spyOn(mongoose, 'startSession').mockResolvedValue({
      withTransaction: jest.fn().mockRejectedValue({ code: 20, message: 'Transaction requires replica set' }),
      endSession:      jest.fn().mockResolvedValue(undefined),
    })
    Campaign.prototype.deleteOne.mockResolvedValue({})
    Evaluation.deleteMany.mockResolvedValue({ deletedCount: 0 })
    Form.deleteMany.mockResolvedValue({ deletedCount: 0 })
  })

  it('returns 403 for employee', async () => {
    const res = await request(app)
      .delete(`/api/campaigns/${CAMPAIGN_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(403)
  })

  it('returns 400 for an invalid ObjectId', async () => {
    const res = await request(app)
      .delete('/api/campaigns/bad-id')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('returns 404 when campaign is not found', async () => {
    Campaign.findById = jest.fn().mockResolvedValue(null)
    const res = await request(app)
      .delete(`/api/campaigns/${CAMPAIGN_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(404)
  })

  it('returns 400 when trying to delete an active campaign', async () => {
    Campaign.findById = jest.fn().mockResolvedValue(mockCampaignDoc({ status: 'active' }))
    const res = await request(app)
      .delete(`/api/campaigns/${CAMPAIGN_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/active/i)
  })

  it('returns 400 when trying to delete a closed campaign', async () => {
    Campaign.findById = jest.fn().mockResolvedValue(mockCampaignDoc({ status: 'closed' }))
    const res = await request(app)
      .delete(`/api/campaigns/${CAMPAIGN_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/brouillon|archiv/i)
  })

  it('returns 204 and cascades deletes when status is "draft"', async () => {
    Campaign.findById = jest.fn().mockResolvedValue(mockCampaignDoc({ status: 'draft' }))
    const res = await request(app)
      .delete(`/api/campaigns/${CAMPAIGN_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(204)
    expect(Evaluation.deleteMany).toHaveBeenCalledTimes(1)
    expect(Form.deleteMany).toHaveBeenCalledTimes(1)
    expect(Campaign.prototype.deleteOne).toHaveBeenCalledTimes(1)
  })

  it('returns 204 and cascades deletes when status is "archived"', async () => {
    Campaign.findById = jest.fn().mockResolvedValue(mockCampaignDoc({ status: 'archived' }))
    const res = await request(app)
      .delete(`/api/campaigns/${CAMPAIGN_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
    expect(res.status).toBe(204)
    expect(Evaluation.deleteMany).toHaveBeenCalledTimes(1)
    expect(Form.deleteMany).toHaveBeenCalledTimes(1)
  })
})

// =============================================================================
// POST /api/campaigns/:id/clone
// =============================================================================

describe('POST /api/campaigns/:id/clone', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
    Campaign.prototype.save.mockResolvedValue(undefined)
  })

  it('returns 403 for employee', async () => {
    const res = await request(app)
      .post(`/api/campaigns/${CAMPAIGN_ID}/clone`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(403)
  })

  it('returns 400 for an invalid ObjectId', async () => {
    const res = await request(app)
      .post('/api/campaigns/bad-id/clone')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('returns 404 when source campaign is not found', async () => {
    Campaign.findById = jest.fn(() => makeChain(null))
    const res = await request(app)
      .post(`/api/campaigns/${CAMPAIGN_ID}/clone`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(404)
  })

  it('returns 400 when provided endDate is before startDate', async () => {
    Campaign.findById = jest.fn(() =>
      makeChain({ _id: CAMPAIGN_ID, name: 'Source', startDate: new Date('2024-01-01'), endDate: new Date('2024-03-31') })
    )
    const res = await request(app)
      .post(`/api/campaigns/${CAMPAIGN_ID}/clone`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ startDate: '2026-06-01', endDate: '2025-01-01' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/endDate/i)
  })

  it('returns 201 with formsCloned count on success (no existing forms)', async () => {
    Campaign.findById = jest.fn(() =>
      makeChain({ _id: CAMPAIGN_ID, name: 'Source', startDate: new Date('2024-01-01'), endDate: new Date('2024-03-31') })
    )
    Campaign.create = jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439099' })
    Form.find       = jest.fn(() => makeChain([]))
    const res = await request(app)
      .post(`/api/campaigns/${CAMPAIGN_ID}/clone`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(201)
    expect(res.body.data.formsCloned).toBe(0)
  })

  it('returns 201 and clones forms, reporting correct formsCloned count', async () => {
    Campaign.findById = jest.fn(() =>
      makeChain({ _id: CAMPAIGN_ID, name: 'Source', startDate: new Date('2024-01-01'), endDate: new Date('2024-03-31') })
    )
    Campaign.create = jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439099' })
    Form.find       = jest.fn(() => makeChain([
      { title: 'F1', formType: 'self_evaluation', questions: [] },
      { title: 'F2', formType: 'manager_evaluation', questions: [] },
    ]))
    Form.insertMany = jest.fn().mockResolvedValue([])
    const res = await request(app)
      .post(`/api/campaigns/${CAMPAIGN_ID}/clone`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(201)
    expect(res.body.data.formsCloned).toBe(2)
    expect(Form.insertMany).toHaveBeenCalledTimes(1)
  })

  it('uses "(copie)" suffix in default clone name', async () => {
    Campaign.findById = jest.fn(() =>
      makeChain({ _id: CAMPAIGN_ID, name: 'Original', startDate: new Date('2024-01-01'), endDate: new Date('2024-03-31') })
    )
    Campaign.create = jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439099' })
    Form.find       = jest.fn(() => makeChain([]))
    await request(app)
      .post(`/api/campaigns/${CAMPAIGN_ID}/clone`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    const createCall = Campaign.create.mock.calls[0][0]
    expect(createCall.name).toBe('Original (copie)')
  })

  it('uses custom name when provided in body', async () => {
    Campaign.findById = jest.fn(() =>
      makeChain({ _id: CAMPAIGN_ID, name: 'Original', startDate: new Date('2024-01-01'), endDate: new Date('2024-03-31') })
    )
    Campaign.create = jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439099' })
    Form.find       = jest.fn(() => makeChain([]))
    await request(app)
      .post(`/api/campaigns/${CAMPAIGN_ID}/clone`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ name: 'My Custom Clone' })
    const createCall = Campaign.create.mock.calls[0][0]
    expect(createCall.name).toBe('My Custom Clone')
  })

  it('hr can clone a campaign', async () => {
    Campaign.findById = jest.fn(() =>
      makeChain({ _id: CAMPAIGN_ID, name: 'Source', startDate: new Date('2024-01-01'), endDate: new Date('2024-03-31') })
    )
    Campaign.create = jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439099' })
    Form.find       = jest.fn(() => makeChain([]))
    const res = await request(app)
      .post(`/api/campaigns/${CAMPAIGN_ID}/clone`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
    expect(res.status).toBe(201)
  })
})
