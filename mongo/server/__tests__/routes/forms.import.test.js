'use strict'

// forms.import.test.js — Tests for forms import/export endpoints:
//   POST   /api/forms/import         → import JSON form
//   GET    /api/forms/template       → download empty template
//   GET    /api/forms/:id/export     → export existing form
// Models are mocked; no real DB.

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../models/Form')

jest.mock('../../middleware/authGuard', () => ({
  authGuard: (roles = []) => (req, res, next) => {
    const jwt   = require('jsonwebtoken')
    const token = req.cookies?.accessToken
    if (!token) return res.status(401).json({ error: 'Authentication required' })
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
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

// ─── Imports (after mocks) ────────────────────────────────────────────────────

const jwt            = require('jsonwebtoken')
const request        = require('supertest')
const express        = require('express')
const cookieParser   = require('cookie-parser')
const mongoose       = require('mongoose')
const { authGuard }  = require('../../middleware/authGuard')
const importRouter   = require('../../routes/forms/importExport')
const Form           = require('../../models/Form')

const SECRET = 'test-secret-long-enough-for-hs256-algorithm'
process.env.JWT_SECRET = SECRET
process.env.NODE_ENV   = 'test'

// ─── App builder ──────────────────────────────────────────────────────────────

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/forms/template',   authGuard(['admin', 'hr']), importRouter)
  app.use('/api/forms/import',     authGuard(['admin', 'hr']), importRouter)
  app.use('/api/forms/:id/export', authGuard(['admin', 'hr']), importRouter)
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
  })
  return app
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FAKE_ID = new mongoose.Types.ObjectId().toString()

function token(role = 'hr') {
  return jwt.sign(
    { id: 'user-abc', role, firstName: 'Marie', lastName: 'Test' },
    SECRET,
    { algorithm: 'HS256', expiresIn: '1h' },
  )
}

function validForm() {
  return {
    title:    'Formulaire annuel auto-évaluation',
    formType: 'self_evaluation',
    questions: [
      { id: 'q1', type: 'text',   label: 'Décrivez vos réussites' },
      { id: 'q2', type: 'rating', label: 'Note sur 5', scale: 5 },
    ],
  }
}

// ─── Tests: POST /api/forms/import ───────────────────────────────────────────

describe('POST /api/forms/import', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
    Form.mockImplementation(function (data) {
      Object.assign(this, data)
      this.save = jest.fn().mockResolvedValue(this)
      this.toObject = jest.fn().mockReturnValue({ ...data, _id: FAKE_ID })
    })
  })

  it('should return 401 without token', async () => {
    const res = await request(app).post('/api/forms/import').send(validForm())
    expect(res.status).toBe(401)
  })

  it('should return 403 for employee role', async () => {
    const res = await request(app)
      .post('/api/forms/import')
      .set('Cookie', `accessToken=${token('employee')}`)
      .send(validForm())
    expect(res.status).toBe(403)
  })

  it('should import a valid form and return 201', async () => {
    const res = await request(app)
      .post('/api/forms/import')
      .set('Cookie', `accessToken=${token('hr')}`)
      .send(validForm())
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('imported', 1)
    expect(res.body).toHaveProperty('skipped', 0)
    expect(res.body.errors).toEqual([])
    expect(res.body.form).toHaveProperty('title', 'Formulaire annuel auto-évaluation')
    expect(res.body.form).toHaveProperty('formType', 'self_evaluation')
  })

  it('should return 400 when title is missing', async () => {
    const body = { ...validForm(), title: '' }
    const res = await request(app)
      .post('/api/forms/import')
      .set('Cookie', `accessToken=${token('hr')}`)
      .send(body)
    expect(res.status).toBe(400)
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'title' })]),
    )
  })

  it('should return 400 when formType is invalid', async () => {
    const body = { ...validForm(), formType: 'invalid_type' }
    const res = await request(app)
      .post('/api/forms/import')
      .set('Cookie', `accessToken=${token('hr')}`)
      .send(body)
    expect(res.status).toBe(400)
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'formType' })]),
    )
  })

  it('should return 400 when questions is not an array', async () => {
    const body = { ...validForm(), questions: 'not-an-array' }
    const res = await request(app)
      .post('/api/forms/import')
      .set('Cookie', `accessToken=${token('hr')}`)
      .send(body)
    expect(res.status).toBe(400)
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'questions' })]),
    )
  })

  it('should return 400 for question with unknown type', async () => {
    const body = {
      ...validForm(),
      questions: [{ id: 'q1', type: 'unknown_type', label: 'test' }],
    }
    const res = await request(app)
      .post('/api/forms/import')
      .set('Cookie', `accessToken=${token('hr')}`)
      .send(body)
    expect(res.status).toBe(400)
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'questions[0].type' })]),
    )
  })

  it('should return 400 for question missing label', async () => {
    const body = {
      ...validForm(),
      questions: [{ id: 'q1', type: 'text' }],
    }
    const res = await request(app)
      .post('/api/forms/import')
      .set('Cookie', `accessToken=${token('hr')}`)
      .send(body)
    expect(res.status).toBe(400)
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'questions[0].label' })]),
    )
  })

  it('should return 400 for question missing id', async () => {
    const body = {
      ...validForm(),
      questions: [{ type: 'text', label: 'test' }],
    }
    const res = await request(app)
      .post('/api/forms/import')
      .set('Cookie', `accessToken=${token('hr')}`)
      .send(body)
    expect(res.status).toBe(400)
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'questions[0].id' })]),
    )
  })

  it('should return 400 when body is an array', async () => {
    const res = await request(app)
      .post('/api/forms/import')
      .set('Cookie', `accessToken=${token('hr')}`)
      .send([validForm()])
    expect(res.status).toBe(400)
  })

  it('should work for admin role too', async () => {
    const res = await request(app)
      .post('/api/forms/import')
      .set('Cookie', `accessToken=${token('admin')}`)
      .send(validForm())
    expect(res.status).toBe(201)
  })
})

