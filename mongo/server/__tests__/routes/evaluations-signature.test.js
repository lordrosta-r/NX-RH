'use strict'

// evaluations-signature.test.js — Tests de la chaîne de signature
//
// Vérifie :
//   • signed_hr → validated est autorisé pour le rôle hr (fix-eval-machine)
//   • signedByEvaluateeAt est défini quand statut passe à signed_evaluatee
//   • signedByManagerAt   est défini quand statut passe à signed_manager
//   • signedByHrAt        est défini quand statut passe à signed_hr
//   • Transition invalide (draft → validated) retourne 400

const jwt = require('jsonwebtoken')

// ─── Mock: ../../models ───────────────────────────────────────────────────────
// Inclut signed_hr → validated pour le rôle hr (corrigé par fix-eval-machine)
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
      signed_hr:        ['validated'],   // fix-eval-machine
    },
    admin: {},
  }

  const LOCKED_STATUSES_MOCK = [
    'submitted', 'reviewed', 'signed_evaluatee',
    'signed_manager', 'signed_hr', 'validated', 'archived',
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
    VALID_TRANSITIONS:  VALID_TRANSITIONS_MOCK,
    ROLE_TRANSITIONS:   ROLE_TRANSITIONS_MOCK,
    LOCKED_STATUSES:    LOCKED_STATUSES_MOCK,
    ADMIN_ROLES:        ['admin', 'hr'],
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

jest.mock('../../services/notificationService', () => ({
  notify:     jest.fn().mockResolvedValue(undefined),
  notifyMany: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../services/notificationHelper', () => ({
  notify: jest.fn().mockResolvedValue(undefined),
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

const HR_ID       = '507f1f77bcf86cd799439010'
const MANAGER_ID  = '507f1f77bcf86cd799439002'
const EMPLOYEE_ID = '507f1f77bcf86cd799439003'
const EVAL_ID     = '507f1f77bcf86cd799439011'

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
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500
    res.status(status).json({ error: err.message || 'Internal server error' })
  })
  return app
}

// Dual-mode stub : awaitable directement ET chainable (.populate().lean())
function makeThenable(result) {
  return {
    populate: jest.fn().mockReturnThis(),
    lean:     jest.fn().mockImplementation(() => makeThenable(result)),
    then:     (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch:    (reject) => Promise.resolve(result).catch(reject),
  }
}

function mockEvalDoc(overrides = {}) {
  return {
    _id:                EVAL_ID,
    campaignId:         null,
    evaluatorId:        MANAGER_ID,
    evaluateeId:        EMPLOYEE_ID,
    status:             'assigned',
    answers:            [],
    isAnonymous:        false,
    formId:             { isAnonymous: false },
    lastSavedAt:        null,
    reviewerComment:    null,
    evaluateeComment:   null,
    signedByEvaluateeAt: undefined,
    signedByManagerAt:   undefined,
    signedByHrAt:        undefined,
    auditLog:            [],
    save:               jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

// ─── Tests : transition signed_hr → validated pour le rôle hr ─────────────────

describe('Chaîne de signature — signed_hr → validated (fix-eval-machine)', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('HR peut passer signed_hr → validated', async () => {
    Evaluation.findById = jest.fn().mockReturnValue(
      makeThenable(mockEvalDoc({ status: 'signed_hr' }))
    )

    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ status: 'validated' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('validated')
  })

  it('Employee ne peut PAS passer signed_hr → validated', async () => {
    Evaluation.findById = jest.fn().mockReturnValue(
      makeThenable(mockEvalDoc({ evaluateeId: EMPLOYEE_ID, status: 'signed_hr' }))
    )

    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ status: 'validated' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/transition/i)
  })

  it('Manager ne peut PAS passer signed_hr → validated', async () => {
    Evaluation.findById = jest.fn().mockReturnValue(
      makeThenable(mockEvalDoc({ evaluatorId: MANAGER_ID, status: 'signed_hr' }))
    )

    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
      .send({ status: 'validated' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/transition/i)
  })
})

// ─── Tests : timestamps de signature ──────────────────────────────────────────

describe('Chaîne de signature — timestamps automatiques', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('signedByEvaluateeAt est défini quand statut passe à signed_evaluatee', async () => {
    const evalDoc = mockEvalDoc({
      evaluateeId: EMPLOYEE_ID,
      evaluatorId: MANAGER_ID,
      status:      'reviewed',
    })
    expect(evalDoc.signedByEvaluateeAt).toBeUndefined()

    Evaluation.findById = jest.fn().mockReturnValue(makeThenable(evalDoc))

    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ status: 'signed_evaluatee' })

    expect(res.status).toBe(200)
    expect(evalDoc.signedByEvaluateeAt).toBeInstanceOf(Date)
  })

  it('signedByManagerAt est défini quand statut passe à signed_manager', async () => {
    const evalDoc = mockEvalDoc({
      evaluatorId: MANAGER_ID,
      evaluateeId: EMPLOYEE_ID,
      status:      'signed_evaluatee',
    })
    expect(evalDoc.signedByManagerAt).toBeUndefined()

    Evaluation.findById = jest.fn().mockReturnValue(makeThenable(evalDoc))

    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
      .send({ status: 'signed_manager' })

    expect(res.status).toBe(200)
    expect(evalDoc.signedByManagerAt).toBeInstanceOf(Date)
  })

  it('signedByHrAt est défini quand statut passe à signed_hr', async () => {
    const evalDoc = mockEvalDoc({
      status: 'signed_manager',
    })
    expect(evalDoc.signedByHrAt).toBeUndefined()

    Evaluation.findById = jest.fn().mockReturnValue(makeThenable(evalDoc))

    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ status: 'signed_hr' })

    expect(res.status).toBe(200)
    expect(evalDoc.signedByHrAt).toBeInstanceOf(Date)
  })

  it('aucun timestamp de signature n\'est modifié pour une transition non-signature', async () => {
    const evalDoc = mockEvalDoc({
      evaluatorId: EMPLOYEE_ID,
      evaluateeId: EMPLOYEE_ID,
      status:      'in_progress',
    })

    Evaluation.findById = jest.fn().mockReturnValue(makeThenable(evalDoc))

    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ status: 'submitted' })

    expect(res.status).toBe(200)
    expect(evalDoc.signedByEvaluateeAt).toBeUndefined()
    expect(evalDoc.signedByManagerAt).toBeUndefined()
    expect(evalDoc.signedByHrAt).toBeUndefined()
  })
})

