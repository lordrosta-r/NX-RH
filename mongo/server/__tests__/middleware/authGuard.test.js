'use strict'

const jwt  = require('jsonwebtoken')

// Mock User model before requiring authGuard
jest.mock('../../models/User', () => {
  const User = { findById: jest.fn() }
  return User
})

const User       = require('../../models/User')
const { authGuard } = require('../../middleware/authGuard')

// =============================================================================
// Tests — middleware/authGuard.js
// =============================================================================

const SECRET = 'test-secret-that-is-long-enough-for-hs256'

beforeAll(() => {
  process.env.JWT_SECRET = SECRET
})

// Helpers
const makeToken = (payload, opts = {}) =>
  jwt.sign(payload, SECRET, { algorithm: 'HS256', expiresIn: '1h', ...opts })

const makeReq = (token, url = '/api/users') => ({
  cookies: token ? { accessToken: token } : {},
  originalUrl: url,
})

const makeRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json:   jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  }
  return res
}

describe('authGuard middleware', () => {
  afterEach(() => jest.clearAllMocks())

  describe('missing token', () => {
    it('returns 401 JSON for API routes', async () => {
      const req  = makeReq(null, '/api/users')
      const res  = makeRes()
      const next = jest.fn()
      await authGuard()(req, res, next)
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' })
      expect(next).not.toHaveBeenCalled()
    })

    it('redirects to / for non-API routes', async () => {
      const req  = makeReq(null, '/dashboard')
      const res  = makeRes()
      const next = jest.fn()
      await authGuard()(req, res, next)
      expect(res.redirect).toHaveBeenCalledWith('/')
    })
  })

  describe('expired token', () => {
    it('returns 401 with "Session expirée" message', async () => {
      const token = makeToken({ id: 'user1', role: 'employee' }, { expiresIn: '-1s' })
      const req   = makeReq(token)
      const res   = makeRes()
      const next  = jest.fn()
      await authGuard()(req, res, next)
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Session expirée' })
    })
  })

  describe('invalid token', () => {
    it('returns 401 with "Token invalide" for garbage token', async () => {
      const req  = makeReq('notavalidtoken')
      const res  = makeRes()
      const next = jest.fn()
      await authGuard()(req, res, next)
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Token invalide' })
    })

    it('returns 401 for token signed with wrong secret', async () => {
      const token = jwt.sign({ id: 'x', role: 'admin' }, 'wrong-secret', { algorithm: 'HS256' })
      const req   = makeReq(token)
      const res   = makeRes()
      const next  = jest.fn()
      await authGuard()(req, res, next)
      expect(res.status).toHaveBeenCalledWith(401)
    })
  })

  describe('role check', () => {
    it('returns 403 when user role is not in allowedRoles', async () => {
      const token = makeToken({ id: 'u1', role: 'employee' })
      User.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue({ isActive: true }) })
      const req  = makeReq(token)
      const res  = makeRes()
      const next = jest.fn()
      await authGuard(['admin', 'hr'])(req, res, next)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' })
    })

    it('passes when user role is in allowedRoles', async () => {
      const token = makeToken({ id: 'u1', role: 'admin' })
      User.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue({ isActive: true }) })
      const req  = makeReq(token)
      const res  = makeRes()
      const next = jest.fn()
      await authGuard(['admin', 'hr'])(req, res, next)
      expect(next).toHaveBeenCalledWith()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('passes with no role restriction (empty allowedRoles)', async () => {
      const token = makeToken({ id: 'u1', role: 'employee' })
      User.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue({ isActive: true }) })
      const req  = makeReq(token)
      const res  = makeRes()
      const next = jest.fn()
      await authGuard()(req, res, next)
      expect(next).toHaveBeenCalledWith()
    })
  })

  describe('isActive DB check', () => {
    it('returns 401 and clears cookie for inactive user', async () => {
      const token = makeToken({ id: 'u1', role: 'employee' })
      User.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue({ isActive: false }) })
      const req  = makeReq(token)
      const res  = makeRes()
      const next = jest.fn()
      await authGuard()(req, res, next)
      expect(res.clearCookie).toHaveBeenCalledWith('accessToken', expect.objectContaining({ path: '/' }))
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Compte désactivé' })
    })

    it('returns 401 when user not found in DB', async () => {
      const token = makeToken({ id: 'u1', role: 'employee' })
      User.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) })
      const req  = makeReq(token)
      const res  = makeRes()
      const next = jest.fn()
      await authGuard()(req, res, next)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('calls next(err) when DB throws', async () => {
      const token = makeToken({ id: 'u1', role: 'employee' })
      User.findById.mockReturnValue({ lean: jest.fn().mockRejectedValue(new Error('DB error')) })
      const req  = makeReq(token)
      const res  = makeRes()
      const next = jest.fn()
      await authGuard()(req, res, next)
      expect(next).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('success path', () => {
    it('attaches req.user payload and calls next()', async () => {
      const payload = { id: 'u1', email: 'alice@corp.com', role: 'hr' }
      const token   = makeToken(payload)
      User.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue({ isActive: true }) })
      const req  = makeReq(token)
      const res  = makeRes()
      const next = jest.fn()
      await authGuard()(req, res, next)
      expect(next).toHaveBeenCalledWith()
      expect(req.user).toMatchObject({ id: 'u1', role: 'hr' })
    })
  })
})
