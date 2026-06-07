'use strict'

// evaluations.bulk.test.js — Unit tests for routes/evaluations/bulk.js
// Covers POST /bulk (handleBulkCreate) and PATCH /bulk (handleBulkAction).
// No real DB — all models are mocked.

const jwt = require('jsonwebtoken')

// ─── Mock: ../../models ───────────────────────────────────────────────────────
// Constants are declared inside the factory because jest.mock() is hoisted.
jest.mock('../../models', () => {
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

  const Evaluation = {
    find:       jest.fn(),
    findById:   jest.fn(),
    insertMany: jest.fn(),
    bulkWrite:  jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  }

  const Form = {
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    // bulk.js charge les types de formulaire pour calculer phaseDeadline.
    // Défaut : aucun form trouvé (phaseDeadline → null). Conservé par clearAllMocks.
    find: jest.fn(() => ({ lean: () => Promise.resolve([]) })),
  }

  const Campaign = {
    find:     jest.fn(),
    findById: jest.fn(),
  }

  const User = {
    find: jest.fn(),
  }

  const AuditLog = {
    create: jest.fn().mockResolvedValue({}),
  }

  return {
    Evaluation,
    Form,
    Campaign,
    User,
    AuditLog,
    VALID_TRANSITIONS: VALID_TRANSITIONS_MOCK,
    ROLE_TRANSITIONS:  ROLE_TRANSITIONS_MOCK,
  }
})

// ─── Mock: ../../middleware/authGuard ─────────────────────────────────────────
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

// ─── Mock: ../../services/mailNotificationService ─────────────────────────────
jest.mock('../../services/mailNotificationService', () => ({
  notify:     jest.fn().mockResolvedValue(undefined),
  notifyMany: jest.fn().mockResolvedValue(undefined),
}))

// ─── Imports (after mocks) ────────────────────────────────────────────────────
const { Evaluation, Form, Campaign, User, AuditLog } = require('../../models')
const request        = require('supertest')
const express        = require('express')
const cookieParser   = require('cookie-parser')
const { authGuard }  = require('../../middleware/authGuard')
const { handleBulkCreate, handleBulkAction } = require('../../routes/evaluations/bulk')

const SECRET = 'test-secret-long-enough-for-hs256-algorithm'
process.env.JWT_SECRET = SECRET
process.env.NODE_ENV   = 'test'

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const ADMIN_ID    = '507f1f77bcf86cd799439001'
const HR_ID       = '507f1f77bcf86cd799439002'
const MANAGER_ID  = '507f1f77bcf86cd799439003'
const EMPLOYEE_ID = '507f1f77bcf86cd799439004'
const DIRECTOR_ID = '507f1f77bcf86cd799439005'
const EVAL_ID     = '507f1f77bcf86cd799439011'
const EVAL_ID_2   = '507f1f77bcf86cd799439012'
const CAMPAIGN_ID = '507f1f77bcf86cd799439020'
const FORM_ID     = '507f1f77bcf86cd799439030'
const REVIEWER_ID = '507f1f77bcf86cd799439040'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tokenFor({ id, role }) {
  return jwt.sign({ id, email: `${role}@corp.com`, role }, SECRET, {
    algorithm: 'HS256', expiresIn: '1h',
  })
}

const ALL_ROLES = ['admin', 'director', 'hr', 'manager', 'employee']

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.post('/bulk',  authGuard(ALL_ROLES), handleBulkCreate)
  app.patch('/bulk', authGuard(ALL_ROLES), handleBulkAction)
   
  app.use((err, _req, res, _next) => {
    const status = err.status || 500
    res.status(status).json({ error: err.message || 'Internal server error' })
  })
  return app
}

/** Returns a minimal valid evaluation payload for POST /bulk. */
function validEval(overrides = {}) {
  return {
    campaignId:  CAMPAIGN_ID,
    formId:      FORM_ID,
    evaluatorId: MANAGER_ID,
    evaluateeId: EMPLOYEE_ID,
    ...overrides,
  }
}

/**
 * Returns a chainable Mongoose query stub that resolves via .lean().
 * Needed for Campaign.find(...).lean() and User.find(...).lean() patterns.
 */
function makeLeanChain(result) {
  return { lean: jest.fn().mockResolvedValue(result) }
}

