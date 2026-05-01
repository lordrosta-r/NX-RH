'use strict'

// =============================================================================
// LDAP route integration tests — no real MongoDB or LDAP connection.
// Config model and ldapService are fully mocked.
// authGuard is mocked with inline JWT verification (cookie-based, mirrors prod).
// =============================================================================

process.env.JWT_SECRET = 'testsecret'
process.env.NODE_ENV   = 'test'

const jwt    = require('jsonwebtoken')
const SECRET = 'testsecret'

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Config is imported directly by the route as require('../models/Config').
// From this test file, that resolves to ../../models/Config.
jest.mock('../../models/Config', () => ({
  findOne:          jest.fn(),
  findOneAndUpdate: jest.fn(),
}))

// ldapService functions are the only surface the route interacts with.
jest.mock('../../services/ldapService', () => ({
  testConnection: jest.fn(),
  previewUsers:   jest.fn(),
  syncUsers:      jest.fn(),
}))

jest.mock('../../middleware/authGuard', () => ({
  authGuard: (roles = []) => (req, res, next) => {
    const _jwt   = require('jsonwebtoken')
    const secret = process.env.JWT_SECRET
    const token  = req.cookies?.token
    if (!token) return res.status(401).json({ error: 'Authentication required' })
    try {
      const payload = _jwt.verify(token, secret, { algorithms: ['HS256'] })
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

const Config                            = require('../../models/Config')
const { testConnection, previewUsers, syncUsers } = require('../../services/ldapService')
const request                           = require('supertest')
const express                           = require('express')
const cookieParser                      = require('cookie-parser')
const { authGuard }                     = require('../../middleware/authGuard')
const ldapRouter                        = require('../../routes/ldap')

// ─── Constants & helpers ──────────────────────────────────────────────────────

const ADMIN_ID    = '507f1f77bcf86cd799439001'
const HR_ID       = '507f1f77bcf86cd799439002'
const MANAGER_ID  = '507f1f77bcf86cd799439003'
const EMPLOYEE_ID = '507f1f77bcf86cd799439004'
const DIRECTOR_ID = '507f1f77bcf86cd799439005'

function tokenFor({ id, role }) {
  return jwt.sign({ id, email: `${role}@corp.com`, role }, SECRET, {
    algorithm: 'HS256', expiresIn: '1h',
  })
}

// Mirror index.js: all /api/admin/ldap routes are admin-only.
function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/admin/ldap', authGuard(['admin']), ldapRouter)
  // Minimal error handler so next(err) → 500 JSON
  app.use((err, _req, res, _next) => {
    res.status(500).json({ error: err.message })
  })
  return app
}

// Make Config.findOne return a chainable { lean } stub.
function mockConfigFindOne(result) {
  Config.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(result) })
}

// ─── GET /api/admin/ldap/config ───────────────────────────────────────────────

describe('GET /api/admin/ldap/config', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/admin/ldap/config')
    expect(res.status).toBe(401)
  })

  it('returns 401 with an invalid token', async () => {
    const res = await request(app)
      .get('/api/admin/ldap/config')
      .set('Cookie', 'token=this.is.not.valid')
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin — hr', async () => {
    const res = await request(app)
      .get('/api/admin/ldap/config')
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
    expect(res.status).toBe(403)
  })

  it('returns 403 for non-admin — manager', async () => {
    const res = await request(app)
      .get('/api/admin/ldap/config')
      .set('Cookie', `token=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
    expect(res.status).toBe(403)
  })

  it('returns 403 for non-admin — employee', async () => {
    const res = await request(app)
      .get('/api/admin/ldap/config')
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
    expect(res.status).toBe(403)
  })

  it('returns 403 for non-admin — director', async () => {
    const res = await request(app)
      .get('/api/admin/ldap/config')
      .set('Cookie', `token=${tokenFor({ id: DIRECTOR_ID, role: 'director' })}`)
    expect(res.status).toBe(403)
  })

  it('admin receives 200 with a config object', async () => {
    mockConfigFindOne({ key: 'ldap', value: { host: 'ldap://corp.com', bindDN: 'cn=admin', baseDN: 'dc=corp' } })
    const res = await request(app)
      .get('/api/admin/ldap/config')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    expect(res.body.config).toBeDefined()
    expect(res.body.config.host).toBe('ldap://corp.com')
  })

  it('bindPassword is NEVER present in the response body', async () => {
    mockConfigFindOne({
      key: 'ldap',
      value: { host: 'ldap://corp.com', bindPassword: 'supersecret', bindDN: 'cn=admin', baseDN: 'dc=corp' },
    })
    const res = await request(app)
      .get('/api/admin/ldap/config')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    expect(res.body.config.bindPassword).toBeUndefined()
    expect(JSON.stringify(res.body)).not.toContain('supersecret')
  })

  it('returns an empty config object when no document is stored', async () => {
    mockConfigFindOne(null)
    const res = await request(app)
      .get('/api/admin/ldap/config')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    expect(res.body.config).toEqual({})
  })

  it('returns an empty config object when stored value is null', async () => {
    mockConfigFindOne({ key: 'ldap', value: null })
    const res = await request(app)
      .get('/api/admin/ldap/config')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    expect(res.body.config).toEqual({})
  })

  it('all non-bindPassword fields are returned intact', async () => {
    mockConfigFindOne({
      key: 'ldap',
      value: {
        host:          'ldaps://ad.corp.com:636',
        bindDN:        'cn=svc,dc=corp,dc=com',
        baseDN:        'ou=users,dc=corp,dc=com',
        bindPassword:  'MUST_NOT_APPEAR',
        userFilter:    '(objectClass=person)',
        defaultRole:   'employee',
        attrEmail:     'mail',
      },
    })
    const res = await request(app)
      .get('/api/admin/ldap/config')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(200)
    expect(res.body.config).toMatchObject({
      host:        'ldaps://ad.corp.com:636',
      bindDN:      'cn=svc,dc=corp,dc=com',
      baseDN:      'ou=users,dc=corp,dc=com',
      userFilter:  '(objectClass=person)',
      defaultRole: 'employee',
      attrEmail:   'mail',
    })
    expect(res.body.config.bindPassword).toBeUndefined()
  })

  it('returns 500 when the DB call throws', async () => {
    Config.findOne.mockReturnValue({ lean: jest.fn().mockRejectedValue(new Error('DB error')) })
    const res = await request(app)
      .get('/api/admin/ldap/config')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
    expect(res.status).toBe(500)
  })
})

// ─── PUT /api/admin/ldap/config ───────────────────────────────────────────────

describe('PUT /api/admin/ldap/config', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('returns 401 without a token', async () => {
    const res = await request(app).put('/api/admin/ldap/config').send({ config: {} })
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin — manager', async () => {
    const res = await request(app)
      .put('/api/admin/ldap/config')
      .set('Cookie', `token=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
      .send({ config: { host: 'ldap://corp.com' } })
    expect(res.status).toBe(403)
  })

  it('returns 403 for non-admin — employee', async () => {
    const res = await request(app)
      .put('/api/admin/ldap/config')
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ config: {} })
    expect(res.status).toBe(403)
  })

  it('returns 403 for non-admin — hr', async () => {
    const res = await request(app)
      .put('/api/admin/ldap/config')
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ config: {} })
    expect(res.status).toBe(403)
  })

  it('admin can save config and receives 200', async () => {
    mockConfigFindOne(null)
    Config.findOneAndUpdate.mockResolvedValue({})
    const res = await request(app)
      .put('/api/admin/ldap/config')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ config: { host: 'ldap://corp.com', bindDN: 'cn=admin', baseDN: 'dc=corp', bindPassword: 'mypwd' } })
    expect(res.status).toBe(200)
    expect(res.body.config.host).toBe('ldap://corp.com')
  })

  it('bindPassword is NEVER returned in the PUT response', async () => {
    mockConfigFindOne(null)
    Config.findOneAndUpdate.mockResolvedValue({})
    const res = await request(app)
      .put('/api/admin/ldap/config')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ config: { host: 'ldap://corp.com', bindPassword: 'topsecretvalue' } })
    expect(res.body.config.bindPassword).toBeUndefined()
    expect(JSON.stringify(res.body)).not.toContain('topsecretvalue')
  })

  it('preserves existing bindPassword when none is supplied', async () => {
    mockConfigFindOne({ key: 'ldap', value: { host: 'ldap://old.com', bindPassword: 'existingpwd' } })
    Config.findOneAndUpdate.mockResolvedValue({})
    const res = await request(app)
      .put('/api/admin/ldap/config')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ config: { host: 'ldap://new.com', bindDN: 'cn=admin', baseDN: 'dc=corp' } })
    expect(res.status).toBe(200)
    // Verify the password saved to DB is the existing one
    const [, updateArg] = Config.findOneAndUpdate.mock.calls[0]
    expect(updateArg.$set.value.bindPassword).toBe('existingpwd')
  })

  it('overwrites bindPassword when a new one is provided', async () => {
    mockConfigFindOne({ key: 'ldap', value: { bindPassword: 'oldpwd' } })
    Config.findOneAndUpdate.mockResolvedValue({})
    const res = await request(app)
      .put('/api/admin/ldap/config')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ config: { host: 'ldap://corp.com', bindPassword: 'newpwd' } })
    expect(res.status).toBe(200)
    const [, updateArg] = Config.findOneAndUpdate.mock.calls[0]
    expect(updateArg.$set.value.bindPassword).toBe('newpwd')
  })

  it('calls findOneAndUpdate with { key: ldap } filter and upsert: true', async () => {
    mockConfigFindOne(null)
    Config.findOneAndUpdate.mockResolvedValue({})
    await request(app)
      .put('/api/admin/ldap/config')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ config: { host: 'ldap://corp.com' } })
    expect(Config.findOneAndUpdate).toHaveBeenCalledWith(
      { key: 'ldap' },
      expect.objectContaining({ $set: expect.any(Object) }),
      expect.objectContaining({ upsert: true })
    )
  })

  it('works with empty body (no config key) — defaults to {}', async () => {
    mockConfigFindOne(null)
    Config.findOneAndUpdate.mockResolvedValue({})
    const res = await request(app)
      .put('/api/admin/ldap/config')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({})
    expect(res.status).toBe(200)
  })

  it('returns 500 when findOneAndUpdate throws', async () => {
    mockConfigFindOne(null)
    Config.findOneAndUpdate.mockRejectedValue(new Error('DB write error'))
    const res = await request(app)
      .put('/api/admin/ldap/config')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ config: { host: 'ldap://corp.com' } })
    expect(res.status).toBe(500)
  })

  it('returns 500 when findOne (for existing password) throws', async () => {
    Config.findOne.mockReturnValue({ lean: jest.fn().mockRejectedValue(new Error('read error')) })
    const res = await request(app)
      .put('/api/admin/ldap/config')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ config: { host: 'ldap://corp.com' } })
    expect(res.status).toBe(500)
  })
})

