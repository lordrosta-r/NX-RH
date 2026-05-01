'use strict'

// =============================================================================
// routes/admin.js — Integration tests
// Covers: auth (401/403), POST /email/test, GET|PUT|PATCH|DELETE /config/:key
// No real DB or mailer — all external dependencies are mocked.
// =============================================================================

const jwt = require('jsonwebtoken')

// ─── Mock: authGuard ──────────────────────────────────────────────────────────
jest.mock('../../middleware/authGuard', () => ({
  authGuard: (roles = []) => (req, res, next) => {
    const _jwt = require('jsonwebtoken')
    const token = req.cookies?.token
    if (!token) return res.status(401).json({ error: 'Authentication required' })
    try {
      const payload = _jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
      if (roles.length && !roles.includes(payload.role)) return res.status(403).json({ error: 'Insufficient permissions' })
      req.user = payload
      next()
    } catch { return res.status(401).json({ error: 'Token invalide' }) }
  },
}))

// ─── Mock: Config model ───────────────────────────────────────────────────────
jest.mock('../../models/Config', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  deleteOne: jest.fn(),
}))

// ─── Mock: mailer service ─────────────────────────────────────────────────────
jest.mock('../../services/mailer', () => ({
  sendMail: jest.fn(),
}))

// ─── Mock: nodemailer ─────────────────────────────────────────────────────────
jest.mock('nodemailer', () => ({
  createTestAccount: jest.fn(),
  createTransport: jest.fn(() => ({ sendMail: jest.fn() })),
  getTestMessageUrl: jest.fn(() => 'https://ethereal.email/message/test'),
}))

// ─── Environment ─────────────────────────────────────────────────────────────
const SECRET = 'test-secret-long-enough-for-hs256-algorithm'
process.env.JWT_SECRET = SECRET
process.env.NODE_ENV = 'test'

// ─── Imports (after mocks) ────────────────────────────────────────────────────
const request    = require('supertest')
const express    = require('express')
const cookieParser = require('cookie-parser')

const { authGuard }  = require('../../middleware/authGuard')
const adminRouter    = require('../../routes/admin')
const Config         = require('../../models/Config')
const { sendMail }   = require('../../services/mailer')
const nodemailer     = require('nodemailer')

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns a chainable Mongoose-query-like object whose .lean() resolves to result. */
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

/** Minimal object with only .lean() — sufficient for findOne / findOneAndUpdate. */
function makeLean(result) {
  return { lean: jest.fn().mockResolvedValue(result) }
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/admin', authGuard(['admin']), adminRouter)
  return app
}

function tokenFor({ id, role }) {
  return jwt.sign({ id, email: `${role}@corp.com`, role }, SECRET, { algorithm: 'HS256', expiresIn: '1h' })
}

// ─── Tokens ───────────────────────────────────────────────────────────────────
const ADMIN_TOKEN    = tokenFor({ id: '507f1f77bcf86cd799439011', role: 'admin' })
const HR_TOKEN       = tokenFor({ id: '507f1f77bcf86cd799439012', role: 'hr' })
const MANAGER_TOKEN  = tokenFor({ id: '507f1f77bcf86cd799439013', role: 'manager' })
const EMPLOYEE_TOKEN = tokenFor({ id: '507f1f77bcf86cd799439014', role: 'employee' })

// =============================================================================
// Test suite
// =============================================================================

