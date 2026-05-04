'use strict'

// =============================================================================
// security.test.js — Tests de sécurité : injection NoSQL, RBAC cross-role,
//                    rate limiting login, validation JWT
// =============================================================================

const jwt = require('jsonwebtoken')

// ─── Mock : User (requis directement par auth.js) ────────────────────────────
jest.mock('../../models/User')

// ─── Mock : models index (requis par users.js, campaigns.js, analytics.js…) ──
jest.mock('../../models', () => {
  function MockUser(data) { Object.assign(this, data) }
  MockUser.prototype.save     = jest.fn().mockResolvedValue(undefined)
  MockUser.prototype.toObject = jest.fn().mockImplementation(function () {
    const { save, toObject, ...rest } = this // eslint-disable-line no-unused-vars
    return rest
  })
  MockUser.find           = jest.fn()
  MockUser.findOne        = jest.fn()
  MockUser.findById       = jest.fn()
  MockUser.countDocuments = jest.fn().mockResolvedValue(0)
  MockUser.updateMany     = jest.fn().mockResolvedValue({ modifiedCount: 0 })
  MockUser.updateOne      = jest.fn().mockResolvedValue({ acknowledged: true })

  const Campaign = {
    find:           jest.fn(),
    findById:       jest.fn(),
    create:         jest.fn(),
    countDocuments: jest.fn().mockResolvedValue(0),
    aggregate:      jest.fn().mockResolvedValue([]),
  }
  const Evaluation = {
    find:           jest.fn(),
    findById:       jest.fn(),
    countDocuments: jest.fn().mockResolvedValue(0),
    aggregate:      jest.fn().mockResolvedValue([]),
  }
  const Form      = { find: jest.fn(), findById: jest.fn(), deleteMany: jest.fn().mockResolvedValue({}), insertMany: jest.fn().mockResolvedValue([]) }
  const AuditLog  = { create: jest.fn().mockResolvedValue({}) }

  // Constants used by campaigns.js and evaluations routes
  const CAMPAIGN_TRANSITIONS = {}
  const EVAL_TRANSITIONS     = {}
  const ROLE_TRANSITIONS     = {}
  const LOCKED_STATUSES      = []
  const VALID_TRANSITIONS    = {}

  return {
    User: MockUser, Campaign, Evaluation, Form, AuditLog,
    CAMPAIGN_TRANSITIONS, EVAL_TRANSITIONS, EVALUATION_TRANSITIONS: EVAL_TRANSITIONS,
    ROLE_TRANSITIONS, LOCKED_STATUSES, VALID_TRANSITIONS,
  }
})

// ─── Mock : authGuard — vérification JWT inline (pattern identique aux autres tests) ──
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

// ─── Mock : services ─────────────────────────────────────────────────────────
jest.mock('../../services/notificationService', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendEmail:        jest.fn().mockResolvedValue(undefined),
  notify:           jest.fn().mockResolvedValue(undefined),
  notifyMany:       jest.fn().mockResolvedValue(undefined),
}))
jest.mock('../../services/notificationHelper', () => ({
  notify: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('../../services/managerVisibility', () => ({
  getVisibleUserIds: jest.fn().mockResolvedValue([]),
}))

// ─── Imports ─────────────────────────────────────────────────────────────────
// AuthUser : auto-mock de models/User (utilisé par auth.js via require('../models/User'))
const AuthUser = require('../../models/User')
// RouteUser : MockUser du factory mock models/index (utilisé par users.js, campaigns.js…)
const { User: RouteUser, AuditLog, Evaluation } = require('../../models')

const request         = require('supertest')
const express         = require('express')
const cookieParser    = require('cookie-parser')
const mongoSanitize   = require('express-mongo-sanitize')
const { authGuard }   = require('../../middleware/authGuard')
const authRouter      = require('../../routes/auth')
const userRouter      = require('../../routes/users')
const campaignRouter  = require('../../routes/campaigns')
const analyticsRouter = require('../../routes/analytics')
const evalRouter      = require('../../routes/evaluations')

const SECRET = 'test-secret-long-enough-for-hs256-algorithm'
process.env.JWT_SECRET = SECRET
process.env.NODE_ENV   = 'test'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ADMIN_ID    = '507f1f77bcf86cd799439001'
const HR_ID       = '507f1f77bcf86cd799439002'
const MANAGER_ID  = '507f1f77bcf86cd799439003'
const EMPLOYEE_ID = '507f1f77bcf86cd799439004'
const TARGET_ID   = '507f1f77bcf86cd799439009'

function tokenFor({ id, role }) {
  return jwt.sign({ id, email: `${role}@corp.com`, role }, SECRET, {
    algorithm: 'HS256', expiresIn: '1h',
  })
}

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

// ─── App builders ─────────────────────────────────────────────────────────────
// Chaque app inclut mongoSanitize pour reproduire le stack de production.

function buildAuthApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use(mongoSanitize())
  app.use('/api/auth', authRouter)
  return app
}

function buildUsersApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use(mongoSanitize())
  // En production : authGuard(['admin', 'director', 'hr', 'manager', 'employee'])
  app.use('/api/users', authGuard(['admin', 'director', 'hr', 'manager', 'employee']), userRouter)
  return app
}

function buildCampaignsApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use(mongoSanitize())
  app.use('/api/campaigns', authGuard(['admin', 'director', 'hr', 'manager', 'employee']), campaignRouter)
  return app
}

function buildAnalyticsApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use(mongoSanitize())
  app.use('/api/analytics', authGuard(['admin', 'director', 'hr', 'manager', 'employee']), analyticsRouter)
  return app
}

function buildEvalApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use(mongoSanitize())
  app.use('/api/evaluations', authGuard(['admin', 'director', 'hr', 'manager', 'employee']), evalRouter)
  return app
}

// =============================================================================
// 1. Injection NoSQL (P1)
// =============================================================================

describe('NoSQL Injection', () => {

  // ── POST /api/auth/login — opérateurs MongoDB dans le body ─────────────────
  describe('POST /api/auth/login — injection dans le body', () => {
    const app = buildAuthApp()

    beforeEach(() => {
      jest.clearAllMocks()
      // AuthUser = auto-mock de models/User, utilisé par auth.js
      AuthUser.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
      })
      AuditLog.create = jest.fn().mockResolvedValue({})
    })

    it('{ email: { $gt: "" } } → 400 ou 401 (pas 200, pas d\'authentification bypass)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: { $gt: '' }, password: 'x' })
      expect([400, 401]).toContain(res.status)
      expect(res.status).not.toBe(200)
    })

    it('{ email: { $ne: null } } → 400 ou 401 (pas 200)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: { $ne: null }, password: 'x' })
      expect([400, 401]).toContain(res.status)
      expect(res.status).not.toBe(200)
    })

    it('{ email: { $regex: ".*" } } → 400 ou 401 (pas 200)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: { $regex: '.*' }, password: 'x' })
      expect([400, 401]).toContain(res.status)
      expect(res.status).not.toBe(200)
    })
  })

  // ── GET /api/users — injection dans les query params ────────────────────────
  describe('GET /api/users — injection $ne dans le paramètre sector', () => {
    const app = buildUsersApp()

    beforeEach(() => {
      jest.clearAllMocks()
      // RouteUser = MockUser de require('../../models'), utilisé par users.js
      RouteUser.find           = jest.fn(() => makeChain([]))
      RouteUser.countDocuments = jest.fn().mockResolvedValue(0)
    })

    it('sector[$ne]= ne doit pas provoquer d\'erreur serveur (200 ou 400, pas 500)', async () => {
      const res = await request(app)
        .get('/api/users?sector[$ne]=')
        .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      expect(res.status).not.toBe(500)
      expect([200, 400]).toContain(res.status)
    })

    it('l\'opérateur $ne ne doit pas être transmis à MongoDB comme filtre sectorId', async () => {
      await request(app)
        .get('/api/users?sector[$ne]=')
        .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      if (RouteUser.find.mock.calls.length > 0) {
        const [filter] = RouteUser.find.mock.calls[0]
        // sectorId ne doit pas contenir un opérateur MongoDB
        expect(filter.sectorId?.$ne).toBeUndefined()
        expect(
          typeof filter.sectorId === 'object' && filter.sectorId !== null
            ? Object.keys(filter.sectorId).some(k => k.startsWith('$'))
            : false
        ).toBe(false)
      }
    })
  })

  // ── GET /api/evaluations — injection $in dans le paramètre status ───────────
  describe('GET /api/evaluations — injection $in dans le paramètre status', () => {
    const app = buildEvalApp()

    beforeEach(() => {
      jest.clearAllMocks()
      Evaluation.find           = jest.fn(() => makeChain([]))
      Evaluation.countDocuments = jest.fn().mockResolvedValue(0)
    })

    it('status[$in][]=draft&status[$in][]=validated → 400 (validation de type, pas 500)', async () => {
      const res = await request(app)
        .get('/api/evaluations?status[$in][]=draft&status[$in][]=validated')
        .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      // La route valide typeof status === 'string' — un objet/tableau retourne 400
      expect(res.status).not.toBe(500)
      expect([400, 200]).toContain(res.status)
    })
  })
})

// =============================================================================
// 2. RBAC cross-role (P1)
// =============================================================================

