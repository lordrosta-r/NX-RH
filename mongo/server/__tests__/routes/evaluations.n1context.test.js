'use strict'

// evaluations.n1context.test.js — Unit tests for GET /:id/n1-context
// Covers handleN1Context: RBAC, feature flags, lookup strategies, payload filtering.
// No real DB — all models and services are mocked.

const jwt = require('jsonwebtoken')

// ─── Mock: ../../models ───────────────────────────────────────────────────────
jest.mock('../../models', () => {
  const Evaluation = {
    findById: jest.fn(),
    findOne:  jest.fn(),
    find:     jest.fn(),
  }
  const Campaign = {
    find: jest.fn(),
  }
  return { Evaluation, Campaign }
})

// ─── Mock: ../../services/managerVisibility ───────────────────────────────────
jest.mock('../../services/managerVisibility', () => ({
  getVisibleUserIds: jest.fn().mockResolvedValue([]),
}))

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

// ─── Imports (after mocks) ────────────────────────────────────────────────────
const { Evaluation, Campaign } = require('../../models')
const { getVisibleUserIds }    = require('../../services/managerVisibility')
const request                  = require('supertest')
const express                  = require('express')
const cookieParser             = require('cookie-parser')
const { authGuard }            = require('../../middleware/authGuard')
const { handleN1Context }      = require('../../routes/evaluations/n1Context')

const SECRET = 'test-secret-long-enough-for-hs256-algorithm'
process.env.JWT_SECRET = SECRET
process.env.NODE_ENV   = 'test'

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const ADMIN_ID     = '507f1f77bcf86cd799439001'
const MANAGER_ID   = '507f1f77bcf86cd799439002'
const EMPLOYEE_ID  = '507f1f77bcf86cd799439003'
const OTHER_ID     = '507f1f77bcf86cd799439005'
const EVAL_ID      = '507f1f77bcf86cd799439011'
const CAMPAIGN_ID  = '507f1f77bcf86cd799439020'
const PREV_CAMP_ID = '507f1f77bcf86cd799439021'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tokenFor({ id, role }) {
  return jwt.sign({ id, email: `${role}@corp.com`, role }, SECRET, {
    algorithm: 'HS256', expiresIn: '1h',
  })
}

const ALL_ROLES = ['admin', 'hr', 'manager', 'employee']

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.get('/:id/n1-context', authGuard(ALL_ROLES), handleN1Context)
   
  app.use((err, _req, res, _next) => {
    const status = err.status || 500
    res.status(status).json({ error: err.message || 'Internal server error' })
  })
  return app
}

/**
 * Chainable stub for .populate().sort().lean() patterns.
 * lean() resolves to `result`.
 */
function makeChain(result) {
  const chain = {
    populate: jest.fn().mockReturnThis(),
    sort:     jest.fn().mockReturnThis(),
    lean:     jest.fn().mockResolvedValue(result),
  }
  return chain
}

/** Minimal populated current evaluation document. */
function mockCurrentEval(overrides = {}) {
  return {
    _id:         EVAL_ID,
    evaluatorId: MANAGER_ID,
    evaluateeId: EMPLOYEE_ID,
    status:      'in_progress',
    campaignId: {
      _id:                 CAMPAIGN_ID,
      name:                'Campagne 2024',
      startDate:           new Date('2024-01-01'),
      enableN1Context:     true,
      n1VisibleToEmployee: true,
      previousCampaignId:  PREV_CAMP_ID,
    },
    ...overrides,
  }
}

