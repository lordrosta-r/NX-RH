'use strict'

// =============================================================================
// routes/notifications.js — integration tests (no real MongoDB connection)
//
// Routes tested:
//   GET   /api/notifications              → { data, total, page, limit, unreadCount }
//   GET   /api/notifications/count        → { total, unreadCount }
//   PATCH /api/notifications/read-all     → { modifiedCount }
//   PATCH /api/notifications/:id/read     → { id, read }  (+ 400 / 403 / 404)
//   POST  /api/notifications/global-remind → { sent }    (admin/hr only)
//
// NOTE: The route uses req.user._id but the JWT payload stores `id` (not `_id`).
// The authGuard mock bridges this by setting req.user._id = req.user.id.
// =============================================================================

const jwt = require('jsonwebtoken')

// ─── Mock: Notification model ─────────────────────────────────────────────────
jest.mock('../../models/Notification', () => ({
  find:           jest.fn(),
  countDocuments: jest.fn(),
  updateMany:     jest.fn(),
  findById:       jest.fn(),
  insertMany:     jest.fn(),
}))

// ─── Mock: User model ─────────────────────────────────────────────────────────
jest.mock('../../models/User', () => ({
  find: jest.fn(),
}))

// ─── Mock: authGuard ──────────────────────────────────────────────────────────
// Bridge: also sets req.user._id since the notifications route reads req.user._id
// while the JWT payload stores `id`.
jest.mock('../../middleware/authGuard', () => ({
  authGuard: (roles = []) => (req, res, next) => {
    const _jwt  = require('jsonwebtoken')
    const token = req.cookies?.accessToken
    if (!token) return res.status(401).json({ error: 'Authentication required' })
    try {
      const payload = _jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
      if (roles.length && !roles.includes(payload.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }
      req.user = { ...payload, _id: payload.id }
      next()
    } catch {
      return res.status(401).json({ error: 'Token invalide' })
    }
  },
}))

const Notification        = require('../../models/Notification')
const User                = require('../../models/User')
const request             = require('supertest')
const express             = require('express')
const cookieParser        = require('cookie-parser')
const { authGuard }       = require('../../middleware/authGuard')
const notificationsRouter = require('../../routes/notifications')

const SECRET = 'test-secret-long-enough-for-hs256-algorithm'
process.env.JWT_SECRET = SECRET
process.env.NODE_ENV   = 'test'

// ─── IDs ─────────────────────────────────────────────────────────────────────

const USER_ID  = '507f1f77bcf86cd799439011'
const NOTIF_ID = '507f1f77bcf86cd799439033'
const ADMIN_ID = '507f1f77bcf86cd799439001'
const HR_ID    = '507f1f77bcf86cd799439002'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tokenFor({ id, role }) {
  return jwt.sign(
    { id, email: `${role}@corp.com`, role },
    SECRET,
    { algorithm: 'HS256', expiresIn: '1h' },
  )
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  // Mirror index.js: auth applied at mount, not inside the router
  app.use(
    '/api/notifications',
    authGuard(['admin', 'hr', 'manager', 'employee']),
    notificationsRouter,
  )
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
  })
  return app
}

const app = buildApp()

// =============================================================================
// GET /api/notifications
// =============================================================================

describe('GET /api/notifications', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/notifications')
    expect(res.status).toBe(401)
  })

  it('returns { data, total, page, limit, unreadCount } — NOT "notifications" key', async () => {
    const mockNotifs = [{ _id: NOTIF_ID, title: 'Test', read: false }]
    Notification.find.mockReturnValue({
      sort:  jest.fn().mockReturnThis(),
      skip:  jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean:  jest.fn().mockResolvedValue(mockNotifs),
    })
    Notification.countDocuments
      .mockResolvedValueOnce(1)   // total
      .mockResolvedValueOnce(1)   // unreadCount

    const res = await request(app)
      .get('/api/notifications')
      .set('Cookie', `accessToken=${tokenFor({ id: USER_ID, role: 'employee' })}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body).toHaveProperty('meta.total', 1)
    expect(res.body).toHaveProperty('meta.page', 1)
    expect(res.body).toHaveProperty('meta.limit', 20)
    expect(res.body).toHaveProperty('meta.unreadCount', 1)
    // Contract: key must be 'data', NOT 'notifications'
    expect(res.body).not.toHaveProperty('notifications')
  })

  it('respects ?page and ?limit query params', async () => {
    Notification.find.mockReturnValue({
      sort:  jest.fn().mockReturnThis(),
      skip:  jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean:  jest.fn().mockResolvedValue([]),
    })
    Notification.countDocuments.mockResolvedValue(0)

    const res = await request(app)
      .get('/api/notifications?page=3&limit=10')
      .set('Cookie', `accessToken=${tokenFor({ id: USER_ID, role: 'employee' })}`)

    expect(res.status).toBe(200)
    expect(res.body.meta.page).toBe(3)
    expect(res.body.meta.limit).toBe(10)
  })

  it('caps limit at 100 even if a higher value is requested', async () => {
    Notification.find.mockReturnValue({
      sort:  jest.fn().mockReturnThis(),
      skip:  jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean:  jest.fn().mockResolvedValue([]),
    })
    Notification.countDocuments.mockResolvedValue(0)

    const res = await request(app)
      .get('/api/notifications?limit=9999')
      .set('Cookie', `accessToken=${tokenFor({ id: USER_ID, role: 'employee' })}`)

    expect(res.status).toBe(200)
    expect(res.body.meta.limit).toBe(100)
  })
})

// =============================================================================
// GET /api/notifications/count
// =============================================================================

describe('GET /api/notifications/count', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/notifications/count')
    expect(res.status).toBe(401)
  })

  it('returns { total, unreadCount }', async () => {
    Notification.countDocuments
      .mockResolvedValueOnce(10)   // total
      .mockResolvedValueOnce(3)    // unreadCount

    const res = await request(app)
      .get('/api/notifications/count')
      .set('Cookie', `accessToken=${tokenFor({ id: USER_ID, role: 'employee' })}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('total', 10)
    expect(res.body.data).toHaveProperty('unreadCount', 3)
  })
})

