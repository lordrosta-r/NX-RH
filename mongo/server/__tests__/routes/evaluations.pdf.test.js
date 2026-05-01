'use strict'

// evaluations.pdf.test.js — Unit tests for routes/evaluations/pdf.js
// Covers GET /:id/pdf (handlePdf): auth, role-based access, headers, error cases.
// PDFKit is mocked as a PassThrough stream with chainable rendering methods.

const jwt = require('jsonwebtoken')

// ─── Mock: pdfkit ─────────────────────────────────────────────────────────────
// PassThrough provides real pipe/end behaviour (stream ends properly so supertest
// can resolve). Rendering methods are stubs that return `this` for chaining.
jest.mock('pdfkit', () => {
  const { PassThrough } = require('stream')

  function MockPDF() {
    const stream = new PassThrough()

    const renderMethods = [
      'fillColor', 'fontSize', 'font', 'text',
      'moveDown', 'moveTo', 'lineTo', 'strokeColor', 'stroke',
    ]
    renderMethods.forEach(m => {
      stream[m] = jest.fn().mockReturnValue(stream)
    })

    // doc.y is read during header separator drawing
    stream.y = 100

    return stream
  }

  return MockPDF
})

// ─── Mock: ../../models ───────────────────────────────────────────────────────
jest.mock('../../models', () => {
  const Evaluation = {
    find:     jest.fn(),
    findById: jest.fn(),
  }
  return { Evaluation }
})

