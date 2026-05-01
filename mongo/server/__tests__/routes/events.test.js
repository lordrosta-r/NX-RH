'use strict'

// =============================================================================
// routes/events.js — integration tests (no real DB)
//
// ADMIN_ROLES = ['admin', 'hr']  (from config/constants.js)
// • POST / PATCH / DELETE: ADMIN_ROLES check → director/manager/employee get 403
// • GET /: admin+hr see ALL events; everyone else gets $or filter on targetRoles
// • GET /:id: admin+hr bypass targetRoles; others need role in targetRoles or []
// =============================================================================

const jwt = require('jsonwebtoken')

// ─── Mock: models ─────────────────────────────────────────────────────────────
jest.mock('../../models', () => {
  // makeChain defined inside factory (jest.mock is hoisted — cannot close over
  // outer-scope variables defined at module level).
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

  // MockEvent doubles as a constructor (PATCH mutates the instance via .save())
  // and a static-method container (find / findById / etc.).
  function MockEvent(data) { Object.assign(this, data) }
  MockEvent.prototype.save = jest.fn().mockResolvedValue(undefined)

  MockEvent.find            = jest.fn(() => makeChain([]))
  MockEvent.findById        = jest.fn()
  MockEvent.countDocuments  = jest.fn().mockResolvedValue(0)
  MockEvent.create          = jest.fn()
  MockEvent.findByIdAndDelete = jest.fn()

  return { Event: MockEvent }
})