// ─── Tests: GET /api/forms/template ──────────────────────────────────────────

describe('GET /api/forms/template', () => {
  const app = buildApp()

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/forms/template')
    expect(res.status).toBe(401)
  })

  it('should return template JSON with correct Content-Disposition', async () => {
    const res = await request(app)
      .get('/api/forms/template')
      .set('Cookie', `accessToken=${token('hr')}`)
    expect(res.status).toBe(200)
    expect(res.headers['content-disposition']).toContain('form-template.json')
    expect(res.body).toHaveProperty('title')
    expect(res.body).toHaveProperty('formType', 'self_evaluation')
    expect(Array.isArray(res.body.questions)).toBe(true)
    expect(res.body.questions.length).toBeGreaterThan(0)
  })

  it('should include questions covering all main types', async () => {
    const res = await request(app)
      .get('/api/forms/template')
      .set('Cookie', `accessToken=${token('hr')}`)
    const types = res.body.questions.map(q => q.type)
    expect(types).toContain('text')
    expect(types).toContain('rating')
    expect(types).toContain('yes_no')
  })
})

// ─── Tests: GET /api/forms/:id/export ────────────────────────────────────────

describe('GET /api/forms/:id/export', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 without token', async () => {
    const res = await request(app).get(`/api/forms/${FAKE_ID}/export`)
    expect(res.status).toBe(401)
  })

  it('should return 400 for invalid ObjectId', async () => {
    const res = await request(app)
      .get('/api/forms/not-valid-id/export')
      .set('Cookie', `accessToken=${token('hr')}`)
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error', 'ID invalide')
  })

  it('should return 404 when form not found', async () => {
    Form.findById = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) })
    const res = await request(app)
      .get(`/api/forms/${FAKE_ID}/export`)
      .set('Cookie', `accessToken=${token('hr')}`)
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error', 'Formulaire introuvable')
  })

  it('should export a form stripping internal fields', async () => {
    const storedForm = {
      _id:         FAKE_ID,
      title:       'Eval annuelle',
      formType:    'self_evaluation',
      description: 'Description test',
      questions:   [{ id: 'q1', type: 'text', label: 'Q1' }],
      createdBy:   'user-xyz',
      frozenAt:    new Date(),
      __v:         0,
      createdAt:   new Date(),
      updatedAt:   new Date(),
      campaignId:  'camp-abc',
    }
    Form.findById = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(storedForm) })

    const res = await request(app)
      .get(`/api/forms/${FAKE_ID}/export`)
      .set('Cookie', `accessToken=${token('hr')}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-disposition']).toContain('.json')
    expect(res.body).toHaveProperty('title', 'Eval annuelle')
    expect(res.body).not.toHaveProperty('_id')
    expect(res.body).not.toHaveProperty('createdBy')
    expect(res.body).not.toHaveProperty('frozenAt')
    expect(res.body).not.toHaveProperty('__v')
    expect(res.body).not.toHaveProperty('campaignId')
  })
})
