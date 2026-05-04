'use strict'

// auth.login.test.js — Focused unit tests for POST /api/auth/login
// Covers: successful login, wrong password, inactive user, missing fields, LDAP user.
// All external dependencies (User model, bcrypt, AuditLog) are mocked.

const jwt    = require('jsonwebtoken')
const bcrypt = require('bcrypt')

jest.mock('../../models/User')
jest.mock('../../models', () => ({
  AuditLog: { create: jest.fn().mockResolvedValue({}) },
}))

const User    = require('../../models/User')
const request = require('supertest')
const express = require('express')
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

// ─── Fixture & helpers ────────────────────────────────────────────────────────

const HASH_CORRECT = '$2b$10$placeholderHashForTestingOnly...'

const BASE_USER = {
  _id:          '507f1f77bcf86cd799439001',
  email:        'alice@corp.com',
  firstName:    'Alice',
  lastName:     'Martin',
  role:         'employee',
  authSource:   'local',
  isActive:     true,
  passwordHash: HASH_CORRECT,
}

function mockFindOne(user) {
  User.findOne = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(user),
    }),
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
    User.updateOne = jest.fn().mockResolvedValue({ acknowledged: true })
  })

  // ── 1. Champs manquants ──────────────────────────────────────────────────────

  it('400 — email manquant', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'secret' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/requis/i)
  })

  it('400 — password manquant', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@corp.com' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/requis/i)
  })

  it('400 — email invalide (format incorrect)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'secret' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  // ── 2. Utilisateur introuvable ───────────────────────────────────────────────

  it('401 — utilisateur inconnu (email inexistant)', async () => {
    mockFindOne(null)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unknown@corp.com', password: 'secret' })

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/invalides/i)
  })

  // ── 3. Mauvais mot de passe ──────────────────────────────────────────────────

  it('401 — mauvais mot de passe', async () => {
    mockFindOne(BASE_USER)
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@corp.com', password: 'mauvais-mdp' })

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/invalides/i)
  })

  // ── 4. Utilisateur LDAP (sans passwordHash) ──────────────────────────────────

  it('401 — utilisateur LDAP (authSource != local)', async () => {
    mockFindOne({ ...BASE_USER, authSource: 'ldap', passwordHash: null })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@corp.com', password: 'secret' })

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/invalides/i)
  })

  // ── 5. Utilisateur inactif ────────────────────────────────────────────────────
  // La route filtre isActive:true dans la requête DB → utilisateur inactif = null

  it('401 — utilisateur inactif (isActive:false ignoré par findOne)', async () => {
    // findOne avec isActive:true ne renvoie rien pour un user inactif
    mockFindOne(null)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inactive@corp.com', password: 'secret' })

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/invalides/i)
  })

  // ── 6. Login réussi ───────────────────────────────────────────────────────────

  it('200 — login OK : cookie httpOnly posé, user renvoyé sans passwordHash', async () => {
    mockFindOne(BASE_USER)
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@corp.com', password: 'correct-secret' })

    expect(res.status).toBe(200)
    expect(res.body.user).toMatchObject({
      email:     'alice@corp.com',
      firstName: 'Alice',
      role:      'employee',
    })
    expect(res.body.user).not.toHaveProperty('passwordHash')

    // Cookie token présent
    const setCookie = res.headers['set-cookie']
    expect(setCookie).toBeDefined()
    expect(setCookie.join(',')).toMatch(/token=/)
    expect(setCookie.join(',')).toMatch(/HttpOnly/i)
  })

  it('200 — JWT contient id, email, role', async () => {
    mockFindOne(BASE_USER)
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@corp.com', password: 'correct-secret' })

    expect(res.status).toBe(200)
    const cookieHeader = res.headers['set-cookie']?.join(',') || ''
    const match = cookieHeader.match(/token=([^;]+)/)
    expect(match).toBeTruthy()

    const payload = jwt.verify(match[1], SECRET)
    expect(payload.id).toBe(BASE_USER._id)
    expect(payload.email).toBe('alice@corp.com')
    expect(payload.role).toBe('employee')
  })

  it('200 — remember=true allonge la durée du cookie (~30 jours)', async () => {
    mockFindOne(BASE_USER)
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@corp.com', password: 'correct-secret', remember: true })

    expect(res.status).toBe(200)
    const setCookie = res.headers['set-cookie']?.join(',') || ''
    // Max-Age for 30 days ≈ 2592000 seconds
    expect(setCookie).toMatch(/Max-Age=2592000/i)
  })
})