// ─── POST /api/admin/ldap/test ────────────────────────────────────────────────

describe('POST /api/admin/ldap/test', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('returns 401 without a token', async () => {
    const res = await request(app).post('/api/admin/ldap/test').send({})
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin — employee', async () => {
    const res = await request(app)
      .post('/api/admin/ldap/test')
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ config: {} })
    expect(res.status).toBe(403)
  })

  it('returns 403 for non-admin — manager', async () => {
    const res = await request(app)
      .post('/api/admin/ldap/test')
      .set('Cookie', `token=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
      .send({ config: {} })
    expect(res.status).toBe(403)
  })

  it('returns 403 for non-admin — hr', async () => {
    const res = await request(app)
      .post('/api/admin/ldap/test')
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ config: {} })
    expect(res.status).toBe(403)
  })

  it('admin gets 200 with { ok: true } on successful connection', async () => {
    mockConfigFindOne(null)
    testConnection.mockResolvedValue({ ok: true, info: 'Connexion établie sur ldap://corp.com' })
    const res = await request(app)
      .post('/api/admin/ldap/test')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ config: { host: 'ldap://corp.com', bindDN: 'cn=admin', baseDN: 'dc=corp', bindPassword: 'secret' } })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.info).toMatch(/Connexion/)
  })

  it('admin gets 200 with { ok: false } on failed connection', async () => {
    mockConfigFindOne(null)
    testConnection.mockResolvedValue({ ok: false, error: 'ECONNREFUSED' })
    const res = await request(app)
      .post('/api/admin/ldap/test')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ config: { host: 'ldap://unreachable', bindDN: 'cn=admin', baseDN: 'dc=corp' } })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(false)
    expect(res.body.error).toMatch(/ECONNREFUSED/)
  })

  it('resolveBindPassword — uses stored password when none provided in request', async () => {
    mockConfigFindOne({ key: 'ldap', value: { bindPassword: 'storedpwd' } })
    testConnection.mockResolvedValue({ ok: true })
    await request(app)
      .post('/api/admin/ldap/test')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ config: { host: 'ldap://corp.com', bindDN: 'cn=admin', baseDN: 'dc=corp' } })
    expect(testConnection).toHaveBeenCalledWith(
      expect.objectContaining({ bindPassword: 'storedpwd' })
    )
  })

  it('resolveBindPassword — uses provided password when given in request', async () => {
    mockConfigFindOne(null)
    testConnection.mockResolvedValue({ ok: true })
    await request(app)
      .post('/api/admin/ldap/test')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ config: { host: 'ldap://corp.com', bindDN: 'cn=admin', baseDN: 'dc=corp', bindPassword: 'providedpwd' } })
    expect(testConnection).toHaveBeenCalledWith(
      expect.objectContaining({ bindPassword: 'providedpwd' })
    )
  })

  it('resolveBindPassword — falls back to empty string when nothing is stored', async () => {
    mockConfigFindOne(null)
    testConnection.mockResolvedValue({ ok: false, error: 'Invalid credentials' })
    await request(app)
      .post('/api/admin/ldap/test')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ config: { host: 'ldap://corp.com' } })
    expect(testConnection).toHaveBeenCalledWith(
      expect.objectContaining({ bindPassword: '' })
    )
  })

  it('returns 500 when testConnection throws unexpectedly', async () => {
    mockConfigFindOne(null)
    testConnection.mockRejectedValue(new Error('Unexpected failure'))
    const res = await request(app)
      .post('/api/admin/ldap/test')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ config: {} })
    expect(res.status).toBe(500)
  })
})

// ─── POST /api/admin/ldap/preview ────────────────────────────────────────────

describe('POST /api/admin/ldap/preview', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('returns 401 without a token', async () => {
    const res = await request(app).post('/api/admin/ldap/preview').send({})
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin — hr', async () => {
    const res = await request(app)
      .post('/api/admin/ldap/preview')
      .set('Cookie', `token=${tokenFor({ id: HR_ID, role: 'hr' })}`)
      .send({ config: {} })
    expect(res.status).toBe(403)
  })

  it('returns 403 for non-admin — employee', async () => {
    const res = await request(app)
      .post('/api/admin/ldap/preview')
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ config: {} })
    expect(res.status).toBe(403)
  })

  it('admin gets 200 with a users array', async () => {
    mockConfigFindOne(null)
    previewUsers.mockResolvedValue([
      { cn: 'John Doe', mail: 'john@corp.com', dn: 'cn=john,dc=corp' },
      { cn: 'Jane Smith', mail: 'jane@corp.com', dn: 'cn=jane,dc=corp' },
    ])
    const res = await request(app)
      .post('/api/admin/ldap/preview')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ config: { host: 'ldap://corp.com', bindDN: 'cn=admin', baseDN: 'dc=corp', bindPassword: 'pwd' } })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.users)).toBe(true)
    expect(res.body.users).toHaveLength(2)
    expect(res.body.users[0].mail).toBe('john@corp.com')
  })

  it('returns empty users array when no entries found', async () => {
    mockConfigFindOne(null)
    previewUsers.mockResolvedValue([])
    const res = await request(app)
      .post('/api/admin/ldap/preview')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ config: { host: 'ldap://corp.com', bindDN: 'cn=admin', baseDN: 'dc=corp' } })
    expect(res.status).toBe(200)
    expect(res.body.users).toEqual([])
  })

  it('resolveBindPassword — uses stored password for preview', async () => {
    mockConfigFindOne({ key: 'ldap', value: { bindPassword: 'storedpreviewpwd' } })
    previewUsers.mockResolvedValue([])
    await request(app)
      .post('/api/admin/ldap/preview')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ config: { host: 'ldap://corp.com', bindDN: 'cn=admin', baseDN: 'dc=corp' } })
    expect(previewUsers).toHaveBeenCalledWith(
      expect.objectContaining({ bindPassword: 'storedpreviewpwd' })
    )
  })

  it('returns 500 when previewUsers throws', async () => {
    mockConfigFindOne(null)
    previewUsers.mockRejectedValue(new Error('Prévisualisation impossible : ECONNREFUSED'))
    const res = await request(app)
      .post('/api/admin/ldap/preview')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ config: {} })
    expect(res.status).toBe(500)
  })
})

// ─── POST /api/admin/ldap/sync ────────────────────────────────────────────────

describe('POST /api/admin/ldap/sync', () => {
  const app = buildApp()

  beforeEach(() => jest.clearAllMocks())

  it('returns 401 without a token', async () => {
    const res = await request(app).post('/api/admin/ldap/sync').send({})
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin — employee', async () => {
    const res = await request(app)
      .post('/api/admin/ldap/sync')
      .set('Cookie', `token=${tokenFor({ id: EMPLOYEE_ID, role: 'employee' })}`)
      .send({ config: {} })
    expect(res.status).toBe(403)
  })

  it('returns 403 for non-admin — director', async () => {
    const res = await request(app)
      .post('/api/admin/ldap/sync')
      .set('Cookie', `token=${tokenFor({ id: DIRECTOR_ID, role: 'director' })}`)
      .send({ config: {} })
    expect(res.status).toBe(403)
  })

  it('returns 403 for non-admin — manager', async () => {
    const res = await request(app)
      .post('/api/admin/ldap/sync')
      .set('Cookie', `token=${tokenFor({ id: MANAGER_ID, role: 'manager' })}`)
      .send({ config: {} })
    expect(res.status).toBe(403)
  })

  it('admin gets 200 with sync report', async () => {
    mockConfigFindOne(null)
    syncUsers.mockResolvedValue({ created: 5, updated: 2, skipped: 1, errors: [] })
    const res = await request(app)
      .post('/api/admin/ldap/sync')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ config: { host: 'ldap://corp.com', bindDN: 'cn=admin', baseDN: 'dc=corp', bindPassword: 'pwd' } })
    expect(res.status).toBe(200)
    expect(res.body.created).toBe(5)
    expect(res.body.updated).toBe(2)
    expect(res.body.skipped).toBe(1)
    expect(res.body.errors).toEqual([])
  })

  it('resolveBindPassword — uses stored password when not supplied', async () => {
    mockConfigFindOne({ key: 'ldap', value: { bindPassword: 'storedsyncpwd' } })
    syncUsers.mockResolvedValue({ created: 0, updated: 0, skipped: 0, errors: [] })
    await request(app)
      .post('/api/admin/ldap/sync')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ config: { host: 'ldap://corp.com', bindDN: 'cn=admin', baseDN: 'dc=corp' } })
    expect(syncUsers).toHaveBeenCalledWith(
      expect.objectContaining({ bindPassword: 'storedsyncpwd' })
    )
  })

  it('report can contain partial errors and still return 200', async () => {
    mockConfigFindOne(null)
    syncUsers.mockResolvedValue({
      created: 3, updated: 0, skipped: 2,
      errors: ['user1@corp.com: duplicate key', 'user2@corp.com: validation error'],
    })
    const res = await request(app)
      .post('/api/admin/ldap/sync')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ config: { host: 'ldap://corp.com', bindDN: 'cn=admin', baseDN: 'dc=corp' } })
    expect(res.status).toBe(200)
    expect(res.body.errors).toHaveLength(2)
    expect(res.body.errors[0]).toMatch(/user1@corp.com/)
  })

  it('returns 500 when syncUsers throws', async () => {
    mockConfigFindOne(null)
    syncUsers.mockRejectedValue(new Error('Synchronisation impossible : ECONNREFUSED'))
    const res = await request(app)
      .post('/api/admin/ldap/sync')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ config: {} })
    expect(res.status).toBe(500)
  })

  it('passes the full config object to syncUsers', async () => {
    mockConfigFindOne(null)
    syncUsers.mockResolvedValue({ created: 0, updated: 0, skipped: 0, errors: [] })
    await request(app)
      .post('/api/admin/ldap/sync')
      .set('Cookie', `token=${tokenFor({ id: ADMIN_ID, role: 'admin' })}`)
      .send({ config: { host: 'ldap://corp.com', bindDN: 'cn=admin', baseDN: 'dc=corp', defaultRole: 'manager', bindPassword: 'pwd' } })
    expect(syncUsers).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'ldap://corp.com', defaultRole: 'manager' })
    )
  })
})