// ─── Mock: ../../middleware/authGuard ─────────────────────────────────────────
jest.mock('../../middleware/authGuard', () => ({
  authGuard: (roles = []) => (req, res, next) => {
    const _jwt   = require('jsonwebtoken')
    const secret = process.env.JWT_SECRET
    const token  = req.cookies?.token
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
const { Evaluation }  = require('../../models')
const request         = require('supertest')
const express         = require('express')
const cookieParser    = require('cookie-parser')
const { authGuard }   = require('../../middleware/authGuard')
const { handlePdf }   = require('../../routes/evaluations/pdf')

const SECRET = 'test-secret-long-enough-for-hs256-algorithm'
process.env.JWT_SECRET = SECRET
process.env.NODE_ENV   = 'test'

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const ADMIN_ID    = '507f1f77bcf86cd799439001'
const HR_ID       = '507f1f77bcf86cd799439002'
const MANAGER_ID  = '507f1f77bcf86cd799439003'
const EMPLOYEE_ID = '507f1f77bcf86cd799439004'
const OTHER_ID    = '507f1f77bcf86cd799439005'
const EVAL_ID     = '507f1f77bcf86cd799439011'

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
  app.get('/:id/pdf', authGuard(ALL_ROLES), handlePdf)
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.status || 500
    res.status(status).json({ error: err.message || 'Internal server error' })
  })
  return app
}

/**
 * Chainable stub for Evaluation.findById().populate()...lean().
 * Supports any number of .populate() calls before a final .lean().
 */
function makePopulateChain(result) {
  const chain = {
    populate: jest.fn(() => chain),
    lean:     jest.fn(() => Promise.resolve(result)),
  }
  return chain
}

/** Minimal populated evaluation document returned by the DB. */
function mockEval(overrides = {}) {
  return {
    _id:    EVAL_ID,
    status: 'reviewed',
    evaluatorId: { _id: MANAGER_ID,  firstName: 'Jean',  lastName: 'Dupont'  },
    evaluateeId: { _id: EMPLOYEE_ID, firstName: 'Marie', lastName: 'Martin', department: 'Engineering' },
    campaignId:  { name: 'Q4 2024', endDate: new Date('2024-12-31') },
    formId: {
      title:      'Évaluation annuelle',
      questions:  [],
      isAnonymous: false,
    },
    answers:             [],
    reviewerComment:     null,
    evaluateeComment:    null,
    signedByEvaluateeAt: null,
    signedByManagerAt:   null,
    signedByHrAt:        null,
    ...overrides,
  }
}

// ─── GET /:id/pdf — authentication ───────────────────────────────────────────

describe('GET /:id/pdf — authentication', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no token cookie is provided', async () => {
    const res = await request(app).get(`/${EVAL_ID}/pdf`)
    expect(res.status).toBe(401)
  })

  it('returns 401 for a malformed / invalid JWT', async () => {
    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', 'token=this.is.not.a.valid.jwt')
    expect(res.status).toBe(401)
  })

  it('returns 401 for a token signed with the wrong secret', async () => {
    const badToken = jwt.sign({ id: ADMIN_ID, role: 'admin' }, 'wrong-secret', { algorithm: 'HS256' })
    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${badToken}`)
    expect(res.status).toBe(401)
  })
})

// ─── GET /:id/pdf — ID validation ────────────────────────────────────────────

describe('GET /:id/pdf — ID validation', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('returns 400 for a plain string that is not an ObjectId', async () => {
    const res = await request(app)
      .get('/not-a-valid-id/pdf')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('returns 400 for a hex string that is too short', async () => {
    const res = await request(app)
      .get('/507f1f77bcf86cd/pdf')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('returns 400 for a numeric id', async () => {
    const res = await request(app)
      .get('/12345/pdf')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(400)
  })
})

// ─── GET /:id/pdf — 404 not found ────────────────────────────────────────────

describe('GET /:id/pdf — evaluation not found', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('returns 404 when the evaluation does not exist in the DB', async () => {
    Evaluation.findById = jest.fn(() => makePopulateChain(null))

    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/introuvable/i)
  })
})

// ─── GET /:id/pdf — access control: admin & hr ───────────────────────────────

describe('GET /:id/pdf — admin and hr bypass ownership checks', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('admin can download an evaluation they are not part of', async () => {
    Evaluation.findById = jest.fn(() =>
      makePopulateChain(mockEval({
        evaluatorId: { _id: OTHER_ID,    firstName: 'X', lastName: 'Y' },
        evaluateeId: { _id: EMPLOYEE_ID, firstName: 'Z', lastName: 'W' },
      }))
    )

    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
  })

  it('hr can download any evaluation regardless of their role in it', async () => {
    Evaluation.findById = jest.fn(() =>
      makePopulateChain(mockEval({
        evaluatorId: { _id: MANAGER_ID,  firstName: 'Jean',  lastName: 'Dupont' },
        evaluateeId: { _id: EMPLOYEE_ID, firstName: 'Marie', lastName: 'Martin' },
      }))
    )

    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
    expect(res.status).toBe(200)
  })
})

// ─── GET /:id/pdf — access control: evaluator ────────────────────────────────

describe('GET /:id/pdf — evaluator can download their own evaluation', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('manager as evaluator receives 200', async () => {
    Evaluation.findById = jest.fn(() =>
      makePopulateChain(mockEval({
        evaluatorId: { _id: MANAGER_ID,  firstName: 'Jean',  lastName: 'Dupont' },
        evaluateeId: { _id: EMPLOYEE_ID, firstName: 'Marie', lastName: 'Martin' },
      }))
    )

    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
    expect(res.status).toBe(200)
  })

  it('employee as evaluator (self-evaluation) receives 200', async () => {
    Evaluation.findById = jest.fn(() =>
      makePopulateChain(mockEval({
        evaluatorId: { _id: EMPLOYEE_ID, firstName: 'Marie', lastName: 'Martin' },
        evaluateeId: { _id: EMPLOYEE_ID, firstName: 'Marie', lastName: 'Martin' },
      }))
    )

    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(200)
  })
})

// ─── GET /:id/pdf — access control: evaluatee ────────────────────────────────

describe('GET /:id/pdf — evaluatee can download their own evaluation', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('employee as evaluatee receives 200', async () => {
    Evaluation.findById = jest.fn(() =>
      makePopulateChain(mockEval({
        evaluatorId: { _id: MANAGER_ID,  firstName: 'Jean',  lastName: 'Dupont' },
        evaluateeId: { _id: EMPLOYEE_ID, firstName: 'Marie', lastName: 'Martin' },
      }))
    )

    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(200)
  })

  it('employee who is neither evaluator nor evaluatee gets 403', async () => {
    Evaluation.findById = jest.fn(() =>
      makePopulateChain(mockEval({
        evaluatorId: { _id: MANAGER_ID, firstName: 'Jean', lastName: 'Dupont' },
        evaluateeId: { _id: OTHER_ID,   firstName: 'Other', lastName: 'Person' },
      }))
    )

    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/interdit/i)
  })

  it('manager who is NOT the assigned evaluator gets 403', async () => {
    Evaluation.findById = jest.fn(() =>
      makePopulateChain(mockEval({
        evaluatorId: { _id: OTHER_ID,    firstName: 'Other', lastName: 'Manager' },
        evaluateeId: { _id: EMPLOYEE_ID, firstName: 'Marie', lastName: 'Martin' },
      }))
    )

    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/interdit/i)
  })

  it('employee is recognised as evaluatee even when evaluatorId is a plain string ID', async () => {
    // When evaluatorId was not populated (plain ObjectId string)
    Evaluation.findById = jest.fn(() =>
      makePopulateChain(mockEval({
        evaluatorId: MANAGER_ID,                                              // plain string
        evaluateeId: { _id: EMPLOYEE_ID, firstName: 'Marie', lastName: 'Martin' },
      }))
    )

    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(200)
  })

  it('user is recognised as evaluator even when evaluatorId is a plain string ID', async () => {
    Evaluation.findById = jest.fn(() =>
      makePopulateChain(mockEval({
        evaluatorId: MANAGER_ID,                                              // plain string
        evaluateeId: { _id: OTHER_ID, firstName: 'X', lastName: 'Y' },
      }))
    )

    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
    expect(res.status).toBe(200)
  })
})

// ─── GET /:id/pdf — HTTP response headers ────────────────────────────────────

describe('GET /:id/pdf — HTTP response headers', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('sets Content-Type to application/pdf', async () => {
    Evaluation.findById = jest.fn(() => makePopulateChain(mockEval()))

    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.headers['content-type']).toMatch(/application\/pdf/)
  })

  it('sets Content-Disposition containing the evaluation ID', async () => {
    Evaluation.findById = jest.fn(() => makePopulateChain(mockEval()))

    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.headers['content-disposition']).toContain(EVAL_ID)
  })

  it('sets Content-Disposition as attachment (triggers browser download)', async () => {
    Evaluation.findById = jest.fn(() => makePopulateChain(mockEval()))

    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.headers['content-disposition']).toMatch(/^attachment;/)
  })

  it('filename in Content-Disposition matches pattern evaluation-{id}.pdf', async () => {
    Evaluation.findById = jest.fn(() => makePopulateChain(mockEval()))

    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.headers['content-disposition'])
      .toMatch(new RegExp(`filename="evaluation-${EVAL_ID}\\.pdf"`))
  })
})

// ─── GET /:id/pdf — DB query behaviour ───────────────────────────────────────

describe('GET /:id/pdf — Evaluation.findById query', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('calls Evaluation.findById with exactly the ID from the URL', async () => {
    Evaluation.findById = jest.fn(() => makePopulateChain(mockEval()))

    await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(Evaluation.findById).toHaveBeenCalledWith(EVAL_ID)
  })

  it('chains .populate() exactly 4 times (formId, evaluatorId, evaluateeId, campaignId)', async () => {
    const chain = makePopulateChain(mockEval())
    Evaluation.findById = jest.fn(() => chain)

    await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(chain.populate).toHaveBeenCalledTimes(4)
  })

  it('calls .lean() at the end of the chain', async () => {
    const chain = makePopulateChain(mockEval())
    Evaluation.findById = jest.fn(() => chain)

    await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(chain.lean).toHaveBeenCalled()
  })

  it('forwards DB errors to the error handler — returns 500', async () => {
    Evaluation.findById = jest.fn(() => ({
      populate: jest.fn().mockReturnThis(),
      lean:     jest.fn().mockRejectedValue(new Error('DB timeout')),
    }))

    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(500)
  })
})

// ─── GET /:id/pdf — PDF renders for all evaluation statuses ──────────────────

describe('GET /:id/pdf — renders for every evaluation status', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  const STATUSES = [
    'assigned', 'in_progress', 'submitted', 'reviewed',
    'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated', 'expired', 'archived',
  ]

  for (const status of STATUSES) {
    it(`returns 200 for status: ${status}`, async () => {
      Evaluation.findById = jest.fn(() => makePopulateChain(mockEval({ status })))

      const res = await request(app)
        .get(`/${EVAL_ID}/pdf`)
        .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      expect(res.status).toBe(200)
    })
  }
})

// ─── GET /:id/pdf — PDF renders with various data shapes ─────────────────────

describe('GET /:id/pdf — renders with various data shapes', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('renders when formId is null (form was deleted)', async () => {
    Evaluation.findById = jest.fn(() => makePopulateChain(mockEval({ formId: null })))

    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
  })

  it('renders when campaignId is null', async () => {
    Evaluation.findById = jest.fn(() => makePopulateChain(mockEval({ campaignId: null })))

    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
  })

  it('renders when evaluateeId has no firstName (sparse populate)', async () => {
    Evaluation.findById = jest.fn(() =>
      makePopulateChain(mockEval({ evaluateeId: { _id: EMPLOYEE_ID } }))
    )

    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
  })

  it('renders when evaluatorId has no firstName (sparse populate)', async () => {
    Evaluation.findById = jest.fn(() =>
      makePopulateChain(mockEval({ evaluatorId: { _id: MANAGER_ID } }))
    )

    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
  })

  it('renders with reviewer and evaluatee comments', async () => {
    Evaluation.findById = jest.fn(() =>
      makePopulateChain(mockEval({
        reviewerComment:  'Excellent travail cette année.',
        evaluateeComment: "Je suis d'accord avec cette évaluation.",
      }))
    )

    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
  })

  it('renders with all three signatures set', async () => {
    const now = new Date()
    Evaluation.findById = jest.fn(() =>
      makePopulateChain(mockEval({
        signedByEvaluateeAt: now,
        signedByManagerAt:   now,
        signedByHrAt:        now,
      }))
    )

    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
  })

  it('renders when formId has questions with answers', async () => {
    Evaluation.findById = jest.fn(() =>
      makePopulateChain(mockEval({
        formId: {
          title:      'Annual Review',
          isAnonymous: false,
          questions: [
            { id: 'q1', label: 'Describe your year',        type: 'text',   phase: 'all'  },
            { id: 'q2', label: 'Rate your performance',     type: 'rating', scale: 5, phase: 'self' },
            { id: 'q3', label: 'Did you meet objectives?',  type: 'yes_no', phase: 'objectives' },
          ],
        },
        answers: [
          { questionId: 'q1', value: 'A productive year.' },
          { questionId: 'q2', value: 4 },
          { questionId: 'q3', value: true },
        ],
      }))
    )

    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
  })

  it('renders when evaluateeId has a department field', async () => {
    Evaluation.findById = jest.fn(() =>
      makePopulateChain(mockEval({
        evaluateeId: { _id: EMPLOYEE_ID, firstName: 'Marie', lastName: 'Martin', department: 'Engineering' },
      }))
    )

    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
  })

  it('renders when answers array is empty', async () => {
    Evaluation.findById = jest.fn(() =>
      makePopulateChain(mockEval({
        formId: {
          title:      'Empty Form',
          isAnonymous: false,
          questions: [{ id: 'q1', label: 'Rate yourself', type: 'rating', scale: 5, phase: 'self' }],
        },
        answers: [],
      }))
    )

    const res = await request(app)
      .get(`/${EVAL_ID}/pdf`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
  })
})