/** Sets up Evaluation.find to return docs via a .lean() chain (PATCH /bulk uses .lean()). */
function mockEvalFind(docs) {
  Evaluation.find.mockReturnValue(makeLeanChain(docs))
}

/**
 * Returns a plain document-like object usable by PATCH /bulk handlers.
 * _id is a plain string so that .toString() works naturally.
 */
function mockEvalDoc(overrides = {}) {
  return {
    _id:         EVAL_ID,
    status:      'assigned',
    evaluatorId: MANAGER_ID,
    evaluateeId: EMPLOYEE_ID,
    ...overrides,
  }
}

// ─── POST /bulk — authentication & authorization ──────────────────────────────

describe('POST /bulk — authentication & authorization', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
    Campaign.find.mockReturnValue(makeLeanChain([]))
    Form.updateMany.mockResolvedValue({ modifiedCount: 0 })
    User.find.mockReturnValue(makeLeanChain([]))
    Evaluation.insertMany.mockResolvedValue([{ _id: EVAL_ID }])
  })

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).post('/bulk').send({ evaluations: [validEval()] })
    expect(res.status).toBe(401)
  })

  it('returns 401 for an invalid/expired token', async () => {
    const res = await request(app)
      .post('/bulk')
      .set('Cookie', 'accessToken=this.is.not.valid')
      .send({ evaluations: [validEval()] })
    expect(res.status).toBe(401)
  })

  it('returns 403 for manager role (not in ADMIN_ROLES)', async () => {
    const res = await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
      .send({ evaluations: [validEval()] })
    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/admins|RH/i)
  })

  it('returns 403 for employee role', async () => {
    const res = await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ evaluations: [validEval()] })
    expect(res.status).toBe(403)
  })

  it('returns 403 for director role', async () => {
    const res = await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: DIRECTOR_ID, role: 'director' })}`)
      .send({ evaluations: [validEval()] })
    expect(res.status).toBe(403)
  })
})

// ─── POST /bulk — input validation ───────────────────────────────────────────

describe('POST /bulk — input validation', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
    Campaign.find.mockReturnValue(makeLeanChain([]))
    Form.updateMany.mockResolvedValue({ modifiedCount: 0 })
    User.find.mockReturnValue(makeLeanChain([]))
  })

  it('returns 400 when evaluations key is absent', async () => {
    const res = await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/tableau/i)
  })

  it('returns 400 when evaluations is an empty array', async () => {
    const res = await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ evaluations: [] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/tableau/i)
  })

  it('returns 400 when evaluations is not an array (string)', async () => {
    const res = await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ evaluations: 'not-an-array' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when evaluations length exceeds 500', async () => {
    const evaluations = Array.from({ length: 501 }, () => validEval())
    const res = await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ evaluations })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/500/i)
  })

  it('returns 400 when campaignId is missing', async () => {
    const ev = { formId: FORM_ID, evaluatorId: MANAGER_ID, evaluateeId: EMPLOYEE_ID }
    const res = await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ evaluations: [ev] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/campaignId/i)
  })

  it('returns 400 when formId is missing', async () => {
    const ev = { campaignId: CAMPAIGN_ID, evaluatorId: MANAGER_ID, evaluateeId: EMPLOYEE_ID }
    const res = await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ evaluations: [ev] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/formId/i)
  })

  it('returns 400 when evaluatorId is missing', async () => {
    const ev = { campaignId: CAMPAIGN_ID, formId: FORM_ID, evaluateeId: EMPLOYEE_ID }
    const res = await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ evaluations: [ev] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/evaluatorId/i)
  })

  it('returns 400 when evaluateeId is missing', async () => {
    const ev = { campaignId: CAMPAIGN_ID, formId: FORM_ID, evaluatorId: MANAGER_ID }
    const res = await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ evaluations: [ev] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/evaluateeId/i)
  })

  it('returns 400 when campaignId is an invalid ObjectId', async () => {
    const res = await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ evaluations: [validEval({ campaignId: 'bad-id' })] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/campaignId/i)
  })

  it('returns 400 when formId is an invalid ObjectId', async () => {
    const res = await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ evaluations: [validEval({ formId: 'bad-id' })] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/formId/i)
  })

  it('returns 400 when evaluatorId is an invalid ObjectId', async () => {
    const res = await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ evaluations: [validEval({ evaluatorId: 'bad-id' })] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/evaluatorId/i)
  })

  it('returns 400 when evaluateeId is an invalid ObjectId', async () => {
    const res = await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ evaluations: [validEval({ evaluateeId: 'bad-id' })] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/evaluateeId/i)
  })
})

// ─── POST /bulk — successful creation ────────────────────────────────────────

describe('POST /bulk — successful creation', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
    Form.updateMany.mockResolvedValue({ modifiedCount: 1 })
    Campaign.find.mockReturnValue(makeLeanChain([
      { _id: { toString: () => CAMPAIGN_ID }, endDate: new Date('2025-12-31') },
    ]))
    Evaluation.insertMany.mockResolvedValue([{ _id: EVAL_ID }])
    User.find.mockReturnValue(makeLeanChain([]))
  })

  it('admin receives 201 with created count', async () => {
    const res = await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ evaluations: [validEval()] })
    expect(res.status).toBe(201)
    expect(res.body.created).toBe(1)
  })

  it('hr receives 201 with created count', async () => {
    const res = await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ evaluations: [validEval()] })
    expect(res.status).toBe(201)
    expect(res.body.created).toBe(1)
  })

  it('reflects the count returned by insertMany', async () => {
    Evaluation.insertMany.mockResolvedValue([{ _id: EVAL_ID }, { _id: EVAL_ID_2 }])
    const res = await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ evaluations: [validEval(), validEval({ evaluateeId: HR_ID })] })
    expect(res.status).toBe(201)
    expect(res.body.created).toBe(2)
  })

  it('calls Form.updateMany with matching formIds and frozenAt: null filter', async () => {
    await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ evaluations: [validEval()] })
    expect(Form.updateMany).toHaveBeenCalledWith(
      { _id: { $in: [FORM_ID] }, frozenAt: null },
      { $set: { frozenAt: expect.any(Date) } }
    )
  })

  it('calls Evaluation.insertMany with { ordered: false }', async () => {
    await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ evaluations: [validEval()] })
    expect(Evaluation.insertMany).toHaveBeenCalledWith(
      expect.any(Array),
      { ordered: false }
    )
  })

  it('sanitizes each evaluation to include status: assigned', async () => {
    await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ evaluations: [validEval()] })
    const [sanitized] = Evaluation.insertMany.mock.calls[0]
    expect(sanitized[0].status).toBe('assigned')
  })

  it('computes expiresAt 30 days after campaign endDate', async () => {
    const endDate = new Date('2025-12-31')
    Campaign.find.mockReturnValue(makeLeanChain([
      { _id: { toString: () => CAMPAIGN_ID }, endDate },
    ]))
    await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ evaluations: [validEval()] })
    const [sanitized] = Evaluation.insertMany.mock.calls[0]
    const expected = new Date(endDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    expect(sanitized[0].expiresAt.getTime()).toBe(expected.getTime())
  })

  it('accepts exactly 500 evaluations (boundary)', async () => {
    const evaluations = Array.from({ length: 500 }, () => validEval())
    Evaluation.insertMany.mockResolvedValue(evaluations.map((_, i) => ({ _id: String(i) })))
    const res = await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ evaluations })
    expect(res.status).toBe(201)
    expect(res.body.created).toBe(500)
  })
})

// ─── POST /bulk — partial failure (writeErrors from insertMany) ───────────────

describe('POST /bulk — partial failure (writeErrors)', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
    Form.updateMany.mockResolvedValue({ modifiedCount: 0 })
    Campaign.find.mockReturnValue(makeLeanChain([]))
    User.find.mockReturnValue(makeLeanChain([]))
  })

  it('returns 207 when insertMany throws writeErrors (partial insert)', async () => {
    const err = Object.assign(new Error('bulk write error'), {
      writeErrors:  [{ errmsg: 'E11000 duplicate key' }],
      insertedDocs: [{ _id: EVAL_ID }],
    })
    Evaluation.insertMany.mockRejectedValueOnce(err)

    const res = await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ evaluations: [validEval(), validEval({ evaluateeId: HR_ID })] })

    expect(res.status).toBe(207)
    expect(res.body.created).toBe(1)
    expect(res.body.skipped).toBe(1)
    expect(res.body.message).toMatch(/ignor/i)
  })

  it('returns 207 with created=0 when all documents conflict', async () => {
    const err = Object.assign(new Error('bulk write error'), {
      writeErrors:  [{ errmsg: 'dup' }, { errmsg: 'dup' }],
      insertedDocs: [],
    })
    Evaluation.insertMany.mockRejectedValueOnce(err)

    const res = await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ evaluations: [validEval(), validEval({ evaluateeId: HR_ID })] })

    expect(res.status).toBe(207)
    expect(res.body.created).toBe(0)
    expect(res.body.skipped).toBe(2)
  })

  it('handles writeErrors when insertedDocs is undefined (created defaults to 0)', async () => {
    const err = Object.assign(new Error('bulk write error'), {
      writeErrors: [{ errmsg: 'dup' }],
    })
    Evaluation.insertMany.mockRejectedValueOnce(err)

    const res = await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ evaluations: [validEval()] })

    expect(res.status).toBe(207)
    expect(res.body.created).toBe(0)
  })

  it('forwards non-writeError exceptions to the error handler (500)', async () => {
    Evaluation.insertMany.mockRejectedValueOnce(new Error('DB connection lost'))

    const res = await request(app)
      .post('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ evaluations: [validEval()] })

    expect(res.status).toBe(500)
  })
})

// ─── PATCH /bulk — authentication & authorization ─────────────────────────────

describe('PATCH /bulk — authentication & authorization', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .patch('/bulk')
      .send({ ids: [EVAL_ID], action: 'archive' })
    expect(res.status).toBe(401)
  })

  it('returns 401 for a malformed token', async () => {
    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', 'accessToken=bad.token.here')
      .send({ ids: [EVAL_ID], action: 'archive' })
    expect(res.status).toBe(401)
  })

  it('returns 403 for manager role', async () => {
    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
      .send({ ids: [EVAL_ID], action: 'archive' })
    expect(res.status).toBe(403)
  })

  it('returns 403 for employee role', async () => {
    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ ids: [EVAL_ID], action: 'archive' })
    expect(res.status).toBe(403)
  })

  it('returns 403 for director role', async () => {
    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: DIRECTOR_ID, role: 'director' })}`)
      .send({ ids: [EVAL_ID], action: 'archive' })
    expect(res.status).toBe(403)
  })
})

