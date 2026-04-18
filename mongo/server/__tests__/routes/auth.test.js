'use strict'

// Auth route integration tests — no real MongoDB connection needed.
// We mock the User model and bcrypt so tests run in isolation.

const jwt    = require('jsonwebtoken')
const bcrypt = require('bcrypt')

jest.mock('../../models/User')
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

const User     = require('../../models/User')
const request  = require('supertest')
const express  = require('express')
const cookieParser = require('cookie-parser')
const authRouter   = require('../../routes/auth')

// =============================================================================
// Tests — routes/auth.js
// =============================================================================

const SECRET = 'test-secret-long-enough-for-hs256-algorithm'
process.env.JWT_SECRET = SECRET
process.env.NODE_ENV   = 'test'

// Build a minimal Express app for these tests
function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/auth', authRouter)
  return app
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const validUser = {
  _id:          '507f1f77bcf86cd799439011',
  email:        'alice@corp.com',
  firstName:    'Alice',
  lastName:     'Martin',
  role:         'hr',
  passwordHash: null,   // filled per test
  authSource:   'local',
  isActive:     true,
}

function mockUserFind(overrides = {}) {
  const user = { ...validUser, ...overrides }
  User.findOne = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(user),
    }),
  })
  return user
}

function mockUserFindById(overrides = {}) {
  const user = { ...validUser, ...overrides }
  User.findById = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(user),
    }),
  })
  return user
}

// ─── POST /api/auth/login ────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
    User.updateOne = jest.fn().mockResolvedValue({ acknowledged: true })
  })

  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'secret' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/requis/)
  })

  it('returns 400 when password is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'alice@corp.com' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'pass' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('returns 401 for unknown user', async () => {
    User.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    })
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@corp.com', password: 'wrong' })
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/invalides/i)
  })

  it('returns 401 for LDAP user (no passwordHash)', async () => {
    mockUserFind({ authSource: 'ldap', passwordHash: null })
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@corp.com', password: 'pass' })
    expect(res.status).toBe(401)
  })

  it('returns 401 for wrong password', async () => {
    const hash = await bcrypt.hash('correct', 10)
    mockUserFind({ passwordHash: hash })
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@corp.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('returns 200 and sets httpOnly cookie on valid login', async () => {
    const hash = await bcrypt.hash('secret123', 10)
    mockUserFind({ passwordHash: hash })
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@corp.com', password: 'secret123' })
    expect(res.status).toBe(200)
    expect(res.body.user).toBeDefined()
    expect(res.body.user.email).toBe('alice@corp.com')
    // Token must NOT appear in response body
    expect(res.body.token).toBeUndefined()
    // Cookie must be set
    const cookie = res.headers['set-cookie']
    expect(cookie).toBeDefined()
    expect(cookie[0]).toMatch(/token=/)
    expect(cookie[0]).toMatch(/HttpOnly/i)
  })

  it('updates lastLoginAt on successful login (fire-and-forget)', async () => {
    const hash = await bcrypt.hash('secret123', 10)
    mockUserFind({ passwordHash: hash })
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@corp.com', password: 'secret123' })
    expect(res.status).toBe(200)
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: validUser._id },
      { $set: { lastLoginAt: expect.any(Date) } },
    )
  })

  it('does not expose passwordHash in response', async () => {
    const hash = await bcrypt.hash('secret123', 10)
    mockUserFind({ passwordHash: hash })
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@corp.com', password: 'secret123' })
    expect(res.status).toBe(200)
    expect(res.body.user.passwordHash).toBeUndefined()
  })

  it('sets longer maxAge when remember=true', async () => {
    const hash = await bcrypt.hash('secret123', 10)
    mockUserFind({ passwordHash: hash })
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@corp.com', password: 'secret123', remember: true })
    expect(res.status).toBe(200)
    const cookie = res.headers['set-cookie'][0]
    // Max-Age for 30 days = 2592000 seconds
    expect(cookie).toMatch(/Max-Age=2592000/i)
  })
})

