'use strict'

// Evaluations route integration tests — no real MongoDB connection.
// Models are mocked; authGuard, managerVisibility, and notificationService are mocked.
//
// Key regression tests:
//   Bug 2 — employee-as-evaluatee was blocked from PATCH (sign / comment)
//   Bug 5 — any manager could change status on evaluations they didn't own

const jwt = require('jsonwebtoken')

// ─── Mock: ../../models ───────────────────────────────────────────────────────
// Constants must be declared INSIDE the factory because jest.mock() is hoisted
// before any module-level code and cannot close over outer-scope variables.
jest.mock('../../models', () => {
  // ── Transition tables (mirrors models/Evaluation.js) ──────────────────────
  const VALID_TRANSITIONS_MOCK = {
    assigned:         ['in_progress'],
    in_progress:      ['submitted'],
    submitted:        ['reviewed'],
    reviewed:         ['signed_evaluatee'],
    signed_evaluatee: ['signed_manager'],
    signed_manager:   ['signed_hr'],
    signed_hr:        ['validated'],
    validated:        [],
    expired:          [],
    archived:         [],
  }

  const ROLE_TRANSITIONS_MOCK = {
    employee: {
      assigned:    ['in_progress'],
      in_progress: ['submitted'],
      reviewed:    ['signed_evaluatee'],
    },
    manager: {
      submitted:        ['reviewed'],
      signed_evaluatee: ['signed_manager'],
    },
    director: {
      submitted:        ['reviewed'],
      signed_evaluatee: ['signed_manager'],
    },
    hr: {
      reviewed:         ['signed_hr'],
      signed_evaluatee: ['signed_hr'],
      signed_manager:   ['signed_hr'],
    },
  }

  const LOCKED_STATUSES_MOCK = [
    'submitted', 'reviewed', 'signed_evaluatee',
    'signed_manager', 'signed_hr', 'validated', 'archived',
  ]

  // ── Chainable query stub used by .find().select().lean() patterns ──────────
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

  const Evaluation = {
    find:           jest.fn(() => makeChain([])),
    findById:       jest.fn(),
    countDocuments: jest.fn().mockResolvedValue(0),
    updateMany:     jest.fn().mockResolvedValue({ modifiedCount: 0 }),
  }

  const Form     = { findById: jest.fn(() => makeChain(null)) }
  const Campaign = { findById: jest.fn(() => makeChain(null)), find: jest.fn(() => makeChain([])) }
  const User     = { find: jest.fn(() => makeChain([])), findById: jest.fn(() => makeChain(null)) }
  const AuditLog = { create: jest.fn().mockResolvedValue({}) }

  return {
    Evaluation, Form, Campaign, User, AuditLog,
    VALID_TRANSITIONS: VALID_TRANSITIONS_MOCK,
    ROLE_TRANSITIONS:  ROLE_TRANSITIONS_MOCK,
    LOCKED_STATUSES:   LOCKED_STATUSES_MOCK,
  }
})

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

jest.mock('../../services/managerVisibility', () => ({
  getVisibleUserIds: jest.fn().mockResolvedValue([]),
}))

jest.mock('../../services/notificationService', () => ({
  notify:     jest.fn().mockResolvedValue(undefined),
  notifyMany: jest.fn().mockResolvedValue(undefined),
}))

const { Evaluation } = require('../../models')
const request        = require('supertest')
const express        = require('express')
const cookieParser   = require('cookie-parser')
const { authGuard }  = require('../../middleware/authGuard')
const evalRouter     = require('../../routes/evaluations')

const SECRET = 'test-secret-long-enough-for-hs256-algorithm'
process.env.JWT_SECRET = SECRET
process.env.NODE_ENV   = 'test'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ADMIN_ID         = '507f1f77bcf86cd799439001'
const MANAGER_ID       = '507f1f77bcf86cd799439002'
const OTHER_MANAGER_ID = '507f1f77bcf86cd799439006'
const EMPLOYEE_ID      = '507f1f77bcf86cd799439003'
const OTHER_ID         = '507f1f77bcf86cd799439005'
const EVAL_ID          = '507f1f77bcf86cd799439011'
const CAMPAIGN_ID      = '507f1f77bcf86cd799439020'

