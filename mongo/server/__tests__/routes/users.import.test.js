'use strict'

// users.import.test.js — Unit tests for POST /api/users/import
// Covers: dryRun preview, upsert (create + update), warnings (manager introuvable),
//         validation errors (email invalide, rôle invalide), CSV parsing, empty body.
// No real DB — User and Sector models are mocked.

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../models/User')
jest.mock('../../models/Sector')
jest.mock('bcrypt')
jest.mock('../../services/notificationService', () => ({
  sendToUser: jest.fn().mockResolvedValue(undefined),
}))

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

const jwt          = require('jsonwebtoken')
const bcrypt       = require('bcrypt')
const request      = require('supertest')
const express      = require('express')
const cookieParser = require('cookie-parser')
const { authGuard } = require('../../middleware/authGuard')
const importRouter = require('../../routes/users/import')
const User         = require('../../models/User')
const Sector       = require('../../models/Sector')

const SECRET = 'test-secret-long-enough-for-hs256-algorithm'
process.env.JWT_SECRET = SECRET
process.env.NODE_ENV   = 'test'

// ─── App builder ──────────────────────────────────────────────────────────────

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/users/import', authGuard(['admin', 'hr']), importRouter)
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
  })
  return app
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tokenFor({ id, role }) {
  return jwt.sign({ id, email: `${role}@corp.com`, role }, SECRET, {
    algorithm: 'HS256', expiresIn: '1h',
  })
}

const ADMIN_ID   = '507f1f77bcf86cd799439001'
const MGR_ID     = '507f1f77bcf86cd799439002'
const SECTOR_ID  = '607f1f77bcf86cd799439001'

