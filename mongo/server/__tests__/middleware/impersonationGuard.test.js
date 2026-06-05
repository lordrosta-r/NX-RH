'use strict'

// =============================================================================
// Tests — middleware/impersonationGuard.blockImpersonatedWrites
// Lecture seule stricte sous impersonation.
// =============================================================================

const request = require('supertest')
const express = require('express')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'

// Évite tout accès réel à la DB depuis l'audit best-effort du middleware.
jest.mock('../../models', () => ({
  AuditLog: { create: jest.fn().mockResolvedValue(undefined) },
}))

const { blockImpersonatedWrites } = require('../../middleware/impersonationGuard')

function buildApp() {
  const app = express()
  app.use(cookieParser())
  app.use('/api/', blockImpersonatedWrites)
  app.get('/api/things', (_req, res) => res.json({ ok: true }))
  app.post('/api/things', (_req, res) => res.json({ ok: true }))
  app.post('/api/auth/impersonate/stop', (_req, res) => res.json({ stopped: true }))
  return app
}

const impToken = jwt.sign(
  { id: 'u1', role: 'employee', imp: true, impersonatedBy: 'admin1' },
  process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '5m' },
)
const normalToken = jwt.sign(
  { id: 'u2', role: 'employee' },
  process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '5m' },
)

describe('blockImpersonatedWrites', () => {
  const app = buildApp()

  it('autorise les lectures (GET) sous impersonation', async () => {
    const res = await request(app).get('/api/things').set('Cookie', `accessToken=${impToken}`)
    expect(res.status).toBe(200)
  })

  it('refuse les écritures (POST) sous impersonation — 403', async () => {
    const res = await request(app).post('/api/things').set('Cookie', `accessToken=${impToken}`)
    expect(res.status).toBe(403)
  })

  it('autorise la sortie /auth/impersonate/stop même sous impersonation', async () => {
    const res = await request(app).post('/api/auth/impersonate/stop').set('Cookie', `accessToken=${impToken}`)
    expect(res.status).toBe(200)
  })

  it('laisse passer les écritures pour une session normale (non imp)', async () => {
    const res = await request(app).post('/api/things').set('Cookie', `accessToken=${normalToken}`)
    expect(res.status).toBe(200)
  })

  it('laisse passer sans cookie (authGuard tranchera plus loin)', async () => {
    const res = await request(app).post('/api/things')
    expect(res.status).toBe(200)
  })
})
