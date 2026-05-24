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
    const token = req.cookies?.token
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

/**
 * Returns a Mongoose Query-like stub that supports both:
 *   await User.findOne()           → result (direct await)
 *   await User.findOne().lean()    → result (chained .lean())
 */
function makeQuery(result) {
  return {
    lean: jest.fn().mockResolvedValue(result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (fn) => Promise.resolve(result).catch(fn),
  }
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
    bcrypt.hash = jest.fn().mockResolvedValue('$2b$10$hashedPassword')
    User.findOne   = jest.fn().mockReturnValue(makeQuery(null))
    Sector.findOne = jest.fn().mockReturnValue(makeQuery(null))
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
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'employee' })}`)
      .send([])
    expect(res.status).toBe(403)
  })

  // ── 2. Validation du body ────────────────────────────────────────────────────

  it('400 — body JSON non-tableau', async () => {
    const res = await request(app)
      .post('/api/users/import')
      .set('Cookie', `token=${ADMIN_TOKEN}`)
      .set('Content-Type', 'application/json')
      .send({ email: 'test@corp.com' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/tableau/i)
  })

  it('400 — tableau vide → aucune donnée', async () => {
    const res = await request(app)
      .post('/api/users/import')
      .set('Cookie', `token=${ADMIN_TOKEN}`)
      .send([])

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/aucune donn/i)
  })

  it('400 — CSV body vide', async () => {
    const res = await request(app)
      .post('/api/users/import')
      .set('Cookie', `token=${ADMIN_TOKEN}`)
      .set('Content-Type', 'text/csv')
      .send('   ')

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/CSV vide/i)
  })

  // ── 3. dryRun=true — preview sans écriture ───────────────────────────────────

  it('200 — dryRun: retourne preview avec action=create pour utilisateur inexistant', async () => {
    // findOne → null (user n'existe pas) — dryRun uses .lean()
    User.findOne = jest.fn().mockReturnValue(makeQuery(null))

    const res = await request(app)
      .post('/api/users/import?dryRun=true')
      .set('Cookie', `token=${ADMIN_TOKEN}`)
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
    // dryRun uses findOne({ email }, '_id').lean() → existing user found
    User.findOne = jest.fn().mockReturnValue(makeQuery({ _id: MGR_ID }))

    const res = await request(app)
      .post('/api/users/import?dryRun=true')
      .set('Cookie', `token=${ADMIN_TOKEN}`)
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
    User.findOne   = jest.fn().mockReturnValue(makeQuery(null)) // no manager, no existing
    Sector.findOne = jest.fn().mockReturnValue(makeQuery(null))

    const savedUser = {
      email: 'newuser@corp.com',
      save:  jest.fn().mockResolvedValue(true),
    }
    User.mockImplementation(() => savedUser)

    const res = await request(app)
      .post('/api/users/import')
      .set('Cookie', `token=${ADMIN_TOKEN}`)
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
    const existingUser = {
      _id:        MGR_ID,
      email:      'existing@corp.com',
      firstName:  'Old',
      lastName:   'Name',
      role:       'employee',
      save:       jest.fn().mockResolvedValue(true),
    }

    // No managerEmail in data → only one findOne call (existing upsert check, no .lean())
    User.findOne = jest.fn().mockReturnValue(makeQuery(existingUser))

    const res = await request(app)
      .post('/api/users/import')
      .set('Cookie', `token=${ADMIN_TOKEN}`)
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
    expect(existingUser.firstName).toBe('Updated')
  })

  // ── 5. Erreurs de validation ──────────────────────────────────────────────────

  it('200 — email invalide → erreur dans errors[], skipped++', async () => {
    const res = await request(app)
      .post('/api/users/import')
      .set('Cookie', `token=${ADMIN_TOKEN}`)
      .send([{ email: 'not-valid-email', firstName: 'X', lastName: 'Y', role: 'employee' }])

    expect(res.status).toBe(200)
    expect(res.body.errors).toHaveLength(1)
    expect(res.body.errors[0].field).toBe('email')
    expect(res.body.skipped).toBe(1)
  })

  it('200 — rôle invalide → erreur dans errors[], skipped++', async () => {
    const res = await request(app)
      .post('/api/users/import')
      .set('Cookie', `token=${ADMIN_TOKEN}`)
      .send([{ email: 'user@corp.com', firstName: 'X', lastName: 'Y', role: 'superadmin' }])

    expect(res.status).toBe(200)
    expect(res.body.errors).toHaveLength(1)
    expect(res.body.errors[0].field).toBe('role')
    expect(res.body.skipped).toBe(1)
  })

  it('200 — firstName/lastName manquants pour création → erreur', async () => {
    User.findOne = jest.fn().mockReturnValue(makeQuery(null)) // aucun existant

    const res = await request(app)
      .post('/api/users/import')
      .set('Cookie', `token=${ADMIN_TOKEN}`)
      .send([{ email: 'noname@corp.com', role: 'employee' }])

    expect(res.status).toBe(200)
    expect(res.body.errors).toHaveLength(1)
    expect(res.body.errors[0].field).toMatch(/firstName/)
    expect(res.body.skipped).toBe(1)
  })

  // ── 6. Warnings — manager introuvable ────────────────────────────────────────

  it('200 — managerEmail introuvable → warning ajouté, managerId=null', async () => {
    // Manager lookup (with .lean()) → null; existing user check → null (new user)
    User.findOne = jest.fn().mockReturnValue(makeQuery(null))

    const savedUser = {
      email: 'emp@corp.com',
      save:  jest.fn().mockResolvedValue(true),
    }
    User.mockImplementation(() => savedUser)

    const res = await request(app)
      .post('/api/users/import')
      .set('Cookie', `token=${ADMIN_TOKEN}`)
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
    User.findOne = jest.fn().mockReturnValue(makeQuery(null))

    const savedUser = { email: 'csv@corp.com', save: jest.fn().mockResolvedValue(true) }
    User.mockImplementation(() => savedUser)

    const csv = [
      'email,firstName,lastName,role,department',
      'csv@corp.com,CSV,User,employee,Engineering',
    ].join('\n')

    const res = await request(app)
      .post('/api/users/import')
      .set('Cookie', `token=${ADMIN_TOKEN}`)
      .set('Content-Type', 'text/csv')
      .send(csv)

    expect(res.status).toBe(200)
    expect(res.body.created).toBe(1)
    expect(res.body.errors).toHaveLength(0)
  })

  it('200 — import CSV valide (séparateur point-virgule)', async () => {
    User.findOne = jest.fn().mockReturnValue(makeQuery(null))

    const savedUser = { email: 'csv2@corp.com', save: jest.fn().mockResolvedValue(true) }
    User.mockImplementation(() => savedUser)

    const csv = [
      'email;firstName;lastName;role;department',
      'csv2@corp.com;CSV2;User2;employee;Engineering',
    ].join('\n')

    const res = await request(app)
      .post('/api/users/import')
      .set('Cookie', `token=${HR_TOKEN}`)
      .set('Content-Type', 'text/csv')
      .send(csv)

    expect(res.status).toBe(200)
    expect(res.body.created).toBe(1)
  })

  // ── 8. Résolution sectorName → sectorId ─────────────────────────────────────

  it('200 — sectorName résolu correctement en sectorId', async () => {
    Sector.findOne = jest.fn().mockReturnValue(makeQuery({ _id: SECTOR_ID }))
    User.findOne   = jest.fn().mockReturnValue(makeQuery(null))

    let capturedUser = null
    User.mockImplementation((data) => {
      capturedUser = data
      return { ...data, save: jest.fn().mockResolvedValue(true) }
    })

    await request(app)
      .post('/api/users/import')
      .set('Cookie', `token=${ADMIN_TOKEN}`)
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