const ADMIN_TOKEN = tokenFor({ id: ADMIN_ID, role: 'admin' })
const HR_TOKEN    = tokenFor({ id: '507f1f77bcf86cd799439009', role: 'hr' })

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/users/import', () => {
  const app = buildApp()

  beforeEach(() => {
    jest.clearAllMocks()
    bcrypt.hash    = jest.fn().mockResolvedValue('$2b$10$hashedPassword')
    User.find      = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })
    User.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 })
    Sector.find    = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })
  })

  // ── 1. Auth guard ────────────────────────────────────────────────────────────

  it('401 — sans token', async () => {
    const res = await request(app)
      .post('/api/users/import')
      .send([])
    expect(res.status).toBe(401)
  })

  it('403 — rôle insuffisant (employee)', async () => {
    const res = await request(app)
      .post('/api/users/import')
      .set('Cookie', `accessToken=${tokenFor({ id: ADMIN_ID, role: 'employee' })}`)
      .send([])
    expect(res.status).toBe(403)
  })

  // ── 2. Validation du body ────────────────────────────────────────────────────

  it('400 — body JSON non-tableau', async () => {
    const res = await request(app)
      .post('/api/users/import')
      .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
      .set('Content-Type', 'application/json')
      .send({ email: 'test@corp.com' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/tableau/i)
  })

  it('400 — tableau vide → aucune donnée', async () => {
    const res = await request(app)
      .post('/api/users/import')
      .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
      .send([])

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/aucune donn/i)
  })

  it('400 — CSV body vide', async () => {
    const res = await request(app)
      .post('/api/users/import')
      .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
      .set('Content-Type', 'text/csv')
      .send('   ')

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/CSV vide/i)
  })

  // ── 3. dryRun=true — preview sans écriture ───────────────────────────────────

  it('200 — dryRun: retourne preview avec action=create pour utilisateur inexistant', async () => {
    // User.find returns [] → user does not exist → action=create
    const res = await request(app)
      .post('/api/users/import?dryRun=true')
      .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
      .send([{
        email:      'new@corp.com',
        firstName:  'Nouveau',
        lastName:   'User',
        role:       'employee',
        department: 'Engineering',
      }])

    expect(res.status).toBe(200)
    expect(res.body.preview).toHaveLength(1)
    expect(res.body.preview[0].action).toBe('create')
    expect(res.body.preview[0].email).toBe('new@corp.com')
    // Pas d'écriture en dryRun
    expect(res.body.created).toBe(0)
    expect(res.body.updated).toBe(0)
  })

  it('200 — dryRun: action=update pour utilisateur existant', async () => {
    // User.find returns the existing user → action=update
    User.find = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ _id: MGR_ID, email: 'existing@corp.com' }]),
    })

    const res = await request(app)
      .post('/api/users/import?dryRun=true')
      .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
      .send([{
        email:      'existing@corp.com',
        firstName:  'Existing',
        lastName:   'User',
        role:       'manager',
        department: 'Engineering',
      }])

    expect(res.status).toBe(200)
    expect(res.body.preview).toHaveLength(1)
    expect(res.body.preview[0].action).toBe('update')
  })

  // ── 4. Création effective (dryRun=false) ─────────────────────────────────────

  it('200 — crée un nouvel utilisateur et incrémente created', async () => {
    // beforeEach sets User.find → [] (no existing user)

    const savedUser = {
      email: 'newuser@corp.com',
      save:  jest.fn().mockResolvedValue(true),
    }
    User.mockImplementation(() => savedUser)

    const res = await request(app)
      .post('/api/users/import')
      .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
      .send([{
        email:      'newuser@corp.com',
        firstName:  'New',
        lastName:   'User',
        role:       'employee',
        department: 'Engineering',
      }])

    expect(res.status).toBe(200)
    expect(res.body.created).toBe(1)
    expect(res.body.updated).toBe(0)
    expect(res.body.errors).toHaveLength(0)
  })

  it('200 — met à jour un utilisateur existant et incrémente updated', async () => {
    // User.find returns the existing user → update path, no manager email in data
    User.find = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ _id: MGR_ID, email: 'existing@corp.com' }]),
    })

    const res = await request(app)
      .post('/api/users/import')
      .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
      .send([{
        email:      'existing@corp.com',
        firstName:  'Updated',
        lastName:   'Name',
        role:       'manager',
        department: 'Engineering',
      }])

    expect(res.status).toBe(200)
    expect(res.body.updated).toBe(1)
    expect(res.body.created).toBe(0)
    expect(User.updateOne).toHaveBeenCalledWith(
      { email: 'existing@corp.com' },
      { $set: expect.objectContaining({ firstName: 'Updated' }) },
    )
  })

  // ── 5. Erreurs de validation ──────────────────────────────────────────────────

  it('200 — email invalide → erreur dans errors[], skipped++', async () => {
    const res = await request(app)
      .post('/api/users/import')
      .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
      .send([{ email: 'not-valid-email', firstName: 'X', lastName: 'Y', role: 'employee' }])

    expect(res.status).toBe(200)
    expect(res.body.errors).toHaveLength(1)
    expect(res.body.errors[0].field).toBe('email')
    expect(res.body.skipped).toBe(1)
  })

  it('200 — rôle invalide → erreur dans errors[], skipped++', async () => {
    const res = await request(app)
      .post('/api/users/import')
      .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
      .send([{ email: 'user@corp.com', firstName: 'X', lastName: 'Y', role: 'superadmin' }])

    expect(res.status).toBe(200)
    expect(res.body.errors).toHaveLength(1)
    expect(res.body.errors[0].field).toBe('role')
    expect(res.body.skipped).toBe(1)
  })

  it('200 — firstName/lastName manquants pour création → erreur', async () => {
    // beforeEach sets User.find → [] (no existing user)

    const res = await request(app)
      .post('/api/users/import')
      .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
      .send([{ email: 'noname@corp.com', role: 'employee' }])

    expect(res.status).toBe(200)
    expect(res.body.errors).toHaveLength(1)
    expect(res.body.errors[0].field).toMatch(/firstName/)
    expect(res.body.skipped).toBe(1)
  })

  // ── 6. Warnings — manager introuvable ────────────────────────────────────────

  it('200 — managerEmail introuvable → warning ajouté, managerId=null', async () => {
    // User.find returns [] → neither emp@corp.com nor ghost@corp.com found

    const savedUser = {
      email: 'emp@corp.com',
      save:  jest.fn().mockResolvedValue(true),
    }
    User.mockImplementation(() => savedUser)

    const res = await request(app)
      .post('/api/users/import')
      .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
      .send([{
        email:        'emp@corp.com',
        firstName:    'Emp',
        lastName:     'Loyee',
        role:         'employee',
        department:   'Engineering',
        managerEmail: 'ghost@corp.com',
      }])

    expect(res.status).toBe(200)
    expect(res.body.warnings).toHaveLength(1)
    expect(res.body.warnings[0].field).toBe('managerEmail')
    expect(res.body.warnings[0].message).toMatch(/introuvable/i)
    // L'utilisateur est quand même créé
    expect(res.body.created).toBe(1)
  })

  // ── 7. Parsing CSV ────────────────────────────────────────────────────────────

  it('200 — import CSV valide (séparateur virgule)', async () => {
    // beforeEach sets User.find → [] (no existing user)

    const savedUser = { email: 'csv@corp.com', save: jest.fn().mockResolvedValue(true) }
    User.mockImplementation(() => savedUser)

    const csv = [
      'email,firstName,lastName,role,department',
      'csv@corp.com,CSV,User,employee,Engineering',
    ].join('\n')

    const res = await request(app)
      .post('/api/users/import')
      .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
      .set('Content-Type', 'text/csv')
      .send(csv)

    expect(res.status).toBe(200)
    expect(res.body.created).toBe(1)
    expect(res.body.errors).toHaveLength(0)
  })

  it('200 — import CSV valide (séparateur point-virgule)', async () => {
    // beforeEach sets User.find → [] (no existing user)

    const savedUser = { email: 'csv2@corp.com', save: jest.fn().mockResolvedValue(true) }
    User.mockImplementation(() => savedUser)

    const csv = [
      'email;firstName;lastName;role;department',
      'csv2@corp.com;CSV2;User2;employee;Engineering',
    ].join('\n')

    const res = await request(app)
      .post('/api/users/import')
      .set('Cookie', `accessToken=${HR_TOKEN}`)
      .set('Content-Type', 'text/csv')
      .send(csv)

    expect(res.status).toBe(200)
    expect(res.body.created).toBe(1)
  })

  // ── 8. Résolution sectorName → sectorId ─────────────────────────────────────

  it('200 — sectorName résolu correctement en sectorId', async () => {
    Sector.find = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ _id: SECTOR_ID, name: 'Tech' }]),
    })
    // User.find → [] (no existing user) — already set by beforeEach

    let capturedUser = null
    User.mockImplementation((data) => {
      capturedUser = data
      return { ...data, save: jest.fn().mockResolvedValue(true) }
    })

    await request(app)
      .post('/api/users/import')
      .set('Cookie', `accessToken=${ADMIN_TOKEN}`)
      .send([{
        email:      'withsector@corp.com',
        firstName:  'Sec',
        lastName:   'Tor',
        role:       'employee',
        department: 'Engineering',
        sectorName: 'Tech',
      }])

    expect(capturedUser?.sectorId).toBe(SECTOR_ID)
  })
})