function tokenFor({ id, role }) {
  return jwt.sign({ id, email: `${role}@corp.com`, role }, SECRET, {
    algorithm: 'HS256', expiresIn: '1h',
  })
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/evaluations', authGuard(['admin', 'director', 'hr', 'manager', 'employee']), evalRouter)
  // Global error handler (mirrors index.js, including Bug 3 fix)
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    let status = err.status || 500
    if (err.name === 'ValidationError' || err.name === 'CastError') status = 400
    res.status(status).json({ error: err.message || 'Internal server error' })
  })
  return app
}

// Creates a dual-mode query stub: directly awaitable (resolves to result) AND
// chainable (.populate().lean() also resolves to result). Mirrors Mongoose Query.
function makeThenable(result) {
  return {
    populate: jest.fn().mockReturnThis(),
    lean:     jest.fn().mockImplementation(() => makeThenable(result)),
    then:     (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch:    (reject) => Promise.resolve(result).catch(reject),
  }
}

// Return a minimal Mongoose-document-like evaluation object.
// evaluatorId and evaluateeId are plain strings — .toString() works natively.
function mockEvalDoc(overrides = {}) {
  return {
    _id:              EVAL_ID,
    campaignId:       CAMPAIGN_ID,
    evaluatorId:      MANAGER_ID,
    evaluateeId:      EMPLOYEE_ID,
    status:           'assigned',
    answers:          [],
    isAnonymous:      false,
    formId:           { isAnonymous: false },
    lastSavedAt:      null,
    reviewerComment:  null,
    evaluateeComment: null,
    save:             jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

// ─── PATCH /api/evaluations/:id — employee-as-evaluatee (Bug 2 regression) ───
//
// Before the fix, employees were blocked unless evaluatorId === uid.
// A legitimate evaluatee (not evaluator) could not react, comment, or sign.

describe('PATCH /api/evaluations/:id — employee as evaluatee (Bug 2 regression)', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('allows an evaluatee employee to add evaluateeComment', async () => {
    Evaluation.findById = jest.fn().mockReturnValue(makeThenable(mockEvalDoc({
      evaluatorId: MANAGER_ID,   // different from the caller
      evaluateeId: EMPLOYEE_ID,  // matches the caller
      status:      'reviewed',
    })))

    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ evaluateeComment: 'Je suis en désaccord avec cette évaluation.' })

    expect(res.status).toBe(200)
  })

  it('allows an evaluatee employee to sign (reviewed → signed_evaluatee)', async () => {
    Evaluation.findById = jest.fn().mockReturnValue(makeThenable(mockEvalDoc({
      evaluatorId: MANAGER_ID,
      evaluateeId: EMPLOYEE_ID,
      status:      'reviewed',
    })))

    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ status: 'signed_evaluatee' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('signed_evaluatee')
  })

  it('blocks an employee who is neither evaluator nor evaluatee', async () => {
    Evaluation.findById = jest.fn().mockReturnValue(makeThenable(mockEvalDoc({
      evaluatorId: MANAGER_ID,
      evaluateeId: OTHER_ID,    // unrelated to EMPLOYEE_ID
      status:      'reviewed',
    })))

    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ evaluateeComment: 'I should not be able to do this.' })

    expect(res.status).toBe(403)
  })

  it('allows the evaluator employee to save answers (self-evaluation scenario)', async () => {
    // Self-evaluation: evaluatorId === evaluateeId === EMPLOYEE_ID
    Evaluation.findById = jest.fn().mockReturnValue(makeThenable(mockEvalDoc({
      evaluatorId: EMPLOYEE_ID,
      evaluateeId: EMPLOYEE_ID,
      status:      'in_progress',
    })))

    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ answers: [{ questionId: 'q1', value: 'Good year' }] })

    expect(res.status).toBe(200)
  })
})

// ─── PATCH /api/evaluations/:id — manager evaluatorId check (Bug 5 regression) ─
//
// Before the fix, any manager could transition the status of any evaluation by ID.
// Now, the manager must be the assigned evaluatorId.