// ─── Mock: authGuard ─────────────────────────────────────────────────────────
jest.mock('../../middleware/authGuard', () => ({
  authGuard: (roles = []) => (req, res, next) => {
    const _jwt = require('jsonwebtoken')
    const token = req.cookies?.token
    if (!token) return res.status(401).json({ error: 'Authentication required' })
    try {
      const payload = _jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
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

const SECRET = 'test-secret-long-enough-for-hs256-algorithm'
process.env.JWT_SECRET = SECRET
process.env.NODE_ENV   = 'test'

const { Event }        = require('../../models')
const request          = require('supertest')
const express          = require('express')
const cookieParser     = require('cookie-parser')
const { authGuard }    = require('../../middleware/authGuard')
const eventsRouter     = require('../../routes/events')

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ADMIN_ID    = '507f1f77bcf86cd799439001'
const HR_ID       = '507f1f77bcf86cd799439002'
const DIRECTOR_ID = '507f1f77bcf86cd799439003'
const MANAGER_ID  = '507f1f77bcf86cd799439004'
const EMPLOYEE_ID = '507f1f77bcf86cd799439005'
const EVENT_ID    = '507f1f77bcf86cd799439010'

function tokenFor({ id, role }) {
  return jwt.sign({ id, email: `${role}@corp.com`, role }, SECRET, {
    algorithm: 'HS256',
    expiresIn: '1h',
  })
}

// Returns a chainable stub for findById that:
//   • resolves directly when awaited   (PATCH: `await Event.findById(id)`)
//   • also exposes .lean() that resolves (GET /:id: `await Event.findById(id).lean()`)
function makeThenable(result) {
  return {
    lean: jest.fn().mockResolvedValue(result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (fn) => Promise.resolve(result).catch(fn),
  }
}

// Returns a minimal Event document with a save() spy.
function mockEventDoc(overrides = {}) {
  return {
    _id:         EVENT_ID,
    title:       'Test Event',
    date:        new Date('2025-06-01').toISOString(),
    type:        'meeting',
    targetRoles: [],
    description: '',
    save:        jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use(
    '/api/events',
    authGuard(['admin', 'hr', 'director', 'manager', 'employee']),
    eventsRouter,
  )
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
  })
  return app
}

const app = buildApp()

// ─── GET /api/events ──────────────────────────────────────────────────────────

describe('GET /api/events', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/events')
    expect(res.status).toBe(401)
  })

  it('admin sees all events — find called with empty query {}', async () => {
    Event.find = jest.fn(() => ({
      sort:  jest.fn().mockReturnThis(),
      skip:  jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean:  jest.fn().mockResolvedValue([]),
    }))
    Event.countDocuments = jest.fn().mockResolvedValue(0)

    const res = await request(app)
      .get('/api/events')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    expect(res.status).toBe(200)
    expect(Event.find).toHaveBeenCalledWith({})
    expect(res.body).toMatchObject({ data: [], total: 0 })
  })

  it('hr sees all events — find called with empty query {}', async () => {
    Event.find = jest.fn(() => ({
      sort:  jest.fn().mockReturnThis(),
      skip:  jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean:  jest.fn().mockResolvedValue([]),
    }))
    Event.countDocuments = jest.fn().mockResolvedValue(0)

    const res = await request(app)
      .get('/api/events')
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)

    expect(res.status).toBe(200)
    expect(Event.find).toHaveBeenCalledWith({})
  })

  it('employee GET / has $or filter targeting their role', async () => {
    Event.find = jest.fn(() => ({
      sort:  jest.fn().mockReturnThis(),
      skip:  jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean:  jest.fn().mockResolvedValue([]),
    }))
    Event.countDocuments = jest.fn().mockResolvedValue(0)

    const res = await request(app)
      .get('/api/events')
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)

    expect(res.status).toBe(200)
    expect(Event.find).toHaveBeenCalledWith({
      $or: [
        { targetRoles: { $size: 0 } },
        { targetRoles: 'employee' },
      ],
    })
  })

  it('manager GET / has $or filter targeting their role', async () => {
    Event.find = jest.fn(() => ({
      sort:  jest.fn().mockReturnThis(),
      skip:  jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean:  jest.fn().mockResolvedValue([]),
    }))
    Event.countDocuments = jest.fn().mockResolvedValue(0)

    const res = await request(app)
      .get('/api/events')
      .set('Cookie', `token=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)

    expect(res.status).toBe(200)
    expect(Event.find).toHaveBeenCalledWith({
      $or: [
        { targetRoles: { $size: 0 } },
        { targetRoles: 'manager' },
      ],
    })
  })

  it('director GET / has $or filter targeting their role', async () => {
    Event.find = jest.fn(() => ({
      sort:  jest.fn().mockReturnThis(),
      skip:  jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean:  jest.fn().mockResolvedValue([]),
    }))
    Event.countDocuments = jest.fn().mockResolvedValue(0)

    const res = await request(app)
      .get('/api/events')
      .set('Cookie', `token=${tokenFor({ id: DIRECTOR_ID, role: 'director' })}`)

    expect(res.status).toBe(200)
    expect(Event.find).toHaveBeenCalledWith({
      $or: [
        { targetRoles: { $size: 0 } },
        { targetRoles: 'director' },
      ],
    })
  })

  it('returns pagination metadata in response body', async () => {
    Event.find = jest.fn(() => ({
      sort:  jest.fn().mockReturnThis(),
      skip:  jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean:  jest.fn().mockResolvedValue([]),
    }))
    Event.countDocuments = jest.fn().mockResolvedValue(5)

    const res = await request(app)
      .get('/api/events?page=2&limit=10')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    expect(res.status).toBe(200)
    expect(res.body.page).toBe(2)
    expect(res.body.limit).toBe(10)
    expect(res.body.total).toBe(5)
  })
})

// ─── GET /api/events/:id ──────────────────────────────────────────────────────

describe('GET /api/events/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 400 for a non-ObjectId id', async () => {
    const res = await request(app)
      .get('/api/events/not-a-valid-id')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('returns 404 when the event does not exist', async () => {
    Event.findById = jest.fn().mockReturnValue(makeThenable(null))
    const res = await request(app)
      .get(`/api/events/${EVENT_ID}`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/introuvable/i)
  })

  it('returns 403 when employee role is not in targetRoles', async () => {
    Event.findById = jest.fn().mockReturnValue(
      makeThenable({ _id: EVENT_ID, title: 'Managers Only', targetRoles: ['manager'] }),
    )
    const res = await request(app)
      .get(`/api/events/${EVENT_ID}`)
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/refus/i)
  })

  it('returns 403 when director role is not in targetRoles', async () => {
    Event.findById = jest.fn().mockReturnValue(
      makeThenable({ _id: EVENT_ID, title: 'HR Only', targetRoles: ['hr'] }),
    )
    const res = await request(app)
      .get(`/api/events/${EVENT_ID}`)
      .set('Cookie', `token=${tokenFor({ id: DIRECTOR_ID, role: 'director' })}`)
    expect(res.status).toBe(403)
  })

  it('returns 200 when employee and targetRoles is empty (open to all)', async () => {
    Event.findById = jest.fn().mockReturnValue(
      makeThenable({ _id: EVENT_ID, title: 'Open Event', targetRoles: [] }),
    )
    const res = await request(app)
      .get(`/api/events/${EVENT_ID}`)
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Open Event')
  })

  it('returns 200 when employee role is in targetRoles', async () => {
    Event.findById = jest.fn().mockReturnValue(
      makeThenable({ _id: EVENT_ID, title: 'Employee Event', targetRoles: ['employee', 'manager'] }),
    )
    const res = await request(app)
      .get(`/api/events/${EVENT_ID}`)
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(200)
  })

  it('admin bypasses targetRoles check and sees any event', async () => {
    Event.findById = jest.fn().mockReturnValue(
      makeThenable({ _id: EVENT_ID, title: 'HR Internal', targetRoles: ['hr'] }),
    )
    const res = await request(app)
      .get(`/api/events/${EVENT_ID}`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('HR Internal')
  })

  it('hr bypasses targetRoles check and sees any event', async () => {
    Event.findById = jest.fn().mockReturnValue(
      makeThenable({ _id: EVENT_ID, title: 'Manager Meeting', targetRoles: ['manager'] }),
    )
    const res = await request(app)
      .get(`/api/events/${EVENT_ID}`)
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
    expect(res.status).toBe(200)
  })
})

// ─── POST /api/events ─────────────────────────────────────────────────────────

describe('POST /api/events', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 403 for an employee', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ title: 'New Event', date: '2025-06-01' })
    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/refus/i)
  })

  it('returns 403 for a manager', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Cookie', `token=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
      .send({ title: 'New Event', date: '2025-06-01' })
    expect(res.status).toBe(403)
  })

  it('returns 403 for a director', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Cookie', `token=${tokenFor({ id: DIRECTOR_ID, role: 'director' })}`)
      .send({ title: 'New Event', date: '2025-06-01' })
    expect(res.status).toBe(403)
  })

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ date: '2025-06-01' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/title/i)
  })

  it('returns 400 when date is missing', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'Test' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/date/i)
  })

  it('returns 400 when both title and date are missing', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({})
    expect(res.status).toBe(400)
  })

  it('returns 201 when admin creates a valid event', async () => {
    const created = { _id: EVENT_ID, title: 'Launch', date: '2025-06-01', createdBy: ADMIN_ID }
    Event.create = jest.fn().mockResolvedValue(created)

    const res = await request(app)
      .post('/api/events')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'Launch', date: '2025-06-01', type: 'campaign' })

    expect(res.status).toBe(201)
    expect(res.body._id).toBe(EVENT_ID)
    expect(res.body.title).toBe('Launch')
  })

  it('returns 201 when hr creates a valid event', async () => {
    const created = { _id: EVENT_ID, title: 'HR Meeting', date: '2025-07-15', createdBy: HR_ID }
    Event.create = jest.fn().mockResolvedValue(created)

    const res = await request(app)
      .post('/api/events')
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ title: 'HR Meeting', date: '2025-07-15' })

    expect(res.status).toBe(201)
    expect(res.body.title).toBe('HR Meeting')
  })

  it('passes createdBy from req.user.id to Event.create', async () => {
    Event.create = jest.fn().mockResolvedValue({ _id: EVENT_ID, title: 'Check', date: '2025-01-01', createdBy: ADMIN_ID })

    await request(app)
      .post('/api/events')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'Check', date: '2025-01-01' })

    expect(Event.create).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: ADMIN_ID }),
    )
  })
})