// ─── PATCH /bulk — input validation ──────────────────────────────────────────

describe('PATCH /bulk — input validation', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('returns 400 when ids is absent', async () => {
    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ action: 'archive' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/ids/i)
  })

  it('returns 400 when ids is an empty array', async () => {
    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ ids: [], action: 'archive' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/ids/i)
  })

  it('returns 400 when ids length exceeds 200', async () => {
    const ids = Array.from({ length: 201 }, () => EVAL_ID)
    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ ids, action: 'archive' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/200/i)
  })

  it('returns 400 for an unrecognised action value', async () => {
    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ ids: [EVAL_ID], action: 'delete_everything' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/action/i)
  })

  it('returns 400 when an id in the array is not a valid ObjectId', async () => {
    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ ids: ['not-a-valid-object-id'], action: 'archive' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('returns 400 when assign_reviewer is used without reviewerId', async () => {
    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ ids: [EVAL_ID], action: 'assign_reviewer' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/reviewerId/i)
  })

  it('returns 400 when assign_reviewer has an invalid reviewerId', async () => {
    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ ids: [EVAL_ID], action: 'assign_reviewer', reviewerId: 'bad-id' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/reviewerId/i)
  })

  it('accepts exactly 200 ids (boundary — returns 200 OK)', async () => {
    const ids = Array.from({ length: 200 }, () => EVAL_ID)
    mockEvalFind([])
    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ ids, action: 'sign_hr' })
    expect(res.status).toBe(200)
  })
})