// ─── Tests : transitions invalides ───────────────────────────────────────────

describe('Chaîne de signature — transitions invalides', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('retourne 400 pour une transition impossible (in_progress → validated) pour employee', async () => {
    Evaluation.findById = jest.fn().mockReturnValue(
      makeThenable(mockEvalDoc({
        evaluatorId: EMPLOYEE_ID,
        evaluateeId: EMPLOYEE_ID,
        status:      'in_progress',
      }))
    )

    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ status: 'validated' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/transition/i)
  })

  it('retourne 400 pour une transition impossible (assigned → validated) pour hr', async () => {
    Evaluation.findById = jest.fn().mockReturnValue(
      makeThenable(mockEvalDoc({ status: 'assigned' }))
    )

    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ status: 'validated' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/transition/i)
  })

  it('retourne 400 pour une transition impossible (submitted → signed_evaluatee) pour hr', async () => {
    Evaluation.findById = jest.fn().mockReturnValue(
      makeThenable(mockEvalDoc({ status: 'submitted' }))
    )

    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ status: 'signed_evaluatee' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/transition/i)
  })

  it('retourne 400 pour une transition inexistante vers un statut inconnu', async () => {
    Evaluation.findById = jest.fn().mockReturnValue(
      makeThenable(mockEvalDoc({ status: 'in_progress' }))
    )

    const res = await request(app)
      .patch(`/api/evaluations/${EVAL_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ status: 'not_a_real_status' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/transition/i)
  })
})