// ─── PATCH /api/events/:id ────────────────────────────────────────────────────

describe('PATCH /api/events/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 403 for an employee', async () => {
    const res = await request(app)
      .patch(`/api/events/${EVENT_ID}`)
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ title: 'New Title' })
    expect(res.status).toBe(403)
  })

  it('returns 403 for a manager', async () => {
    const res = await request(app)
      .patch(`/api/events/${EVENT_ID}`)
      .set('Cookie', `token=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
      .send({ title: 'New Title' })
    expect(res.status).toBe(403)
  })

  it('returns 403 for a director', async () => {
    const res = await request(app)
      .patch(`/api/events/${EVENT_ID}`)
      .set('Cookie', `token=${tokenFor({ id: DIRECTOR_ID, role: 'director' })}`)
      .send({ title: 'New Title' })
    expect(res.status).toBe(403)
  })

  it('returns 400 for a non-ObjectId id', async () => {
    const res = await request(app)
      .patch('/api/events/not-a-valid-id')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'New' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('returns 404 when event does not exist', async () => {
    Event.findById = jest.fn().mockReturnValue(makeThenable(null))
    const res = await request(app)
      .patch(`/api/events/${EVENT_ID}`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'Updated' })
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/introuvable/i)
  })

  it('returns 200 and updates title when admin patches an event', async () => {
    const doc = mockEventDoc({ title: 'Old Title' })
    Event.findById = jest.fn().mockReturnValue(makeThenable(doc))

    const res = await request(app)
      .patch(`/api/events/${EVENT_ID}`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'New Title' })

    expect(res.status).toBe(200)
    expect(doc.title).toBe('New Title')
    expect(doc.save).toHaveBeenCalledTimes(1)
  })

  it('returns 200 and updates targetRoles when hr patches an event', async () => {
    const doc = mockEventDoc({ targetRoles: [] })
    Event.findById = jest.fn().mockReturnValue(makeThenable(doc))

    const res = await request(app)
      .patch(`/api/events/${EVENT_ID}`)
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ targetRoles: ['manager', 'director'] })

    expect(res.status).toBe(200)
    expect(doc.targetRoles).toEqual(['manager', 'director'])
    expect(doc.save).toHaveBeenCalled()
  })

  it('only updates fields that are provided (other fields unchanged)', async () => {
    const doc = mockEventDoc({ title: 'Keep Me', date: '2025-01-01', description: 'original' })
    Event.findById = jest.fn().mockReturnValue(makeThenable(doc))

    await request(app)
      .patch(`/api/events/${EVENT_ID}`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ description: 'updated desc' })

    // title and date unchanged
    expect(doc.title).toBe('Keep Me')
    expect(doc.date).toBe('2025-01-01')
    expect(doc.description).toBe('updated desc')
  })
})

// ─── DELETE /api/events/:id ───────────────────────────────────────────────────

describe('DELETE /api/events/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 403 for an employee', async () => {
    const res = await request(app)
      .delete(`/api/events/${EVENT_ID}`)
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(403)
  })

  it('returns 403 for a manager', async () => {
    const res = await request(app)
      .delete(`/api/events/${EVENT_ID}`)
      .set('Cookie', `token=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
    expect(res.status).toBe(403)
  })

  it('returns 403 for a director', async () => {
    const res = await request(app)
      .delete(`/api/events/${EVENT_ID}`)
      .set('Cookie', `token=${tokenFor({ id: DIRECTOR_ID, role: 'director' })}`)
    expect(res.status).toBe(403)
  })

  it('returns 400 for a non-ObjectId id', async () => {
    const res = await request(app)
      .delete('/api/events/bad-id')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('returns 404 when event does not exist', async () => {
    Event.findByIdAndDelete = jest.fn().mockResolvedValue(null)
    const res = await request(app)
      .delete(`/api/events/${EVENT_ID}`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/introuvable/i)
  })

  it('returns 204 when admin deletes an existing event', async () => {
    Event.findByIdAndDelete = jest.fn().mockResolvedValue({ _id: EVENT_ID })
    const res = await request(app)
      .delete(`/api/events/${EVENT_ID}`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(204)
    expect(res.text).toBe('')
  })

  it('returns 204 when hr deletes an existing event', async () => {
    Event.findByIdAndDelete = jest.fn().mockResolvedValue({ _id: EVENT_ID })
    const res = await request(app)
      .delete(`/api/events/${EVENT_ID}`)
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
    expect(res.status).toBe(204)
  })

  it('calls Event.findByIdAndDelete with the correct id', async () => {
    Event.findByIdAndDelete = jest.fn().mockResolvedValue({ _id: EVENT_ID })
    await request(app)
      .delete(`/api/events/${EVENT_ID}`)
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(Event.findByIdAndDelete).toHaveBeenCalledWith(EVENT_ID)
  })
})