// ─── PATCH /bulk — action: sign_hr ───────────────────────────────────────────

describe('PATCH /bulk — action: sign_hr', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
    Evaluation.bulkWrite.mockResolvedValue({ modifiedCount: 1 })
  })

  it('signs an evaluation in "reviewed" status → success=1', async () => {
    const ev = mockEvalDoc({ status: 'reviewed' })
    mockEvalFind([ev])

    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ ids: [EVAL_ID], action: 'sign_hr' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(1)
    expect(res.body.skipped).toBe(0)
    expect(Evaluation.bulkWrite).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          updateOne: {
            filter: { _id: EVAL_ID },
            update: { $set: expect.objectContaining({ status: 'signed_hr', signedByHrAt: expect.any(Date) }) },
          },
        }),
      ]),
      { ordered: false }
    )
  })

  it('signs an evaluation in "signed_evaluatee" status → success=1', async () => {
    const ev = mockEvalDoc({ status: 'signed_evaluatee' })
    mockEvalFind([ev])

    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ ids: [EVAL_ID], action: 'sign_hr' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(1)
  })

  it('signs an evaluation in "signed_manager" status → success=1', async () => {
    const ev = mockEvalDoc({ status: 'signed_manager' })
    mockEvalFind([ev])

    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ ids: [EVAL_ID], action: 'sign_hr' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(1)
  })

  it('skips evaluations in "assigned" status (not in HR_CAN_SIGN)', async () => {
    const ev = mockEvalDoc({ status: 'assigned' })
    mockEvalFind([ev])

    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ ids: [EVAL_ID], action: 'sign_hr' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(0)
    expect(res.body.skipped).toBe(1)
    expect(Evaluation.bulkWrite).not.toHaveBeenCalled()
  })

  it('skips evaluations in "in_progress" status', async () => {
    const ev = mockEvalDoc({ status: 'in_progress' })
    mockEvalFind([ev])

    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ ids: [EVAL_ID], action: 'sign_hr' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(0)
    expect(res.body.skipped).toBe(1)
  })

  it('skips evaluations in "submitted" status', async () => {
    const ev = mockEvalDoc({ status: 'submitted' })
    mockEvalFind([ev])

    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ ids: [EVAL_ID], action: 'sign_hr' })

    expect(res.status).toBe(200)
    expect(res.body.skipped).toBe(1)
  })

  it('counts IDs not found in DB as skipped', async () => {
    mockEvalFind([]) // DB returns nothing

    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ ids: [EVAL_ID], action: 'sign_hr' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(0)
    expect(res.body.skipped).toBe(1)
  })

  it('mixes success and skipped correctly with multiple evaluations', async () => {
    const ev1 = mockEvalDoc({ _id: EVAL_ID,   status: 'reviewed' })
    const ev2 = mockEvalDoc({ _id: EVAL_ID_2, status: 'assigned' })
    mockEvalFind([ev1, ev2])

    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ ids: [EVAL_ID, EVAL_ID_2], action: 'sign_hr' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(1)
    expect(res.body.skipped).toBe(1)
  })
})