describe('PATCH /api/evaluations/:id — manager evaluatorId check (Bug 5 regression)', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('blocks a manager from changing status on an evaluation they do not own', async () => {
    Evaluation.findById = jest.fn().mockReturnValue(makeThenable(mockEvalDoc({
      evaluatorId: OTHER_MANAGER_ID,  // a different manager is the evaluator
      evaluateeId: EMPLOYEE_ID,
      status:      'submitted',
    })))

    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
      .send({ status: 'reviewed' })

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/évaluateur/i)
  })

  it('allows a manager to advance status on their own evaluation (submitted → reviewed)', async () => {
    Evaluation.findById = jest.fn().mockReturnValue(makeThenable(mockEvalDoc({
      evaluatorId: MANAGER_ID,
      evaluateeId: EMPLOYEE_ID,
      status:      'submitted',
    })))

    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
      .send({ status: 'reviewed' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('reviewed')
  })

  it('allows a manager to co-sign their own evaluation (signed_evaluatee → signed_manager)', async () => {
    Evaluation.findById = jest.fn().mockReturnValue(makeThenable(mockEvalDoc({
      evaluatorId: MANAGER_ID,
      evaluateeId: EMPLOYEE_ID,
      status:      'signed_evaluatee',
    })))

    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
      .send({ status: 'signed_manager' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('signed_manager')
  })
})

// ─── PATCH /api/evaluations/:id — status transition validation ────────────────

describe('PATCH /api/evaluations/:id — status transition validation', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('returns 400 for an invalid transition (employee: in_progress → validated)', async () => {
    Evaluation.findById = jest.fn().mockReturnValue(makeThenable(mockEvalDoc({
      evaluatorId: EMPLOYEE_ID,
      evaluateeId: EMPLOYEE_ID,
      status:      'in_progress',
    })))

    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ status: 'validated' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/transition/i)
  })

  it('returns 400 for an unknown target status', async () => {
    Evaluation.findById = jest.fn().mockReturnValue(makeThenable(mockEvalDoc({
      evaluatorId: MANAGER_ID,
      evaluateeId: EMPLOYEE_ID,
      status:      'submitted',
    })))

    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
      .send({ status: 'unknown_status' })

    expect(res.status).toBe(400)
  })

  it('admin bypasses ROLE_TRANSITIONS and can use any VALID_TRANSITIONS step', async () => {
    // Admin moves submitted → reviewed (normally a manager-only transition)
    Evaluation.findById = jest.fn().mockReturnValue(makeThenable(mockEvalDoc({
      evaluatorId: MANAGER_ID,
      evaluateeId: EMPLOYEE_ID,
      status:      'submitted',
    })))

    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ status: 'reviewed' })

    expect(res.status).toBe(200)
  })

  it('returns 409 when saving answers on a locked evaluation', async () => {
    Evaluation.findById = jest.fn().mockReturnValue(makeThenable(mockEvalDoc({
      evaluatorId: EMPLOYEE_ID,
      evaluateeId: EMPLOYEE_ID,
      status:      'submitted',  // locked
    })))

    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ answers: [{ questionId: 'q1', value: 'Too late' }] })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/verrouill/i)
  })
})

// ─── PATCH /api/evaluations/:id — input validation ───────────────────────────

describe('PATCH /api/evaluations/:id — input validation', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .send({ status: 'reviewed' })
    expect(res.status).toBe(401)
  })

  it('returns 400 for an invalid evaluation ObjectId', async () => {
    const res = await request(app)
      .patch('/api/evaluations/not-a-valid-id')
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
      .send({ status: 'reviewed' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('returns 404 for a nonexistent evaluation', async () => {
    Evaluation.findById = jest.fn().mockResolvedValue(null)
    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
      .send({ status: 'reviewed' })
    expect(res.status).toBe(404)
  })

  it('returns 400 when answers is not an array', async () => {
    Evaluation.findById = jest.fn().mockReturnValue(makeThenable(mockEvalDoc({
      evaluatorId: EMPLOYEE_ID,
      evaluateeId: EMPLOYEE_ID,
      status:      'in_progress',
    })))

    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ answers: 'not-an-array' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/tableau/i)
  })
})