describe('routes/admin.js', () => {
  let app

  beforeEach(() => {
    jest.clearAllMocks()
    sendMail.mockResolvedValue({ messageId: 'test-id' })
    nodemailer.getTestMessageUrl.mockReturnValue('https://ethereal.email/message/test')
    app = buildApp()
  })

  // ── 401 — no token ──────────────────────────────────────────────────────────

  describe('401 — all routes reject unauthenticated requests', () => {
    const cases = [
      ['POST',   '/api/admin/email/test',     { to: 'user@corp.com' }],
      ['GET',    '/api/admin/config',          null],
      ['GET',    '/api/admin/config/somekey',  null],
      ['PUT',    '/api/admin/config/somekey',  { value: 'x' }],
      ['PATCH',  '/api/admin/config/somekey',  { value: 'x' }],
      ['DELETE', '/api/admin/config/somekey',  null],
    ]

    test.each(cases)('%s %s → 401', async (method, url, body) => {
      const req = request(app)[method.toLowerCase()](url)
      if (body) req.send(body)
      const res = await req
      expect(res.status).toBe(401)
    })
  })

  // ── 403 — non-admin roles ───────────────────────────────────────────────────

  describe('403 — non-admin roles are denied', () => {
    it('hr → 403 on GET /config', async () => {
      const res = await request(app)
        .get('/api/admin/config')
        .set('Cookie', `token=${HR_TOKEN}`)
      expect(res.status).toBe(403)
    })

    it('manager → 403 on GET /config', async () => {
      const res = await request(app)
        .get('/api/admin/config')
        .set('Cookie', `token=${MANAGER_TOKEN}`)
      expect(res.status).toBe(403)
    })

    it('employee → 403 on GET /config', async () => {
      const res = await request(app)
        .get('/api/admin/config')
        .set('Cookie', `token=${EMPLOYEE_TOKEN}`)
      expect(res.status).toBe(403)
    })

    it('hr → 403 on POST /email/test', async () => {
      const res = await request(app)
        .post('/api/admin/email/test')
        .set('Cookie', `token=${HR_TOKEN}`)
        .send({ to: 'test@corp.com' })
      expect(res.status).toBe(403)
    })

    it('manager → 403 on DELETE /config/:key', async () => {
      const res = await request(app)
        .delete('/api/admin/config/KEY')
        .set('Cookie', `token=${MANAGER_TOKEN}`)
      expect(res.status).toBe(403)
    })
  })

  // ── POST /email/test ────────────────────────────────────────────────────────

  describe('POST /api/admin/email/test', () => {
    it('400 when body is empty', async () => {
      const res = await request(app)
        .post('/api/admin/email/test')
        .set('Cookie', `token=${ADMIN_TOKEN}`)
        .send({})
      expect(res.status).toBe(400)
      expect(res.body).toHaveProperty('error')
    })

    it('400 when "to" has no @ character', async () => {
      const res = await request(app)
        .post('/api/admin/email/test')
        .set('Cookie', `token=${ADMIN_TOKEN}`)
        .send({ to: 'notanemail' })
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/email/i)
    })

    it('400 when "to" is a non-string value', async () => {
      const res = await request(app)
        .post('/api/admin/email/test')
        .set('Cookie', `token=${ADMIN_TOKEN}`)
        .send({ to: 42 })
      expect(res.status).toBe(400)
    })

    it('200 when "to" is a valid email address', async () => {
      const res = await request(app)
        .post('/api/admin/email/test')
        .set('Cookie', `token=${ADMIN_TOKEN}`)
        .send({ to: 'user@example.com' })
      expect(res.status).toBe(200)
    })

    it('response contains { sent: true, previewUrl }', async () => {
      const res = await request(app)
        .post('/api/admin/email/test')
        .set('Cookie', `token=${ADMIN_TOKEN}`)
        .send({ to: 'user@example.com' })
      expect(res.body.sent).toBe(true)
      expect(res.body).toHaveProperty('previewUrl')
    })

    it('previewUrl matches the Ethereal URL returned by nodemailer', async () => {
      const res = await request(app)
        .post('/api/admin/email/test')
        .set('Cookie', `token=${ADMIN_TOKEN}`)
        .send({ to: 'user@example.com' })
      expect(res.body.previewUrl).toBe('https://ethereal.email/message/test')
    })

    it('calls sendMail with the provided "to" address', async () => {
      await request(app)
        .post('/api/admin/email/test')
        .set('Cookie', `token=${ADMIN_TOKEN}`)
        .send({ to: 'admin-check@corp.com' })
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'admin-check@corp.com' })
      )
    })
  })

  // ── GET /config ─────────────────────────────────────────────────────────────

  describe('GET /api/admin/config', () => {
    it('200 returns the array of config entries', async () => {
      const configs = [{ key: 'SMTP_HOST', value: 'smtp.example.com' }]
      Config.find.mockReturnValue(makeChain(configs))

      const res = await request(app)
        .get('/api/admin/config')
        .set('Cookie', `token=${ADMIN_TOKEN}`)
      expect(res.status).toBe(200)
      expect(res.body).toEqual(configs)
    })

    it('200 returns empty array when no configs exist', async () => {
      Config.find.mockReturnValue(makeChain([]))

      const res = await request(app)
        .get('/api/admin/config')
        .set('Cookie', `token=${ADMIN_TOKEN}`)
      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })
  })

  // ── GET /config/:key ────────────────────────────────────────────────────────

  describe('GET /api/admin/config/:key', () => {
    it('200 returns the config entry when key exists', async () => {
      const entry = { key: 'SMTP_HOST', value: 'smtp.corp.com' }
      Config.findOne.mockReturnValue(makeLean(entry))

      const res = await request(app)
        .get('/api/admin/config/SMTP_HOST')
        .set('Cookie', `token=${ADMIN_TOKEN}`)
      expect(res.status).toBe(200)
      expect(res.body).toEqual(entry)
    })

    it('404 when the key does not exist', async () => {
      Config.findOne.mockReturnValue(makeLean(null))

      const res = await request(app)
        .get('/api/admin/config/MISSING_KEY')
        .set('Cookie', `token=${ADMIN_TOKEN}`)
      expect(res.status).toBe(404)
      expect(res.body.error).toMatch(/MISSING_KEY/)
    })
  })

  // ── PUT /config/:key ────────────────────────────────────────────────────────

  describe('PUT /api/admin/config/:key', () => {
    it('400 when "value" field is absent from body', async () => {
      const res = await request(app)
        .put('/api/admin/config/SOME_KEY')
        .set('Cookie', `token=${ADMIN_TOKEN}`)
        .send({ other: 'data' })
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/value/i)
    })

    it('200 creates a new config entry (upsert)', async () => {
      const entry = { key: 'NEW_KEY', value: 'new-value' }
      Config.findOneAndUpdate.mockReturnValue(makeLean(entry))

      const res = await request(app)
        .put('/api/admin/config/NEW_KEY')
        .set('Cookie', `token=${ADMIN_TOKEN}`)
        .send({ value: 'new-value' })
      expect(res.status).toBe(200)
      expect(res.body).toEqual(entry)
    })

    it('200 replaces an existing config entry', async () => {
      const updated = { key: 'EXISTING_KEY', value: 'replaced' }
      Config.findOneAndUpdate.mockReturnValue(makeLean(updated))

      const res = await request(app)
        .put('/api/admin/config/EXISTING_KEY')
        .set('Cookie', `token=${ADMIN_TOKEN}`)
        .send({ value: 'replaced' })
      expect(res.status).toBe(200)
      expect(res.body.value).toBe('replaced')
    })

    it('calls findOneAndUpdate with upsert: true', async () => {
      Config.findOneAndUpdate.mockReturnValue(makeLean({ key: 'K', value: 'v' }))

      await request(app)
        .put('/api/admin/config/K')
        .set('Cookie', `token=${ADMIN_TOKEN}`)
        .send({ value: 'v' })
      expect(Config.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'K' }),
        expect.any(Object),
        expect.objectContaining({ upsert: true })
      )
    })
  })

  // ── PATCH /config/:key ──────────────────────────────────────────────────────

  describe('PATCH /api/admin/config/:key', () => {
    it('400 when "value" field is absent from body', async () => {
      const res = await request(app)
        .patch('/api/admin/config/SOME_KEY')
        .set('Cookie', `token=${ADMIN_TOKEN}`)
        .send({})
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/value/i)
    })

    it('200 updates an existing config entry', async () => {
      const entry = { key: 'PATCHME', value: 'patched-value' }
      Config.findOneAndUpdate.mockReturnValue(makeLean(entry))

      const res = await request(app)
        .patch('/api/admin/config/PATCHME')
        .set('Cookie', `token=${ADMIN_TOKEN}`)
        .send({ value: 'patched-value' })
      expect(res.status).toBe(200)
      expect(res.body.value).toBe('patched-value')
    })

    it('404 when key does not exist', async () => {
      Config.findOneAndUpdate.mockReturnValue(makeLean(null))

      const res = await request(app)
        .patch('/api/admin/config/GHOST_KEY')
        .set('Cookie', `token=${ADMIN_TOKEN}`)
        .send({ value: 'x' })
      expect(res.status).toBe(404)
      expect(res.body.error).toMatch(/GHOST_KEY/)
    })
  })

  // ── DELETE /config/:key ─────────────────────────────────────────────────────

  describe('DELETE /api/admin/config/:key', () => {
    it('204 when the key exists and is successfully deleted', async () => {
      Config.deleteOne.mockResolvedValue({ deletedCount: 1 })

      const res = await request(app)
        .delete('/api/admin/config/DEL_KEY')
        .set('Cookie', `token=${ADMIN_TOKEN}`)
      expect(res.status).toBe(204)
      expect(res.text).toBe('')
    })

    it('404 when the key does not exist', async () => {
      Config.deleteOne.mockResolvedValue({ deletedCount: 0 })

      const res = await request(app)
        .delete('/api/admin/config/GHOST_KEY')
        .set('Cookie', `token=${ADMIN_TOKEN}`)
      expect(res.status).toBe(404)
      expect(res.body.error).toMatch(/GHOST_KEY/)
    })

    it('calls deleteOne with the correct key', async () => {
      Config.deleteOne.mockResolvedValue({ deletedCount: 1 })

      await request(app)
        .delete('/api/admin/config/TARGET_KEY')
        .set('Cookie', `token=${ADMIN_TOKEN}`)
      expect(Config.deleteOne).toHaveBeenCalledWith({ key: 'TARGET_KEY' })
    })
  })
})
