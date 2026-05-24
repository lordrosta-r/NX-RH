'use strict'

// auth-ldap.test.js — Tests spécifiques à l'authentification LDAP-only
//
// Vérifie que :
//   1. PATCH /api/auth/password   → 403 "LDAP"
//   2. POST  /api/auth/forgot-password → 403 "LDAP"
//   3. POST  /api/auth/reset-password  → 403 "LDAP"
//   4. POST  /api/auth/login → 200 + cookie JWT contenant firstName et lastName

const jwt    = require('jsonwebtoken')
const bcrypt = require('bcrypt')

jest.mock('../../models/User')
jest.mock('../../models', () => ({
  AuditLog: { create: jest.fn().mockResolvedValue({}) },
}))

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

const User         = require('../../models/User')
const request      = require('supertest')
const express      = require('express')
const cookieParser = require('cookie-parser')
const authRouter   = require('../../routes/auth')

const SECRET = 'test-secret-long-enough-for-hs256-algorithm'
process.env.JWT_SECRET = SECRET
process.env.NODE_ENV   = 'test'

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/auth', authRouter)
  return app
}

// ─── Fixture ──────────────────────────────────────────────────────────────────

const BASE_USER = {
  _id:          '507f1f77bcf86cd799439001',
  email:        'alice@corp.com',
  firstName:    'Alice',
  lastName:     'Martin',
  role:         'employee',
  authSource:   'local',
  isActive:     true,
  passwordHash: 'placeholder',
}

function mockFindOne(user) {
  User.findOne = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(user),
    }),
  })
}

function validToken(overrides = {}) {
  const payload = { id: BASE_USER._id, email: BASE_USER.email, role: BASE_USER.role, ...overrides }
  return jwt.sign(payload, SECRET, { algorithm: 'HS256', expiresIn: '1h' })
}

// ─── PATCH /api/auth/password ─────────────────────────────────────────────────

describe('PATCH /api/auth/password — LDAP-only', () => {
  const app = buildApp()

  it('retourne 403 avec message contenant "LDAP"', async () => {
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Cookie', `token=${validToken()}`)
      .send({ currentPassword: 'old', newPassword: 'new' })

    expect(res.status).toBe(403)
    expect(res.body.message).toMatch(/LDAP/i)
  })

  it('retourne 401 sans token (authGuard bloque avant)', async () => {
    const res = await request(app)
      .patch('/api/auth/password')
      .send({ currentPassword: 'old', newPassword: 'new' })

    expect(res.status).toBe(401)
  })
})

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────

describe('POST /api/auth/forgot-password — LDAP-only', () => {
  const app = buildApp()

  it('retourne 403 avec message contenant "LDAP"', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'alice@corp.com' })

    expect(res.status).toBe(403)
    expect(res.body.message).toMatch(/LDAP/i)
  })

  it('retourne 403 même sans corps de requête', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')

    expect(res.status).toBe(403)
    expect(res.body.message).toMatch(/LDAP/i)
  })
})

// ─── POST /api/auth/reset-password ───────────────────────────────────────────

describe('POST /api/auth/reset-password — LDAP-only', () => {
  const app = buildApp()

  it('retourne 403 avec message contenant "LDAP"', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'some-token', newPassword: 'newpass' })

    expect(res.status).toBe(403)
    expect(res.body.message).toMatch(/LDAP/i)
  })

  it('retourne 403 même sans paramètres', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')

    expect(res.status).toBe(403)
    expect(res.body.message).toMatch(/LDAP/i)
  })
})

// ─── POST /api/auth/login — JWT contient firstName et lastName ────────────────

describe('POST /api/auth/login — JWT payload avec firstName/lastName', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
    User.updateOne = jest.fn().mockResolvedValue({ acknowledged: true })
  })

  it('200 — le cookie JWT contient firstName et lastName dans le payload', async () => {
    mockFindOne(BASE_USER)
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@corp.com', password: 'correct-secret' })

    expect(res.status).toBe(200)

    // Extraire le token du cookie
    const cookieHeader = res.headers['set-cookie']?.join(',') || ''
    const match = cookieHeader.match(/token=([^;]+)/)
    expect(match).toBeTruthy()

    const payload = jwt.verify(match[1], SECRET)
    expect(payload.firstName).toBe('Alice')
    expect(payload.lastName).toBe('Martin')
  })

  it('200 — le payload JWT contient également id, email et role', async () => {
    mockFindOne(BASE_USER)
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@corp.com', password: 'correct-secret' })

    expect(res.status).toBe(200)

    const cookieHeader = res.headers['set-cookie']?.join(',') || ''
    const match = cookieHeader.match(/token=([^;]+)/)
    const payload = jwt.verify(match[1], SECRET)

    expect(payload.id).toBeDefined()
    expect(payload.email).toBe('alice@corp.com')
    expect(payload.role).toBe('employee')
    expect(payload.firstName).toBe('Alice')
    expect(payload.lastName).toBe('Martin')
  })

  it('200 — la réponse JSON inclut firstName et lastName dans user', async () => {
    mockFindOne(BASE_USER)
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@corp.com', password: 'correct-secret' })

    expect(res.status).toBe(200)
    expect(res.body.data.user.firstName).toBe('Alice')
    expect(res.body.data.user.lastName).toBe('Martin')
  })
})
