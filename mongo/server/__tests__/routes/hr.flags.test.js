'use strict'

// hr.flags.test.js — Tests for GET /api/hr/flags, GET /api/hr/flags/count,
// and PATCH /api/hr/flags/:evalId/status
// Models and services are mocked; no real DB.

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../models', () => {
  function _chain(result) {
    return {
      select:   jest.fn().mockReturnThis(),
      sort:     jest.fn().mockReturnThis(),
      skip:     jest.fn().mockReturnThis(),
      limit:    jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean:     jest.fn().mockResolvedValue(result),
    }
  }

  const MockUser = {
    find:           jest.fn(() => _chain([])),
    findById:       jest.fn(() => ({ lean: jest.fn().mockResolvedValue(null) })),
    countDocuments: jest.fn().mockResolvedValue(0),
  }

  function MockForm() {}
  MockForm.find = jest.fn(() => _chain([]))

  function MockEvaluation() {}
  MockEvaluation.find           = jest.fn(() => _chain([]))
  MockEvaluation.findById       = jest.fn().mockResolvedValue(null)
  MockEvaluation.countDocuments = jest.fn().mockResolvedValue(0)

  return { User: MockUser, Form: MockForm, Evaluation: MockEvaluation }
})

jest.mock('../../middleware/authGuard', () => ({
  authGuard: (roles = []) => (req, res, next) => {
    const jwt   = require('jsonwebtoken')
    const token = req.cookies?.token
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

jest.mock('../../services/notificationHelper', () => ({
  notify: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../services/notificationService', () => ({
  notify: jest.fn().mockResolvedValue(undefined),
}))

// ─── Imports (after mocks) ────────────────────────────────────────────────────

const jwt            = require('jsonwebtoken')
const request        = require('supertest')
const express        = require('express')
const cookieParser   = require('cookie-parser')
const { authGuard }  = require('../../middleware/authGuard')
const hrFlagsRouter  = require('../../routes/hr/flags')
const { User, Form, Evaluation } = require('../../models')

const SECRET = 'test-secret-long-enough-for-hs256-algorithm'
process.env.JWT_SECRET = SECRET
process.env.NODE_ENV   = 'test'

// ─── App builder ──────────────────────────────────────────────────────────────

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/hr/flags', authGuard(['admin', 'hr']), hrFlagsRouter)
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
  })
  return app
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ADMIN_ID    = '507f1f77bcf86cd799439001'
const HR_ID       = '507f1f77bcf86cd799439002'
const EMPLOYEE_ID = '507f1f77bcf86cd799439003'
const FORM_ID     = '507f1f77bcf86cd799439010'
const EVAL_ID     = '507f1f77bcf86cd799439020'

function tokenFor({ id, role }) {
  return jwt.sign({ id, email: `${role}@corp.com`, role }, SECRET, {
    algorithm: 'HS256', expiresIn: '1h',
  })
}

const HR_TOKEN       = tokenFor({ id: HR_ID,       role: 'hr'       })
const ADMIN_TOKEN    = tokenFor({ id: ADMIN_ID,    role: 'admin'    })
const EMPLOYEE_TOKEN = tokenFor({ id: EMPLOYEE_ID, role: 'employee' })

const MOCK_FORMS = [
  {
    _id:      { toString: () => FORM_ID },
    formType: 'mobility_request',
    title:    'Demande de mobilité',
  },
]

const MOCK_EVALS = [
  {
    _id:         EVAL_ID,
    formId:      { _id: FORM_ID, title: 'Demande de mobilité', formType: 'mobility_request' },
    evaluateeId: { _id: EMPLOYEE_ID, firstName: 'Jean', lastName: 'Dupont', email: 'jean@corp.com', department: 'IT' },
    status:      'submitted',
    createdAt:   new Date().toISOString(),
  },
]

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

// ─── Tests : GET /api/hr/flags ────────────────────────────────────────────────

describe('GET /api/hr/flags', () => {
  const app = buildApp()

  beforeEach(() => {
    Form.find           = jest.fn(() => makeChain(MOCK_FORMS))
    Evaluation.countDocuments = jest.fn().mockResolvedValue(1)
    Evaluation.find     = jest.fn(() => makeChain(MOCK_EVALS))
    User.find           = jest.fn(() => makeChain([]))
  })

  it('200 — hr voit toutes les demandes', async () => {
    const res = await request(app)
      .get('/api/hr/flags')
      .set('Cookie', `token=${HR_TOKEN}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body).toHaveProperty('total',  1)
    expect(res.body).toHaveProperty('page',   1)
    expect(res.body).toHaveProperty('limit')
    expect(res.body).toHaveProperty('totalPages')
  })

  it('403 — employee ne peut pas lister les flags', async () => {
    const res = await request(app)
      .get('/api/hr/flags')
      .set('Cookie', `token=${EMPLOYEE_TOKEN}`)

    expect(res.status).toBe(403)
  })

  it('200 — filtre ?type=mobility_request est accepté', async () => {
    const res = await request(app)
      .get('/api/hr/flags?type=mobility_request')
      .set('Cookie', `token=${HR_TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
  })

  it('200 — pagination retourne {data, total, page, limit, totalPages} corrects', async () => {
    Evaluation.countDocuments = jest.fn().mockResolvedValue(12)
    Evaluation.find           = jest.fn(() => makeChain(MOCK_EVALS))

    const res = await request(app)
      .get('/api/hr/flags?page=1&limit=5')
      .set('Cookie', `token=${ADMIN_TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body.page).toBe(1)
    expect(res.body.limit).toBe(5)
    expect(res.body.total).toBe(12)
    expect(res.body.totalPages).toBe(3) // Math.ceil(12 / 5)
  })
})

// ─── Tests : GET /api/hr/flags/count ─────────────────────────────────────────

describe('GET /api/hr/flags/count', () => {
  const app = buildApp()

  beforeEach(() => {
    Form.find       = jest.fn(() => makeChain(MOCK_FORMS))
    Evaluation.find = jest.fn(() => makeChain([
      { formId: { toString: () => FORM_ID } },
    ]))
  })

  it('200 — retourne {count, byType}', async () => {
    const res = await request(app)
      .get('/api/hr/flags/count')
      .set('Cookie', `token=${HR_TOKEN}`)

    expect(res.status).toBe(200)
    expect(typeof res.body.count).toBe('number')
    expect(typeof res.body.byType).toBe('object')
    expect(res.body.count).toBe(1)
    expect(res.body.byType).toHaveProperty('mobility_request', 1)
  })
})

// ─── Tests : PATCH /api/hr/flags/:evalId/status ───────────────────────────────

describe('PATCH /api/hr/flags/:evalId/status', () => {
  const app = buildApp()

  const mockEvalInstance = {
    _id:         { toString: () => EVAL_ID },
    status:      'submitted',
    evaluateeId: EMPLOYEE_ID,
    formId:      { _id: FORM_ID, title: 'Demande de mobilité' },
    auditLog:    [],
    save:        jest.fn().mockResolvedValue(undefined),
    populate:    jest.fn().mockResolvedValue(undefined),
    toObject:    jest.fn().mockReturnValue({ _id: EVAL_ID, status: 'reviewed' }),
  }

  beforeEach(() => {
    Evaluation.findById = jest.fn().mockResolvedValue(mockEvalInstance)
    User.findById       = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    })
    mockEvalInstance.save.mockResolvedValue(undefined)
    mockEvalInstance.populate.mockResolvedValue(undefined)
  })

  it('200 — hr peut changer le statut en "reviewed"', async () => {
    const res = await request(app)
      .patch(`/api/hr/flags/${EVAL_ID}/status`)
      .set('Cookie', `token=${HR_TOKEN}`)
      .send({ status: 'reviewed' })

    expect(res.status).toBe(200)
    expect(mockEvalInstance.save).toHaveBeenCalled()
  })

  it('403 — employee ne peut pas modifier le statut', async () => {
    const res = await request(app)
      .patch(`/api/hr/flags/${EVAL_ID}/status`)
      .set('Cookie', `token=${EMPLOYEE_TOKEN}`)
      .send({ status: 'reviewed' })

    expect(res.status).toBe(403)
  })

  it('400 — statut invalide (in_progress) retourne 400', async () => {
    const res = await request(app)
      .patch(`/api/hr/flags/${EVAL_ID}/status`)
      .set('Cookie', `token=${HR_TOKEN}`)
      .send({ status: 'in_progress' }) // not in PATCHABLE_STATUSES

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('404 — évaluation introuvable retourne 404', async () => {
    Evaluation.findById = jest.fn().mockResolvedValue(null)

    const res = await request(app)
      .patch(`/api/hr/flags/${EVAL_ID}/status`)
      .set('Cookie', `token=${HR_TOKEN}`)
      .send({ status: 'reviewed' })

    expect(res.status).toBe(404)
  })
})
