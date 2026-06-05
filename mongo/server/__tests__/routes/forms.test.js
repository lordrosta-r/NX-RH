'use strict'

// =============================================================================
// /api/forms — Integration tests (pure mocks, no real DB)
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

  function MockForm(data) { Object.assign(this, data) }
  MockForm.prototype.save     = jest.fn().mockResolvedValue(undefined)
  MockForm.prototype.deleteOne = jest.fn().mockResolvedValue({})
  MockForm.find           = jest.fn(() => makeChain([]))
  MockForm.findById       = jest.fn()
  MockForm.countDocuments = jest.fn().mockResolvedValue(0)
  MockForm.create         = jest.fn()
  // schema.path needed for formType enum validation in GET / and POST /
  MockForm.schema = {
    path: jest.fn(() => ({
      enumValues: ['manager_review', 'self_assessment', 'upward_feedback', 'peer_review'],
    })),
  }

  const MockEvaluation = {
    countDocuments: jest.fn().mockResolvedValue(0),
  }

  return { Form: MockForm, Evaluation: MockEvaluation }
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

// ─── Imports (after mocks) ────────────────────────────────────────────────────
const { Form, Evaluation } = require('../../models')
const request        = require('supertest')
const express        = require('express')
const cookieParser   = require('cookie-parser')
const { authGuard }  = require('../../middleware/authGuard')
const formRouter     = require('../../routes/forms')

const SECRET = 'test-secret-long-enough-for-hs256-algorithm'
process.env.JWT_SECRET = SECRET
process.env.NODE_ENV   = 'test'

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const ADMIN_ID      = '507f1f77bcf86cd799439001'
const HR_ID         = '507f1f77bcf86cd799439002'
const DIRECTOR_ID   = '507f1f77bcf86cd799439003'
const MANAGER_ID    = '507f1f77bcf86cd799439004'
const EMPLOYEE_ID   = '507f1f77bcf86cd799439005'
const FORM_ID       = '507f1f77bcf86cd799439010'
const CAMPAIGN_ID   = '507f1f77bcf86cd799439020'

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
    '/api/forms',
    authGuard(['admin', 'hr', 'director', 'manager', 'employee']),
    formRouter,
  )
   
  app.use((err, _req, res, _next) => {
    let status = err.status || 500
    if (err.name === 'ValidationError') status = 400
    res.status(status).json({ error: err.message || 'Internal server error' })
  })
  return app
}

// ─── Form document factory ────────────────────────────────────────────────────
function mockFormDoc(overrides = {}) {
  const base = {
    _id:        FORM_ID,
    title:      'Test Form',
    formType:   'self_assessment',
    isAnonymous: false,
    frozenAt:   null,
    questions:  [],
    createdBy:  ADMIN_ID,
  }
  const data = { ...base, ...overrides }
  return Object.assign(data, {
    save:     Form.prototype.save,
    deleteOne: Form.prototype.deleteOne,
  })
}

// =============================================================================
// GET /api/forms
// =============================================================================