// ─── PATCH /bulk — action: archive ───────────────────────────────────────────

describe('PATCH /bulk — action: archive', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
    Evaluation.bulkWrite.mockResolvedValue({ modifiedCount: 1 })
  })

  it('archives evaluation and sets reviewerComment (admin uses VALID_TRANSITIONS)', async () => {
    const ev = mockEvalDoc({ status: 'assigned' }) // assigned → in_progress per VALID_TRANSITIONS
    mockEvalFind([ev])

    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ ids: [EVAL_ID], action: 'archive' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(1)
    expect(Evaluation.bulkWrite).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          updateOne: {
            filter: { _id: EVAL_ID },
            update: { $set: expect.objectContaining({ reviewerComment: 'Archivé en masse par RH' }) },
          },
        }),
      ]),
      { ordered: false }
    )
  })

  it('still saves when no valid transition exists (terminal status)', async () => {
    const ev = mockEvalDoc({ status: 'archived' }) // archived → [] in VALID_TRANSITIONS
    mockEvalFind([ev])

    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ ids: [EVAL_ID], action: 'archive' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(1)
    expect(Evaluation.bulkWrite).toHaveBeenCalled()
  })

  it('hr uses ROLE_TRANSITIONS — reviewed → signed_hr sets signedByHrAt', async () => {
    const ev = mockEvalDoc({ status: 'reviewed' })
    mockEvalFind([ev])

    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ ids: [EVAL_ID], action: 'archive' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(1)
    expect(Evaluation.bulkWrite).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          updateOne: {
            filter: { _id: EVAL_ID },
            update: { $set: expect.objectContaining({ status: 'signed_hr', signedByHrAt: expect.any(Date) }) },
          },
        }),
      ]),
      { ordered: false }
    )
  })

  it('adds to errors array when bulkWrite fails', async () => {
    const ev = mockEvalDoc({ status: 'assigned' })
    mockEvalFind([ev])
    Evaluation.bulkWrite.mockRejectedValueOnce(
      Object.assign(new Error('write failed'), {
        writeErrors: [{ index: 0, errmsg: 'disk full' }],
      })
    )

    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ ids: [EVAL_ID], action: 'archive' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(0)
    expect(res.body.errors).toHaveLength(1)
    expect(res.body.errors[0].reason).toBe('disk full')
  })
})

