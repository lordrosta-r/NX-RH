'use strict'

// Resources route integration tests — no real MongoDB connection.
// Models are mocked; authGuard is mocked with inline JWT verification.
// config/constants is NOT mocked — the real ADMIN_ROLES = ['admin', 'hr'] is used.
//
// Route handlers tested:
//   GET    /api/resources
//   GET    /api/resources/:id
//   POST   /api/resources
//   PATCH  /api/resources/:id
//   DELETE /api/resources/:id

const jwt = require('jsonwebtoken')

// ─── Chainable Mongoose query stub ───────────────────────────────────────────
// Used in test bodies for .find().sort().lean() and .findById().lean()
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

// ─── Model mock — ../../models ────────────────────────────────────────────────
// resources.js imports { Resource } from '../models' (the main index).
// Constants must be declared inside the factory because jest.mock() is hoisted
// before any module-level code and cannot close over outer-scope variables.

jest.mock('../../models', () => {
  function _makeChain(r) {
    return {
      select:   jest.fn().mockReturnThis(),
      sort:     jest.fn().mockReturnThis(),
      skip:     jest.fn().mockReturnThis(),
      limit:    jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean:     jest.fn().mockResolvedValue(r),
    }
  }

  function MockResource(data) { Object.assign(this, data) }
  MockResource.prototype.save  = jest.fn().mockResolvedValue(undefined)
  MockResource.find              = jest.fn(() => _makeChain([]))
  MockResource.findById          = jest.fn()
  MockResource.countDocuments    = jest.fn().mockResolvedValue(0)
  MockResource.create            = jest.fn()
  MockResource.findByIdAndDelete = jest.fn()

  // Other models the index may export — stub them to avoid reference errors
  return { Resource: MockResource }
})

jest.mock('../../middleware/authGuard', () => ({
  authGuard: (roles = []) => (req, res, next) => {
    const _jwt = require('jsonwebtoken')
    const token = req.cookies?.accessToken
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

const { Resource }    = require('../../models')
const supertest       = require('supertest')
const express         = require('express')
const cookieParser    = require('cookie-parser')
const { authGuard }   = require('../../middleware/authGuard')
const resourcesRouter = require('../../routes/resources')

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ADMIN_ID    = '507f1f77bcf86cd799439001'
const HR_ID       = '507f1f77bcf86cd799439002'
const MANAGER_ID  = '507f1f77bcf86cd799439003'
const EMPLOYEE_ID = '507f1f77bcf86cd799439004'
const INVALID_ROLE_ID = '507f1f77bcf86cd799439005'
const RESOURCE_ID = '507f1f77bcf86cd799439011'

function tokenFor({ id, role }) {
  return jwt.sign({ id, email: `${role}@corp.com`, role }, SECRET, {
    algorithm: 'HS256', expiresIn: '1h',
  })
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  // All authenticated roles can reach the router; write operations are gated
  // internally by ADMIN_ROLES check (admin + hr).
  app.use(
    '/api/resources',
    authGuard(['admin', 'hr', 'manager', 'employee']),
    resourcesRouter,
  )
  // Minimal error handler to avoid leaking HTML on unexpected errors
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' })
  })
  return app
}

// Returns a plain object that mimics a saved Resource document.
// Has a jest-mocked .save() so PATCH tests can assert it was called.
function mockResourceDoc(overrides = {}) {
  return {
    _id:       RESOURCE_ID,
    title:     'Test Resource',
    type:      'pdf',
    filename:  'test.pdf',
    status:    'published',
    visibleTo: ['employee', 'manager'],
    createdBy: ADMIN_ID,
    save:      jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

const app = buildApp()

// ─── GET /api/resources ───────────────────────────────────────────────────────

describe('GET /api/resources', () => {
  beforeEach(() => jest.clearAllMocks())

  it('401 when no token is provided', async () => {
    const res = await supertest(app).get('/api/resources')
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/authentication required/i)
  })

  it('admin sees all resources — no status or visibleTo filter', async () => {
    Resource.find = jest.fn(() => makeChain([{ _id: RESOURCE_ID, status: 'draft' }]))
    Resource.countDocuments = jest.fn().mockResolvedValue(1)

    const res = await supertest(app)
      .get('/api/resources')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    expect(res.status).toBe(200)
    const [filter] = Resource.find.mock.calls[0]
    expect(filter.status).toBeUndefined()
    expect(filter.visibleTo).toBeUndefined()
  })

  it('hr sees all resources — no status or visibleTo filter', async () => {
    Resource.find = jest.fn(() => makeChain([]))
    Resource.countDocuments = jest.fn().mockResolvedValue(0)

    const res = await supertest(app)
      .get('/api/resources')
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)

    expect(res.status).toBe(200)
    const [filter] = Resource.find.mock.calls[0]
    expect(filter.status).toBeUndefined()
    expect(filter.visibleTo).toBeUndefined()
  })

  it('employee sees only published resources where visibleTo includes "employee"', async () => {
    Resource.find = jest.fn(() => makeChain([]))
    Resource.countDocuments = jest.fn().mockResolvedValue(0)

    await supertest(app)
      .get('/api/resources')
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)

    const [filter] = Resource.find.mock.calls[0]
    expect(filter.status).toBe('published')
    expect(filter.visibleTo).toBe('employee')
  })

  it('manager sees only published resources where visibleTo includes "manager"', async () => {
    Resource.find = jest.fn(() => makeChain([]))
    Resource.countDocuments = jest.fn().mockResolvedValue(0)

    await supertest(app)
      .get('/api/resources')
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)

    const [filter] = Resource.find.mock.calls[0]
    expect(filter.status).toBe('published')
    expect(filter.visibleTo).toBe('manager')
  })

  it('returns 403 for unknown role (not in authGuard list)', async () => {
    const res = await supertest(app)
      .get('/api/resources')
      .set('Cookie', `accessToken=${tokenFor({ id: INVALID_ROLE_ID, role: 'invalid_role' })}`)

    expect(res.status).toBe(403)
  })

  it('returns correct pagination metadata when ?page=2&limit=10', async () => {
    Resource.find = jest.fn(() => makeChain([]))
    Resource.countDocuments = jest.fn().mockResolvedValue(42)

    const res = await supertest(app)
      .get('/api/resources?page=2&limit=10')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    expect(res.status).toBe(200)
    expect(res.body.total).toBe(42)
    expect(res.body.page).toBe(2)
    expect(res.body.limit).toBe(10)
  })
})