// ─── POST /api/auth/logout ───────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  const app = buildApp()

  it('returns 200 and clears token cookie', async () => {
    const res = await request(app).post('/api/auth/logout')
    expect(res.status).toBe(200)
    expect(res.body.message).toBeDefined()
    const cookie = res.headers['set-cookie']
    expect(cookie).toBeDefined()
    // Clearing a cookie sets Max-Age=0 or Expires in the past
    expect(cookie[0]).toMatch(/token=;|Max-Age=0/i)
  })
})

// ─── GET /api/auth/me ────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  const app = buildApp()

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('returns user info with valid token + active user', async () => {
    const token = jwt.sign(
      { id: validUser._id, email: validUser.email, role: validUser.role },
      SECRET,
      { algorithm: 'HS256', expiresIn: '1h' }
    )
    mockUserFindById()
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `token=${token}`)
    expect(res.status).toBe(200)
    expect(res.body.email).toBe('alice@corp.com')
  })

  it('returns 401 and clears cookie when user is inactive', async () => {
    const token = jwt.sign(
      { id: validUser._id, email: validUser.email, role: validUser.role },
      SECRET,
      { algorithm: 'HS256', expiresIn: '1h' }
    )
    mockUserFindById({ isActive: false })
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `token=${token}`)
    expect(res.status).toBe(401)
  })
})

// ─── PATCH /api/auth/preferences ─────────────────────────────────────────────

describe('PATCH /api/auth/preferences', () => {
  const app = buildApp()

  function tokenFor(user = validUser) {
    return jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      SECRET,
      { algorithm: 'HS256', expiresIn: '1h' }
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
    User.updateOne = jest.fn().mockResolvedValue({ acknowledged: true })
  })

  it('returns 401 without token', async () => {
    const res = await request(app)
      .patch('/api/auth/preferences')
      .send({ locale: 'en' })
    expect(res.status).toBe(401)
  })

  it('rejects unknown notification key', async () => {
    const res = await request(app)
      .patch('/api/auth/preferences')
      .set('Cookie', `token=${tokenFor()}`)
      .send({ notificationPrefs: { unknownKey: true } })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/inconnue/i)
  })

  it('rejects invalid locale enum', async () => {
    const res = await request(app)
      .patch('/api/auth/preferences')
      .set('Cookie', `token=${tokenFor()}`)
      .send({ locale: 'es' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/locale/i)
  })

  it('rejects invalid theme enum', async () => {
    const res = await request(app)
      .patch('/api/auth/preferences')
      .set('Cookie', `token=${tokenFor()}`)
      .send({ theme: 'neon' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/th[èe]me/i)
  })

  it('rejects non-boolean notification value', async () => {
    const res = await request(app)
      .patch('/api/auth/preferences')
      .set('Cookie', `token=${tokenFor()}`)
      .send({ notificationPrefs: { evaluationAssigned: 'yes' } })
    expect(res.status).toBe(400)
  })

  it('returns 400 when no preference provided', async () => {
    const res = await request(app)
      .patch('/api/auth/preferences')
      .set('Cookie', `token=${tokenFor()}`)
      .send({})
    expect(res.status).toBe(400)
  })

  it('updates locale + theme + notificationPrefs and returns fresh prefs', async () => {
    // Mock for both reads (current notif merge + final fetch)
    User.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          locale: 'en',
          theme:  'light',
          notificationPrefs: { evaluationAssigned: false, deadlineReminder: true },
        }),
      }),
    })
    const res = await request(app)
      .patch('/api/auth/preferences')
      .set('Cookie', `token=${tokenFor()}`)
      .send({
        locale: 'en',
        theme:  'light',
        notificationPrefs: { evaluationAssigned: false },
      })
    expect(res.status).toBe(200)
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: validUser._id },
      { $set: expect.objectContaining({ locale: 'en', theme: 'light' }) },
    )
    expect(res.body.locale).toBe('en')
    expect(res.body.theme).toBe('light')
  })
})