// ─── PATCH /bulk — action: assign_reviewer ───────────────────────────────────

describe('PATCH /bulk — action: assign_reviewer', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
    Evaluation.bulkWrite.mockResolvedValue({ modifiedCount: 1 })
  })

  it('assigns reviewer to evaluation in "assigned" status → success=1', async () => {
    const ev = mockEvalDoc({ status: 'assigned' })
    mockEvalFind([ev])

    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ ids: [EVAL_ID], action: 'assign_reviewer', reviewerId: REVIEWER_ID })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(1)
    expect(Evaluation.bulkWrite).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          updateOne: {
            filter: { _id: EVAL_ID },
            update: { $set: { evaluatorId: REVIEWER_ID } },
          },
        }),
      ]),
      { ordered: false }
    )
  })

  it('assigns reviewer to evaluation in "in_progress" status → success=1', async () => {
    const ev = mockEvalDoc({ status: 'in_progress' })
    mockEvalFind([ev])

    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ ids: [EVAL_ID], action: 'assign_reviewer', reviewerId: REVIEWER_ID })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(1)
  })

  it('skips evaluations in "submitted" status (not in ASSIGNABLE)', async () => {
    const ev = mockEvalDoc({ status: 'submitted' })
    mockEvalFind([ev])

    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ ids: [EVAL_ID], action: 'assign_reviewer', reviewerId: REVIEWER_ID })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(0)
    expect(res.body.skipped).toBe(1)
    expect(Evaluation.bulkWrite).not.toHaveBeenCalled()
  })

  it('skips evaluations in "reviewed" status', async () => {
    const ev = mockEvalDoc({ status: 'reviewed' })
    mockEvalFind([ev])

    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ ids: [EVAL_ID], action: 'assign_reviewer', reviewerId: REVIEWER_ID })

    expect(res.status).toBe(200)
    expect(res.body.skipped).toBe(1)
  })

  it('records bulkWrite errors in the errors array without crashing', async () => {
    const ev = mockEvalDoc({ status: 'assigned' })
    mockEvalFind([ev])
    Evaluation.bulkWrite.mockRejectedValueOnce(
      Object.assign(new Error('write failed'), {
        writeErrors: [{ index: 0, errmsg: 'save failed' }],
      })
    )

    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ ids: [EVAL_ID], action: 'assign_reviewer', reviewerId: REVIEWER_ID })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(0)
    expect(res.body.errors).toHaveLength(1)
    expect(res.body.errors[0].reason).toBe('save failed')
  })

  it('creates an AuditLog entry when at least one operation succeeds', async () => {
    const ev = mockEvalDoc({ status: 'assigned' })
    mockEvalFind([ev])

    await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ ids: [EVAL_ID], action: 'assign_reviewer', reviewerId: REVIEWER_ID })

    // Fire-and-forget audit log runs after response
    await new Promise(r => setTimeout(r, 20))
    expect(AuditLog.create).toHaveBeenCalled()
  })

  it('does NOT create an AuditLog when success=0 (all skipped)', async () => {
    const ev = mockEvalDoc({ status: 'submitted' }) // ineligible
    mockEvalFind([ev])

    await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ ids: [EVAL_ID], action: 'assign_reviewer', reviewerId: REVIEWER_ID })

    await new Promise(r => setTimeout(r, 20))
    expect(AuditLog.create).not.toHaveBeenCalled()
  })

  it('response always contains success, skipped, and errors fields', async () => {
    mockEvalFind([])

    const res = await request(app)
      .patch('/bulk')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ ids: [EVAL_ID], action: 'assign_reviewer', reviewerId: REVIEWER_ID })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('success')
    expect(res.body).toHaveProperty('skipped')
    expect(res.body).toHaveProperty('errors')
    expect(Array.isArray(res.body.errors)).toBe(true)
  })
})