// ─── GET /api/resources/:id ───────────────────────────────────────────────────

describe('GET /api/resources/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('400 for an invalid ObjectId', async () => {
    const res = await supertest(app)
      .get('/api/resources/not-a-valid-id')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('404 when the resource is not found', async () => {
    Resource.findById = jest.fn(() => makeChain(null))

    const res = await supertest(app)
      .get(`/api/resources/${RESOURCE_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/introuvable/i)
  })

  it('403 — employee tries to access a draft resource', async () => {
    Resource.findById = jest.fn(() => makeChain({
      _id: RESOURCE_ID, status: 'draft', visibleTo: ['employee', 'manager'],
    }))

    const res = await supertest(app)
      .get(`/api/resources/${RESOURCE_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/refusé/i)
  })

  it('403 — employee role not in visibleTo of a published resource', async () => {
    Resource.findById = jest.fn(() => makeChain({
      _id: RESOURCE_ID, status: 'published', visibleTo: ['manager'],
    }))

    const res = await supertest(app)
      .get(`/api/resources/${RESOURCE_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)

    expect(res.status).toBe(403)
  })

  it('403 — manager role not in visibleTo even if resource is published', async () => {
    Resource.findById = jest.fn(() => makeChain({
      _id: RESOURCE_ID, status: 'published', visibleTo: ['employee'],
    }))

    const res = await supertest(app)
      .get(`/api/resources/${RESOURCE_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)

    expect(res.status).toBe(403)
  })

  it('200 — admin accesses a draft resource without restriction', async () => {
    Resource.findById = jest.fn(() => makeChain({
      _id: RESOURCE_ID, status: 'draft', visibleTo: [],
    }))

    const res = await supertest(app)
      .get(`/api/resources/${RESOURCE_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    expect(res.status).toBe(200)
    expect(res.body._id).toBe(RESOURCE_ID)
  })

  it('200 — hr accesses a draft resource without restriction', async () => {
    Resource.findById = jest.fn(() => makeChain({
      _id: RESOURCE_ID, status: 'draft', visibleTo: [],
    }))

    const res = await supertest(app)
      .get(`/api/resources/${RESOURCE_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)

    expect(res.status).toBe(200)
  })

  it('200 — employee accesses published resource with their role in visibleTo', async () => {
    Resource.findById = jest.fn(() => makeChain({
      _id: RESOURCE_ID, status: 'published', visibleTo: ['employee', 'manager'],
    }))

    const res = await supertest(app)
      .get(`/api/resources/${RESOURCE_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('published')
  })
})

// ─── POST /api/resources ──────────────────────────────────────────────────────

describe('POST /api/resources', () => {
  beforeEach(() => jest.clearAllMocks())

  it('403 for employee (not in ADMIN_ROLES)', async () => {
    const res = await supertest(app)
      .post('/api/resources')
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ title: 'Doc', type: 'pdf', filename: 'doc.pdf' })

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/refusé/i)
  })

  it('403 for manager (not in ADMIN_ROLES)', async () => {
    const res = await supertest(app)
      .post('/api/resources')
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
      .send({ title: 'Doc', type: 'pdf', filename: 'doc.pdf' })

    expect(res.status).toBe(403)
  })

  it('403 for unknown role (not in authGuard list)', async () => {
    const res = await supertest(app)
      .post('/api/resources')
      .set('Cookie', `accessToken=${tokenFor({ id: INVALID_ROLE_ID, role: 'invalid_role' })}`)
      .send({ title: 'Doc', type: 'pdf', filename: 'doc.pdf' })

    expect(res.status).toBe(403)
  })

  it('400 when title is missing', async () => {
    const res = await supertest(app)
      .post('/api/resources')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ type: 'pdf', filename: 'doc.pdf' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/requis/i)
  })

  it('400 when type is missing', async () => {
    const res = await supertest(app)
      .post('/api/resources')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'Document', filename: 'doc.pdf' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/requis/i)
  })

  it('400 when filename is missing', async () => {
    const res = await supertest(app)
      .post('/api/resources')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'Document', type: 'pdf' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/requis/i)
  })

  it('400 — filename contains ".." (path traversal)', async () => {
    const res = await supertest(app)
      .post('/api/resources')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'Doc', type: 'pdf', filename: '../etc/passwd' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('400 — filename with a space (fails /^[a-zA-Z0-9_\\-.]+$/ pattern)', async () => {
    const res = await supertest(app)
      .post('/api/resources')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'Doc', type: 'pdf', filename: 'file name.pdf' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('400 — filename with special character @ (fails regex)', async () => {
    const res = await supertest(app)
      .post('/api/resources')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'Doc', type: 'pdf', filename: 'report@2025.pdf' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('201 — admin creates a resource', async () => {
    Resource.create = jest.fn().mockResolvedValue({
      _id: RESOURCE_ID, title: 'Company Policy', type: 'pdf', filename: 'policy.pdf',
    })

    const res = await supertest(app)
      .post('/api/resources')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'Company Policy', type: 'pdf', filename: 'policy.pdf' })

    expect(res.status).toBe(201)
    expect(Resource.create).toHaveBeenCalledWith(expect.objectContaining({
      title:     'Company Policy',
      filename:  'policy.pdf',
      createdBy: ADMIN_ID,
    }))
  })

  it('201 — hr creates a resource', async () => {
    Resource.create = jest.fn().mockResolvedValue({
      _id: RESOURCE_ID, title: 'HR Handbook', type: 'docx', filename: 'hr-handbook.docx',
    })

    const res = await supertest(app)
      .post('/api/resources')
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ title: 'HR Handbook', type: 'docx', filename: 'hr-handbook.docx' })

    expect(res.status).toBe(201)
    expect(Resource.create).toHaveBeenCalledWith(expect.objectContaining({
      createdBy: HR_ID,
    }))
  })
})

// ─── PATCH /api/resources/:id ─────────────────────────────────────────────────

describe('PATCH /api/resources/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('403 for employee', async () => {
    const res = await supertest(app)
      .patch(`/api/resources/${RESOURCE_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ title: 'New Title' })

    expect(res.status).toBe(403)
  })

  it('403 for manager', async () => {
    const res = await supertest(app)
      .patch(`/api/resources/${RESOURCE_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
      .send({ title: 'New Title' })

    expect(res.status).toBe(403)
  })

  it('400 for an invalid ObjectId', async () => {
    const res = await supertest(app)
      .patch('/api/resources/not-valid')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'New Title' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('404 when the resource is not found', async () => {
    Resource.findById = jest.fn().mockResolvedValue(null)

    const res = await supertest(app)
      .patch(`/api/resources/${RESOURCE_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'New Title' })

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/introuvable/i)
  })

  it('200 — admin updates title and save() is called', async () => {
    const doc = mockResourceDoc()
    Resource.findById = jest.fn().mockResolvedValue(doc)

    const res = await supertest(app)
      .patch(`/api/resources/${RESOURCE_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'Updated Title' })

    expect(res.status).toBe(200)
    expect(doc.save).toHaveBeenCalled()
    expect(doc.title).toBe('Updated Title')
  })

  it('200 — hr updates status to published', async () => {
    const doc = mockResourceDoc({ status: 'draft' })
    Resource.findById = jest.fn().mockResolvedValue(doc)

    const res = await supertest(app)
      .patch(`/api/resources/${RESOURCE_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ status: 'published' })

    expect(res.status).toBe(200)
    expect(doc.status).toBe('published')
  })

  it('filename is NOT editable — only allowed fields are applied', async () => {
    const doc = mockResourceDoc({ filename: 'original.pdf' })
    Resource.findById = jest.fn().mockResolvedValue(doc)

    await supertest(app)
      .patch(`/api/resources/${RESOURCE_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ title: 'New', filename: 'hacked.pdf' })

    // filename is not in the allowed list ['title','description','status','visibleTo']
    expect(doc.filename).toBe('original.pdf')
    expect(doc.title).toBe('New')
  })

  it('200 — admin updates visibleTo array', async () => {
    const doc = mockResourceDoc({ visibleTo: ['employee'] })
    Resource.findById = jest.fn().mockResolvedValue(doc)

    const res = await supertest(app)
      .patch(`/api/resources/${RESOURCE_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ visibleTo: ['employee', 'manager'] })

    expect(res.status).toBe(200)
    expect(doc.visibleTo).toEqual(['employee', 'manager'])
  })
})

// ─── DELETE /api/resources/:id ────────────────────────────────────────────────

describe('DELETE /api/resources/:id', () => {
  beforeEach(() => jest.clearAllMocks())

  it('403 for employee', async () => {
    const res = await supertest(app)
      .delete(`/api/resources/${RESOURCE_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/refusé/i)
  })

  it('403 for manager', async () => {
    const res = await supertest(app)
      .delete(`/api/resources/${RESOURCE_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)

    expect(res.status).toBe(403)
  })

  it('400 for an invalid ObjectId', async () => {
    const res = await supertest(app)
      .delete('/api/resources/not-valid')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/invalide/i)
  })

  it('404 when the resource does not exist', async () => {
    Resource.findByIdAndDelete = jest.fn().mockResolvedValue(null)

    const res = await supertest(app)
      .delete(`/api/resources/${RESOURCE_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/introuvable/i)
  })

  it('204 — admin deletes a resource, body is empty', async () => {
    Resource.findByIdAndDelete = jest.fn().mockResolvedValue({ _id: RESOURCE_ID })

    const res = await supertest(app)
      .delete(`/api/resources/${RESOURCE_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)

    expect(res.status).toBe(204)
    expect(res.body).toEqual({})
  })

  it('204 — hr deletes a resource', async () => {
    Resource.findByIdAndDelete = jest.fn().mockResolvedValue({ _id: RESOURCE_ID })

    const res = await supertest(app)
      .delete(`/api/resources/${RESOURCE_ID}`)
      .set('Cookie', `accessToken=${tokenFor({ id: HR_ID, role: 'hr' })}`)

    expect(res.status).toBe(204)
    expect(Resource.findByIdAndDelete).toHaveBeenCalledWith(RESOURCE_ID)
  })
})