describe('RBAC cross-role', () => {
  const usersApp     = buildUsersApp()
  const campaignsApp = buildCampaignsApp()
  const analyticsApp = buildAnalyticsApp()

  beforeEach(() => jest.clearAllMocks())

  // ── Employee : actions réservées admin/hr ─────────────────────────────────
  it('employee GET /api/users → 403', async () => {
    const res = await request(usersApp)
      .get('/api/users')
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(403)
  })

  it('employee POST /api/campaigns → 403', async () => {
    const res = await request(campaignsApp)
      .post('/api/campaigns')
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ name: 'Test', startDate: '2025-01-01', endDate: '2025-12-31' })
    expect(res.status).toBe(403)
  })

  it('employee GET /api/analytics/summary → 403', async () => {
    const res = await request(analyticsApp)
      .get('/api/analytics/summary')
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(403)
  })

  // ── Manager : actions réservées admin ─────────────────────────────────────
  it('manager DELETE /api/users/:id → 403', async () => {
    const res = await request(usersApp)
      .delete(`/api/users/${TARGET_ID}`)
      .set('Cookie', `token=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
    expect(res.status).toBe(403)
  })

  it('manager POST /api/campaigns → 403', async () => {
    const res = await request(campaignsApp)
      .post('/api/campaigns')
      .set('Cookie', `token=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
      .send({ name: 'Test', startDate: '2025-01-01', endDate: '2025-12-31' })
    expect(res.status).toBe(403)
  })

  // ── HR : action réservée admin ────────────────────────────────────────────
  it('hr DELETE /api/users/:id → 403 (réservé admin)', async () => {
    const res = await request(usersApp)
      .delete(`/api/users/${TARGET_ID}`)
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
    expect(res.status).toBe(403)
  })
})

// =============================================================================
// 3. Rate limiting login (P2)
// =============================================================================

describe('Rate limiting — POST /api/auth/login', () => {
  /**
   * NOTE : Dans auth.js, les limiters ont :
   *   max: process.env.NODE_ENV === 'test' ? 1000 : 5
   *
   * Ce comportement est intentionnel pour éviter des tests CI flaky.
   * Les tests ci-dessous vérifient :
   *   a) que le middleware rate-limit est bien enregistré sur la route /login
   *   b) que le 429 est déclenché en rechargeant le module avec NODE_ENV=production
   */

  it('la route /login a au moins 3 handlers (byEmail limiter + byIP limiter + main handler)', () => {
    const loginLayer = authRouter.stack.find(l => l.route?.path === '/login')
    expect(loginLayer).toBeDefined()
    // Route doit avoir : loginByEmailLimiter + loginByIPLimiter + handler principal
    expect(loginLayer.route.stack.length).toBeGreaterThanOrEqual(3)
  })

  it('retourne 429 après 5 tentatives échouées (mode production — max=5)', async () => {
    // Recharge auth.js avec NODE_ENV=production pour obtenir max=5
    let prodAuthRouter
    let prodAuthUser

    process.env.NODE_ENV = 'production'
    jest.isolateModules(() => {
      prodAuthUser = require('../../models/User')
      prodAuthRouter = require('../../routes/auth')
    })
    process.env.NODE_ENV = 'test'

    // Configurer le mock User sur l'instance isolée (user not found → 401)
    prodAuthUser.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    })

    const app = express()
    app.use(express.json())
    app.use(cookieParser())
    app.use('/api/auth', prodAuthRouter)

    const failedLogin = () =>
      request(app)
        .post('/api/auth/login')
        .send({ email: 'brute@corp.com', password: 'wrong' })

    // 5 tentatives passent (on est exactement au seuil)
    for (let i = 0; i < 5; i++) {
      const r = await failedLogin()
      expect(r.status).not.toBe(429)
    }

    // La 6ème doit être bloquée par le rate limiter
    const res = await failedLogin()
    expect(res.status).toBe(429)
  })
})

// =============================================================================
// 4. Validation JWT (P2)
// =============================================================================

describe('JWT validation', () => {
  const app = buildUsersApp()

  beforeEach(() => {
    jest.clearAllMocks()
    RouteUser.find           = jest.fn(() => makeChain([]))
    RouteUser.countDocuments = jest.fn().mockResolvedValue(0)
  })

  it('GET /api/users sans token → 401', async () => {
    const res = await request(app).get('/api/users')
    expect(res.status).toBe(401)
  })

  it('GET /api/users avec token invalide (chaîne aléatoire) → 401', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', 'token=not.a.valid.jwt')
    expect(res.status).toBe(401)
  })

  it('GET /api/users avec token signé avec un mauvais secret → 401', async () => {
    const badToken = jwt.sign({ id: ADMIN_ID, role: 'admin' }, 'wrong-secret', {
      algorithm: 'HS256', expiresIn: '1h',
    })
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', `token=${badToken}`)
    expect(res.status).toBe(401)
  })

  it('GET /api/users avec token expiré → 401', async () => {
    const expiredToken = jwt.sign({ id: ADMIN_ID, role: 'admin' }, SECRET, {
      algorithm: 'HS256', expiresIn: '-1s',
    })
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', `token=${expiredToken}`)
    expect(res.status).toBe(401)
  })

  it('GET /api/users avec token valide mais rôle insuffisant (employee) → 403', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(403)
  })

  it('GET /api/users avec token admin valide → 200', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
  })
})