describe('GET /api/forms', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/forms')
    expect(res.status).toBe(401)
  })

  it('admin can list forms — returns 200 with data array', async () => {
    Form.find           = jest.fn(() => makeChain([{ _id: FORM_ID, title: 'F1' }]))
    Form.countDocuments = jest.fn().mockResolvedValue(1)
    const res = await request(app)
      .get('/api/forms')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('employee can list forms — returns 200', async () => {
    Form.find           = jest.fn(() => makeChain([]))
    Form.countDocuments = jest.fn().mockResolvedValue(0)
    const res = await request(app)
      .get('/api/forms')
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(200)
  })

  it('returns 400 for invalid ?campaignId query param', async () => {
    const res = await request(app)
      .get('/api/forms?campaignId=not-a-valid-id')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/campaignId invalide/i)
  })

  it('applies valid ?campaignId filter', async () => {
    Form.find           = jest.fn(() => makeChain([]))
    Form.countDocuments = jest.fn().mockResolvedValue(0)
    const res = await request(app)
      .get(`/api/forms?campaignId=${CAMPAIGN_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    const [filter] = Form.find.mock.calls[0]
    expect(filter.campaignId).toBe(CAMPAIGN_ID)
  })

  it('returns 400 for an invalid ?formType query param', async () => {
    const res = await request(app)
      .get('/api/forms?formType=invalid_type')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/formType invalide/i)
  })

  it('applies valid ?formType filter', async () => {
    Form.find           = jest.fn(() => makeChain([]))
    Form.countDocuments = jest.fn().mockResolvedValue(0)
    const res = await request(app)
      .get('/api/forms?formType=self_assessment')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    const [filter] = Form.find.mock.calls[0]
    expect(filter.formType).toBe('self_assessment')
  })

  it('returns pagination metadata (total, page, limit)', async () => {
    Form.find           = jest.fn(() => makeChain([]))
    Form.countDocuments = jest.fn().mockResolvedValue(35)
    const res = await request(app)
      .get('/api/forms?page=2&limit=10')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(35)
    expect(res.body.page).toBe(2)
    expect(res.body.limit).toBe(10)
  })
})

// =============================================================================
// GET /api/forms/:id
// =============================================================================

describe('GET /api/forms/:id', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('returns 400 for an invalid ObjectId', async () => {
    const res = await request(app)
      .get('/api/forms/not-valid')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('returns 404 when form is not found', async () => {
    Form.findById = jest.fn(() => makeChain(null))
    const res = await request(app)
      .get(`/api/forms/${FORM_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/introuvable/i)
  })

  it('admin can fetch a form by id — returns 200', async () => {
    Form.findById = jest.fn(() => makeChain({ _id: FORM_ID, title: 'My Form' }))
    const res = await request(app)
      .get(`/api/forms/${FORM_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('My Form')
  })

  it('employee can fetch a form by id — returns 200', async () => {
    Form.findById = jest.fn(() => makeChain({ _id: FORM_ID, title: 'Employee Form' }))
    const res = await request(app)
      .get(`/api/forms/${FORM_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(200)
  })

  it('manager can fetch a form by id — returns 200', async () => {
    Form.findById = jest.fn(() => makeChain({ _id: FORM_ID, title: 'Manager Form' }))
    const res = await request(app)
      .get(`/api/forms/${FORM_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
    expect(res.status).toBe(200)
  })
})

// =============================================================================
// POST /api/forms
// =============================================================================

describe('POST /api/forms', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
    Form.prototype.save.mockResolvedValue(undefined)
  })

  it('returns 403 for employee', async () => {
    const res = await request(app)
      .post('/api/forms')
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ title: 'Form', formType: 'self_assessment' })
    expect(res.status).toBe(403)
  })

  it('returns 403 for manager', async () => {
    const res = await request(app)
      .post('/api/forms')
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
      .send({ title: 'Form', formType: 'self_assessment' })
    expect(res.status).toBe(403)
  })

  it('returns 403 for director', async () => {
    const res = await request(app)
      .post('/api/forms')
      .set('Cookie', `accessToken=${tokenFor({ id: DIRECTOR_ID, role: 'director' })}`)
      .send({ title: 'Form', formType: 'self_assessment' })
    expect(res.status).toBe(403)
  })

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/forms')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ formType: 'self_assessment' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/title|formType|requis/i)
  })

  it('returns 400 when formType is missing', async () => {
    const res = await request(app)
      .post('/api/forms')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'My Form' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/title|formType|requis/i)
  })

  it('returns 400 when campaignId is provided but invalid', async () => {
    const res = await request(app)
      .post('/api/forms')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'F', formType: 'self_assessment', campaignId: 'bad-id' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/campaignId invalide/i)
  })

  it('returns 400 when questions is not an array', async () => {
    const res = await request(app)
      .post('/api/forms')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'F', formType: 'self_assessment', questions: 'not-an-array' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/tableau/i)
  })

  it('admin creates a form and receives 201', async () => {
    const created = { _id: FORM_ID, title: 'New Form', formType: 'self_assessment' }
    Form.create   = jest.fn().mockResolvedValue({ _id: FORM_ID })
    Form.findById = jest.fn(() => makeChain(created))
    const res = await request(app)
      .post('/api/forms')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'New Form', formType: 'self_assessment' })
    expect(res.status).toBe(201)
    expect(res.body.title).toBe('New Form')
  })

  it('hr creates a form and receives 201', async () => {
    const created = { _id: FORM_ID, title: 'HR Form', formType: 'peer_review' }
    Form.create   = jest.fn().mockResolvedValue({ _id: FORM_ID })
    Form.findById = jest.fn(() => makeChain(created))
    const res = await request(app)
      .post('/api/forms')
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ title: 'HR Form', formType: 'peer_review' })
    expect(res.status).toBe(201)
  })

  it('upward_feedback formType forces isAnonymous=true', async () => {
    Form.create   = jest.fn().mockResolvedValue({ _id: FORM_ID })
    Form.findById = jest.fn(() => makeChain({ _id: FORM_ID, title: 'UF', formType: 'upward_feedback', isAnonymous: true }))
    await request(app)
      .post('/api/forms')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'UF', formType: 'upward_feedback', isAnonymous: false })
    const createArg = Form.create.mock.calls[0][0]
    expect(createArg.isAnonymous).toBe(true)
  })

  it('non-upward_feedback form respects the isAnonymous field from body', async () => {
    Form.create   = jest.fn().mockResolvedValue({ _id: FORM_ID })
    Form.findById = jest.fn(() => makeChain({ _id: FORM_ID, title: 'SA', formType: 'self_assessment', isAnonymous: false }))
    await request(app)
      .post('/api/forms')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'SA', formType: 'self_assessment', isAnonymous: false })
    const createArg = Form.create.mock.calls[0][0]
    expect(createArg.isAnonymous).toBe(false)
  })

  it('persists filledBy and visibleToEvaluatee from the body', async () => {
    Form.create   = jest.fn().mockResolvedValue({ _id: FORM_ID })
    Form.findById = jest.fn(() => makeChain({ _id: FORM_ID }))
    await request(app)
      .post('/api/forms')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'Mgr', formType: 'manager_evaluation', filledBy: 'manager', visibleToEvaluatee: false })
    const createArg = Form.create.mock.calls[0][0]
    expect(createArg.filledBy).toBe('manager')
    expect(createArg.visibleToEvaluatee).toBe(false)
  })

  it('defaults filledBy=employee and visibleToEvaluatee=true when omitted', async () => {
    Form.create   = jest.fn().mockResolvedValue({ _id: FORM_ID })
    Form.findById = jest.fn(() => makeChain({ _id: FORM_ID }))
    await request(app)
      .post('/api/forms')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'Self', formType: 'self_assessment' })
    const createArg = Form.create.mock.calls[0][0]
    expect(createArg.filledBy).toBe('employee')
    expect(createArg.visibleToEvaluatee).toBe(true)
  })

  it('returns 400 for an invalid filledBy value', async () => {
    const res = await request(app)
      .post('/api/forms')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'F', formType: 'self_assessment', filledBy: 'director' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/filledBy/i)
  })
})

// =============================================================================
// PATCH /api/forms/:id
// =============================================================================

describe('PATCH /api/forms/:id', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
    Form.prototype.save.mockResolvedValue(undefined)
  })

  it('returns 403 for employee', async () => {
    const res = await request(app)
      .patch(`/api/forms/${FORM_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ title: 'Hacked' })
    expect(res.status).toBe(403)
  })

  it('returns 403 for manager', async () => {
    const res = await request(app)
      .patch(`/api/forms/${FORM_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
      .send({ title: 'Hacked' })
    expect(res.status).toBe(403)
  })

  it('returns 403 for director', async () => {
    const res = await request(app)
      .patch(`/api/forms/${FORM_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: DIRECTOR_ID, role: 'director' })}`)
      .send({ title: 'Hacked' })
    expect(res.status).toBe(403)
  })

  it('returns 400 for an invalid ObjectId', async () => {
    const res = await request(app)
      .patch('/api/forms/bad-id')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'x' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('returns 404 when form is not found', async () => {
    Form.findById = jest.fn().mockResolvedValue(null)
    const res = await request(app)
      .patch(`/api/forms/${FORM_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'x' })
    expect(res.status).toBe(404)
  })

  it('returns 409 when questions are modified and form is frozen', async () => {
    const doc = mockFormDoc({ frozenAt: new Date('2025-01-15') })
    Form.findById = jest.fn().mockResolvedValue(doc)
    const res = await request(app)
      .patch(`/api/forms/${FORM_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ questions: [{ label: 'New question?' }] })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/gel/i)
    expect(res.body.frozenAt).toBeDefined()
  })

  it('allows title and description update even when form is frozen', async () => {
    const doc = mockFormDoc({ frozenAt: new Date('2025-01-15') })
    Form.findById = jest.fn().mockResolvedValue(doc)
    const res = await request(app)
      .patch(`/api/forms/${FORM_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'Updated title', description: 'Updated desc' })
    expect(res.status).toBe(200)
    expect(doc.title).toBe('Updated title')
    expect(doc.description).toBe('Updated desc')
  })

  it('allows questions update when form is not frozen', async () => {
    const doc = mockFormDoc({ frozenAt: null })
    Form.findById = jest.fn().mockResolvedValue(doc)
    const newQuestions = [{ label: 'Rate your year' }]
    const res = await request(app)
      .patch(`/api/forms/${FORM_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ questions: newQuestions })
    expect(res.status).toBe(200)
    expect(doc.questions).toEqual(newQuestions)
  })

  it('hr can update a form successfully', async () => {
    const doc = mockFormDoc()
    Form.findById = jest.fn().mockResolvedValue(doc)
    const res = await request(app)
      .patch(`/api/forms/${FORM_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ title: 'HR Updated' })
    expect(res.status).toBe(200)
    expect(Form.prototype.save).toHaveBeenCalledTimes(1)
  })

  it('returns form id in the response body on success', async () => {
    const doc = mockFormDoc()
    Form.findById = jest.fn().mockResolvedValue(doc)
    const res = await request(app)
      .patch(`/api/forms/${FORM_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'New title' })
    expect(res.status).toBe(200)
    expect(res.body.id).toBeDefined()
  })
})

// =============================================================================
// DELETE /api/forms/:id
// =============================================================================

describe('DELETE /api/forms/:id', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
    Form.prototype.deleteOne.mockResolvedValue({})
  })

  it('returns 403 for employee', async () => {
    const res = await request(app)
      .delete(`/api/forms/${FORM_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(403)
  })

  it('returns 403 for manager', async () => {
    const res = await request(app)
      .delete(`/api/forms/${FORM_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
    expect(res.status).toBe(403)
  })

  it('returns 403 for director', async () => {
    const res = await request(app)
      .delete(`/api/forms/${FORM_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: DIRECTOR_ID, role: 'director' })}`)
    expect(res.status).toBe(403)
  })

  it('returns 400 for an invalid ObjectId', async () => {
    const res = await request(app)
      .delete('/api/forms/bad-id')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('returns 404 when form is not found', async () => {
    Form.findById = jest.fn().mockResolvedValue(null)
    const res = await request(app)
      .delete(`/api/forms/${FORM_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(404)
  })

  it('returns 409 when form is frozen (linked to evaluations)', async () => {
    Form.findById = jest.fn().mockResolvedValue(
      mockFormDoc({ frozenAt: new Date('2025-02-01') })
    )
    const res = await request(app)
      .delete(`/api/forms/${FORM_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/supprim|gel|valuations/i)
    expect(res.body.frozenAt).toBeDefined()
  })

  it('returns 204 and deletes a non-frozen form (admin)', async () => {
    Form.findById = jest.fn().mockResolvedValue(mockFormDoc({ frozenAt: null }))
    const res = await request(app)
      .delete(`/api/forms/${FORM_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(204)
    expect(Form.prototype.deleteOne).toHaveBeenCalledTimes(1)
  })

  it('returns 204 and deletes a non-frozen form (hr)', async () => {
    Form.findById = jest.fn().mockResolvedValue(mockFormDoc({ frozenAt: null }))
    const res = await request(app)
      .delete(`/api/forms/${FORM_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
    expect(res.status).toBe(204)
    expect(Form.prototype.deleteOne).toHaveBeenCalledTimes(1)
  })
})

// =============================================================================
// POST /api/forms/:id/freeze
// =============================================================================

describe('POST /api/forms/:id/freeze', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
    Form.prototype.save.mockResolvedValue(undefined)
  })

  it('returns 403 for hr role (admin only)', async () => {
    const res = await request(app)
      .post(`/api/forms/${FORM_ID}/freeze`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
    expect(res.status).toBe(403)
  })

  it('returns 403 for employee', async () => {
    const res = await request(app)
      .post(`/api/forms/${FORM_ID}/freeze`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid ObjectId', async () => {
    const res = await request(app)
      .post('/api/forms/bad-id/freeze')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('returns 404 when form not found', async () => {
    Form.findById = jest.fn()
      .mockResolvedValueOnce(null)
    const res = await request(app)
      .post(`/api/forms/${FORM_ID}/freeze`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(404)
  })

  it('admin can freeze a form — returns 200 with success and form', async () => {
    const doc = mockFormDoc({ isFrozen: false, frozenAt: null })
    Form.findById = jest.fn()
      .mockResolvedValueOnce(doc)
      .mockReturnValueOnce(makeChain({ ...doc, isFrozen: true }))
    const res = await request(app)
      .post(`/api/forms/${FORM_ID}/freeze`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.form).toBeDefined()
  })
})

// =============================================================================
// POST /api/forms/:id/unfreeze
// =============================================================================

describe('POST /api/forms/:id/unfreeze', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
    Form.prototype.save.mockResolvedValue(undefined)
  })

  it('returns 403 for hr role (admin only)', async () => {
    const res = await request(app)
      .post(`/api/forms/${FORM_ID}/unfreeze`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
    expect(res.status).toBe(403)
  })

  it('returns 404 when form not found', async () => {
    Form.findById = jest.fn().mockResolvedValueOnce(null)
    const res = await request(app)
      .post(`/api/forms/${FORM_ID}/unfreeze`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(404)
  })

  it('admin can unfreeze a form — returns 200 with success and form', async () => {
    Evaluation.countDocuments.mockResolvedValueOnce(0)
    const doc = mockFormDoc({ isFrozen: true, frozenAt: new Date() })
    Form.findById = jest.fn()
      .mockResolvedValueOnce(doc)
      .mockReturnValueOnce(makeChain({ ...doc, isFrozen: false, frozenAt: null }))
    const res = await request(app)
      .post(`/api/forms/${FORM_ID}/unfreeze`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.form).toBeDefined()
  })

  it('refuses unfreeze when started evaluations reference the form — returns 409', async () => {
    Evaluation.countDocuments.mockResolvedValueOnce(3)
    const doc = mockFormDoc({ isFrozen: true, frozenAt: new Date() })
    Form.findById = jest.fn().mockResolvedValueOnce(doc)
    const res = await request(app)
      .post(`/api/forms/${FORM_ID}/unfreeze`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(409)
  })
})

// =============================================================================
// POST /api/forms/:id/clone
// =============================================================================

describe('POST /api/forms/:id/clone', () => {
  const app = buildApp()
  const NEW_FORM_ID = '507f1f77bcf86cd799439099'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 403 for employee', async () => {
    const res = await request(app)
      .post(`/api/forms/${FORM_ID}/clone`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(403)
  })

  it('returns 403 for manager', async () => {
    const res = await request(app)
      .post(`/api/forms/${FORM_ID}/clone`)
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid ObjectId', async () => {
    const res = await request(app)
      .post('/api/forms/bad-id/clone')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(400)
  })

  it('returns 404 when form not found', async () => {
    Form.findById = jest.fn().mockReturnValueOnce(makeChain(null))
    const res = await request(app)
      .post(`/api/forms/${FORM_ID}/clone`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(404)
  })

  it('admin clones a form — returns 201 with cloned form titled "Copie de ..."', async () => {
    const original = { _id: FORM_ID, title: 'Formulaire annuel', formType: 'self_assessment', questions: [], createdBy: ADMIN_ID }
    const cloned   = { _id: NEW_FORM_ID, title: 'Copie de Formulaire annuel', formType: 'self_assessment', questions: [], isFrozen: false }
    Form.findById = jest.fn()
      .mockReturnValueOnce(makeChain(original))
      .mockReturnValueOnce(makeChain(cloned))
    Form.create = jest.fn().mockResolvedValue({ _id: NEW_FORM_ID })
    const res = await request(app)
      .post(`/api/forms/${FORM_ID}/clone`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(201)
    expect(res.body.form).toBeDefined()
    expect(res.body.form.title).toMatch(/^Copie de/)
    const createArg = Form.create.mock.calls[0][0]
    expect(createArg.isFrozen).toBe(false)
    expect(createArg.frozenAt).toBeNull()
  })

  it('hr can clone a form — returns 201', async () => {
    const original = { _id: FORM_ID, title: 'Form RH', formType: 'peer_review', questions: [], createdBy: HR_ID }
    const cloned   = { _id: NEW_FORM_ID, title: 'Copie de Form RH', formType: 'peer_review', questions: [] }
    Form.findById = jest.fn()
      .mockReturnValueOnce(makeChain(original))
      .mockReturnValueOnce(makeChain(cloned))
    Form.create = jest.fn().mockResolvedValue({ _id: NEW_FORM_ID })
    const res = await request(app)
      .post(`/api/forms/${FORM_ID}/clone`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
    expect(res.status).toBe(201)
  })
})

// =============================================================================
// GET /api/forms — ?search filter
// =============================================================================

describe('GET /api/forms — search filter', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('applies ?search filter as $text search on title', async () => {
    Form.find           = jest.fn(() => makeChain([]))
    Form.countDocuments = jest.fn().mockResolvedValue(0)
    const res = await request(app)
      .get('/api/forms?search=annuel')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    const [filter] = Form.find.mock.calls[0]
    expect(filter.$text).toEqual({ $search: 'annuel' })
  })

  it('returns results when ?search matches form titles', async () => {
    Form.find           = jest.fn(() => makeChain([{ _id: FORM_ID, title: 'Évaluation annuelle' }]))
    Form.countDocuments = jest.fn().mockResolvedValue(1)
    const res = await request(app)
      .get('/api/forms?search=annuelle')
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(1)
  })
})