/** Minimal populated N-1 evaluation document. */
function mockN1Eval(overrides = {}) {
  return {
    _id:              '507f1f77bcf86cd799439030',
    evaluatorId:      MANAGER_ID,
    evaluateeId:      EMPLOYEE_ID,
    status:           'validated',
    reviewerScore:    4,
    reviewerComment:  'Excellent travail.',
    evaluateeComment: "Je suis d'accord.",
    disagreementFlag: false,
    nextObjectives:   'Développer le leadership.',
    objectiveRatings: { obj1: 5 },
    answers: [
      { questionId: 'q1', value: 'Atteint' },
    ],
    campaignId: {
      _id:       PREV_CAMP_ID,
      name:      'Campagne 2023',
      startDate: new Date('2023-01-01'),
      endDate:   new Date('2023-12-31'),
    },
    formId: {
      title:     'Formulaire annuel',
      formType:  'annual',
      questions: [
        { id: 'q1', label: 'Objectif 1', phase: 'objectives', type: 'rating' },
      ],
    },
    ...overrides,
  }
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('GET /:id/n1-context — N-1 context endpoint', () => {
  const app = buildApp()

  beforeEach(() => {
    Evaluation.findById.mockReturnValue(makeChain(mockCurrentEval()))
    Evaluation.find.mockReturnValue(makeChain([mockN1Eval()]))
    Campaign.find.mockReturnValue(makeChain([]))
    getVisibleUserIds.mockResolvedValue([])
  })

  // ── 1. Admin — full payload via previousCampaignId ──────────────────────────

  it('200 — admin sees full payload via previousCampaignId', async () => {
    const res = await request(app)
      .get(`/${EVAL_ID}/n1-context`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      status:           'validated',
      reviewerScore:     4,
      reviewerComment:  'Excellent travail.',
      evaluateeComment: "Je suis d'accord.",
      disagreementFlag: false,
      n1Campaign:       expect.objectContaining({ name: 'Campagne 2023' }),
    })
    expect(res.body.objectivesAnswers).toHaveLength(1)
    expect(res.body.objectivesAnswers[0]).toMatchObject({
      questionId: 'q1',
      value:      'Atteint',
    })
  })

  // ── 2. Manager — full payload for their own evaluation ──────────────────────

  it('200 — manager sees full payload including evaluateeComment and disagreementFlag', async () => {
    // MANAGER_ID is the evaluatorId → uid === evorId → access granted without visibleIds
    const res = await request(app)
      .get(`/${EVAL_ID}/n1-context`)
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      evaluateeComment: "Je suis d'accord.",
      disagreementFlag: false,
      reviewerScore:     4,
    })
  })

  // ── 3. Employee — filtered payload (no evaluateeComment / disagreementFlag) ─

  it('200 — employee sees filtered payload without evaluateeComment or disagreementFlag', async () => {
    // EMPLOYEE_ID is the evaluateeId → isOwn = true, n1VisibleToEmployee = true
    const res = await request(app)
      .get(`/${EVAL_ID}/n1-context`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)

    expect(res.status).toBe(200)
    expect(res.body).not.toHaveProperty('evaluateeComment')
    expect(res.body).not.toHaveProperty('disagreementFlag')
    expect(res.body).toMatchObject({
      status: 'validated',
      reviewerScore:   4,
      n1Campaign: expect.objectContaining({ name: 'Campagne 2023' }),
    })
  })

  // ── 4. Employee — 204 when n1VisibleToEmployee=false ────────────────────────

  it('204 — n1VisibleToEmployee=false hides N-1 data from employee', async () => {
    Evaluation.findById.mockReturnValue(makeChain(mockCurrentEval({
      campaignId: {
        _id:                 CAMPAIGN_ID,
        name:                'Campagne 2024',
        startDate:           new Date('2024-01-01'),
        enableN1Context:     true,
        n1VisibleToEmployee: false,
        previousCampaignId:  PREV_CAMP_ID,
      },
    })))

    const res = await request(app)
      .get(`/${EVAL_ID}/n1-context`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)

    expect(res.status).toBe(204)
  })

  // ── 5. Fallback auto — previous campaign found by date ──────────────────────

  it('200 — fallback auto: previous closed campaign found when no previousCampaignId', async () => {
    Evaluation.findById.mockReturnValue(makeChain(mockCurrentEval({
      campaignId: {
        _id:                 CAMPAIGN_ID,
        name:                'Campagne 2024',
        startDate:           new Date('2024-01-01'),
        enableN1Context:     true,
        n1VisibleToEmployee: true,
        previousCampaignId:  null, // no explicit link → triggers fallback
      },
    })))
    Campaign.find.mockReturnValue(makeChain([{ _id: PREV_CAMP_ID }]))
    // find est appelé pour le lookup de repli (agrégation multi-formulaires)
    Evaluation.find.mockReturnValue(makeChain([mockN1Eval()]))

    const res = await request(app)
      .get(`/${EVAL_ID}/n1-context`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      status: 'validated',
      reviewerScore:   4,
      n1Campaign: expect.objectContaining({ name: 'Campagne 2023' }),
    })
  })

  // ── 6. enableN1Context=false → 204 ──────────────────────────────────────────

  it('204 — enableN1Context=false disables the N-1 feature entirely', async () => {
    Evaluation.findById.mockReturnValue(makeChain(mockCurrentEval({
      campaignId: {
        _id:                 CAMPAIGN_ID,
        name:                'Campagne 2024',
        startDate:           new Date('2024-01-01'),
        enableN1Context:     false,
        n1VisibleToEmployee: true,
        previousCampaignId:  PREV_CAMP_ID,
      },
    })))

    const res = await request(app)
      .get(`/${EVAL_ID}/n1-context`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    expect(res.status).toBe(204)
  })

  // ── 7. No N-1 eval found → 204 ──────────────────────────────────────────────

  it('204 — no N-1 evaluation found (no previous campaign match, no fallback)', async () => {
    // find renvoie [] (lookup direct vide), Campaign.find renvoie [] (pas de repli)
    Evaluation.find.mockReturnValue(makeChain([]))
    Campaign.find.mockReturnValue(makeChain([]))

    const res = await request(app)
      .get(`/${EVAL_ID}/n1-context`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    expect(res.status).toBe(204)
  })

  // ── 8. Current evaluation not found → 404 ───────────────────────────────────

  it('404 — current evaluation not found', async () => {
    Evaluation.findById.mockReturnValue(makeChain(null))

    const res = await request(app)
      .get(`/${EVAL_ID}/n1-context`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/introuvable/i)
  })

  // ── 9. Employee tries to access another employee's evaluation → 403 ──────────

  it("403 — employee cannot access another employee's evaluation", async () => {
    Evaluation.findById.mockReturnValue(makeChain(mockCurrentEval({
      evaluatorId: MANAGER_ID,
      evaluateeId: OTHER_ID, // not EMPLOYEE_ID
    })))

    const res = await request(app)
      .get(`/${EVAL_ID}/n1-context`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/refusé/i)
  })

  // ── 10. No token → 401 ──────────────────────────────────────────────────────

  it('401 — no authentication token', async () => {
    const res = await request(app)
      .get(`/${EVAL_ID}/n1-context`)

    expect(res.status).toBe(401)
  })
})