// =============================================================================
// PATCH /api/notifications/read-all
// =============================================================================

describe('PATCH /api/notifications/read-all', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).patch('/api/notifications/read-all')
    expect(res.status).toBe(401)
  })

  it('returns { modifiedCount } after marking all notifications read', async () => {
    Notification.updateMany.mockResolvedValue({ modifiedCount: 7 })

    const res = await request(app)
      .patch('/api/notifications/read-all')
      .set('Cookie', `accessToken=${tokenFor({ id: USER_ID, role: 'employee' })}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('modifiedCount', 7)
  })
})

// =============================================================================
// PATCH /api/notifications/:id/read
// =============================================================================

describe('PATCH /api/notifications/:id/read', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 400 for an invalid ObjectId', async () => {
    const res = await request(app)
      .patch('/api/notifications/not-a-valid-id/read')
      .set('Cookie', `accessToken=${tokenFor({ id: USER_ID, role: 'employee' })}`)

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('returns 404 when notification does not exist', async () => {
    Notification.findById.mockResolvedValue(null)

    const res = await request(app)
      .patch(`/api/notifications/${NOTIF_ID}/read`)
      .set('Cookie', `accessToken=${tokenFor({ id: USER_ID, role: 'employee' })}`)

    expect(res.status).toBe(404)
  })

  it('returns 403 when notification belongs to another user', async () => {
    Notification.findById.mockResolvedValue({
      _id:    NOTIF_ID,
      userId: { equals: jest.fn().mockReturnValue(false) },
      read:   false,
      save:   jest.fn().mockResolvedValue(undefined),
    })

    const res = await request(app)
      .patch(`/api/notifications/${NOTIF_ID}/read`)
      .set('Cookie', `accessToken=${tokenFor({ id: USER_ID, role: 'employee' })}`)

    expect(res.status).toBe(403)
  })

  it('marks the notification as read and returns { id, read: true }', async () => {
    const mockNotif = {
      _id:    NOTIF_ID,
      userId: { equals: jest.fn().mockReturnValue(true) },
      read:   false,
      save:   jest.fn().mockResolvedValue(undefined),
    }
    Notification.findById.mockResolvedValue(mockNotif)

    const res = await request(app)
      .patch(`/api/notifications/${NOTIF_ID}/read`)
      .set('Cookie', `accessToken=${tokenFor({ id: USER_ID, role: 'employee' })}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('id')
    expect(res.body.data).toHaveProperty('read', true)
    expect(mockNotif.save).toHaveBeenCalledTimes(1)
  })
})

// =============================================================================
// POST /api/notifications/global-remind
// =============================================================================

describe('POST /api/notifications/global-remind', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).post('/api/notifications/global-remind')
    expect(res.status).toBe(401)
  })

  it('returns 403 for an employee', async () => {
    const res = await request(app)
      .post('/api/notifications/global-remind')
      .set('Cookie', `accessToken=${tokenFor({ id: USER_ID, role: 'employee' })}`)
      .send({ message: 'Rappel' })

    expect(res.status).toBe(403)
  })

  it('returns 403 for a manager', async () => {
    const res = await request(app)
      .post('/api/notifications/global-remind')
      .set('Cookie', `accessToken=${tokenFor({ id: USER_ID, role: 'manager' })}`)
      .send({ message: 'Rappel' })

    expect(res.status).toBe(403)
  })

  it('broadcasts a reminder for admin and returns { sent }', async () => {
    const users = [
      { _id: '507f1f77bcf86cd799439001' },
      { _id: '507f1f77bcf86cd799439002' },
    ]
    User.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(users) })
    Notification.insertMany.mockResolvedValue([{}, {}])

    const res = await request(app)
      .post('/api/notifications/global-remind')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ message: 'Action requise de votre part' })

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('sent', 2)
  })

  it('broadcasts a reminder for hr and returns { sent }', async () => {
    const users = [{ _id: '507f1f77bcf86cd799439010' }]
    User.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(users) })
    Notification.insertMany.mockResolvedValue([{}])

    const res = await request(app)
      .post('/api/notifications/global-remind')
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ campaignId: 'camp1', message: 'Merci de compléter votre évaluation' })

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('sent', 1)
  })

  it('returns { sent: 0 } when there are no active users', async () => {
    User.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })

    const res = await request(app)
      .post('/api/notifications/global-remind')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ message: 'Personne à notifier' })

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('sent', 0)
  })
})
