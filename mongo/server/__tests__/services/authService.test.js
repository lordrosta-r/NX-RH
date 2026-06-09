'use strict'

// =============================================================================
// Unit tests — services/authService.js
// Mocked: User, bcrypt, jsonwebtoken (no real DB required)
// =============================================================================

jest.mock('../../models/User')
jest.mock('bcrypt')
jest.mock('jsonwebtoken')

const User   = require('../../models/User')
const bcrypt = require('bcrypt')
const jwt    = require('jsonwebtoken')
const { login, logout, revokeRefreshToken, refreshAccessToken, register, validateUser, allowedNotifKeysFor, filterNotifPrefsByRole } = require('../../services/authService')

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Stub for User.findOne().select().lean() chain */
function mockFindOne(resolvedUser) {
  User.findOne.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedUser),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
describe('authService — login()', () => {
  test('throws 401 with loginFailed when user is not found', async () => {
    mockFindOne(null)
    const err = await login('nobody@test.com', 'pass', false).catch(e => e)
    expect(err.status).toBe(401)
    expect(err.loginFailed).toBe(true)
  })

  test('throws 401 with loginFailed when authSource is not "local"', async () => {
    mockFindOne({ _id: 'u1', email: 'ldap@test.com', authSource: 'ldap', passwordHash: 'hash' })
    const err = await login('ldap@test.com', 'pass', false).catch(e => e)
    expect(err.status).toBe(401)
    expect(err.loginFailed).toBe(true)
  })

  test('throws 401 with loginFailed when passwordHash is absent', async () => {
    mockFindOne({ _id: 'u1', email: 'nohash@test.com', authSource: 'local', passwordHash: null })
    const err = await login('nohash@test.com', 'pass', false).catch(e => e)
    expect(err.status).toBe(401)
    expect(err.loginFailed).toBe(true)
  })

  test('throws 401 with loginFailed when password does not match', async () => {
    mockFindOne({ _id: 'u1', email: 'test@test.com', authSource: 'local', passwordHash: 'hash' })
    bcrypt.compare.mockResolvedValue(false)
    const err = await login('test@test.com', 'wrongpass', false).catch(e => e)
    expect(err.status).toBe(401)
    expect(err.loginFailed).toBe(true)
  })

  test('returns user and token on successful login', async () => {
    const mockUser = {
      _id: 'u1', email: 'test@test.com', role: 'employee',
      firstName: 'Test', lastName: 'User',
      authSource: 'local', passwordHash: 'hash', mustChangePassword: false,
    }
    mockFindOne(mockUser)
    bcrypt.compare.mockResolvedValue(true)
    jwt.sign.mockReturnValue('mock-jwt-token')
    User.updateOne.mockResolvedValue({ modifiedCount: 1 })

    const result = await login('test@test.com', 'correctpass', false)
    expect(result.accessToken).toBe('mock-jwt-token')
    expect(result.user).toEqual(mockUser)
  })

  test('returns accessToken and refreshToken when remember=true', async () => {
    mockFindOne({ _id: 'u1', authSource: 'local', passwordHash: 'hash', mustChangePassword: false })
    bcrypt.compare.mockResolvedValue(true)
    jwt.sign.mockReturnValue('token')
    User.updateOne.mockResolvedValue({ modifiedCount: 1 })

    const result = await login('test@test.com', 'pass', true)
    expect(result.accessToken).toBeDefined()
    expect(result.refreshToken).toBeDefined()
  })

  test('returns mustChangePassword flag without a token when set on user', async () => {
    mockFindOne({ _id: 'u1', authSource: 'local', passwordHash: 'hash', mustChangePassword: true })
    bcrypt.compare.mockResolvedValue(true)

    const result = await login('test@test.com', 'pass', false)
    expect(result).toEqual({ mustChangePassword: true, userId: 'u1' })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('authService — allowedNotifKeysFor(role)', () => {
  test('returns non-empty array for "employee" role', () => {
    const keys = allowedNotifKeysFor('employee')
    expect(Array.isArray(keys)).toBe(true)
    expect(keys.length).toBeGreaterThan(0)
  })

  test('returns non-empty array for "admin" role', () => {
    const keys = allowedNotifKeysFor('admin')
    expect(Array.isArray(keys)).toBe(true)
    expect(keys.length).toBeGreaterThan(0)
  })

  test('admin has at least as many notification keys as employee', () => {
    expect(allowedNotifKeysFor('admin').length).toBeGreaterThanOrEqual(
      allowedNotifKeysFor('employee').length,
    )
  })

  test('falls back to employee keys for an unknown role', () => {
    expect(allowedNotifKeysFor('unknown_role')).toEqual(allowedNotifKeysFor('employee'))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('authService — filterNotifPrefsByRole(prefs, role)', () => {
  test('retains only keys allowed for the role', () => {
    const prefs = {
      evaluationAssigned: true,
      systemAlerts: true,  // admin-only
      deadlineReminder: false,
    }
    const result = filterNotifPrefsByRole(prefs, 'employee')
    expect(result).not.toHaveProperty('systemAlerts')
    expect(result).toHaveProperty('evaluationAssigned', true)
    expect(result).toHaveProperty('deadlineReminder', false)
  })

  test('returns empty object when prefs is null', () => {
    expect(filterNotifPrefsByRole(null, 'employee')).toEqual({})
  })

  test('returns empty object when no pref keys match the role', () => {
    expect(filterNotifPrefsByRole({ unknownKey: true }, 'employee')).toEqual({})
  })

  test('coerces pref values to boolean via !!', () => {
    const result = filterNotifPrefsByRole({ evaluationAssigned: 1, deadlineReminder: 0 }, 'employee')
    expect(result.evaluationAssigned).toBe(true)
    expect(result.deadlineReminder).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('authService — logout()', () => {
  test('calls User.updateOne to pull the refresh token', async () => {
    User.updateOne.mockResolvedValue({ modifiedCount: 1 })
    await logout('user123', 'someRefreshToken')
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: 'user123' },
      { $pull: { refreshTokens: 'someRefreshToken' } },
    )
  })

  test('returns early without calling User.updateOne when userId is falsy', async () => {
    await logout(null, 'someToken')
    expect(User.updateOne).not.toHaveBeenCalled()
  })

  test('does not throw if User.updateOne rejects', async () => {
    User.updateOne.mockRejectedValue(new Error('DB error'))
    await expect(logout('user123', 'token')).resolves.toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('authService — refreshAccessToken()', () => {
  const decoded = { id: 'user123', email: 'u@corp.com', role: 'employee', firstName: 'U', lastName: 'Ser' }

  function mockUser(refreshTokens) {
    User.findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean:   jest.fn().mockResolvedValue({ _id: 'user123', isActive: true, email: 'u@corp.com', role: 'employee', firstName: 'U', lastName: 'Ser', refreshTokens }),
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jwt.verify.mockReturnValue(decoded)
    jwt.sign.mockReturnValueOnce('newAccess').mockReturnValueOnce('newRefresh')
    User.updateOne.mockResolvedValue({ modifiedCount: 1 })
  })

  test('rejects (401) when the refresh token is not in the allowlist', async () => {
    mockUser([])  // token absent → révoqué
    await expect(refreshAccessToken('stolenToken')).rejects.toMatchObject({ status: 401 })
    expect(User.updateOne).not.toHaveBeenCalled()
  })

  test('issues new tokens and rotates (pull old, push new) when token is valid', async () => {
    mockUser(['validToken'])
    const result = await refreshAccessToken('validToken')
    expect(result).toEqual({ accessToken: 'newAccess', refreshToken: 'newRefresh' })
    expect(User.updateOne).toHaveBeenCalledWith({ _id: 'user123' }, { $pull: { refreshTokens: 'validToken' } })
    expect(User.updateOne).toHaveBeenCalledWith({ _id: 'user123' }, { $push: { refreshTokens: { $each: ['newRefresh'], $slice: -20 } } })
  })

  test('rejects (401) when the user is inactive', async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean:   jest.fn().mockResolvedValue({ _id: 'user123', isActive: false, refreshTokens: ['validToken'] }),
    })
    await expect(refreshAccessToken('validToken')).rejects.toMatchObject({ status: 401 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('authService — revokeRefreshToken()', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    User.updateOne.mockResolvedValue({ modifiedCount: 1 })
  })

  test('decodes the token and pulls it from the allowlist', async () => {
    jwt.verify.mockReturnValue({ id: 'user123' })
    await revokeRefreshToken('someToken')
    expect(User.updateOne).toHaveBeenCalledWith({ _id: 'user123' }, { $pull: { refreshTokens: 'someToken' } })
  })

  test('is silent (no throw, no DB write) for an invalid token', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('invalid') })
    await expect(revokeRefreshToken('bad')).resolves.toBeUndefined()
    expect(User.updateOne).not.toHaveBeenCalled()
  })

  test('returns early when no token is provided', async () => {
    await revokeRefreshToken(undefined)
    expect(User.updateOne).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('authService — validateUser()', () => {
  test('throws 401 when email is missing', async () => {
    const err = await validateUser('', 'pass').catch(e => e)
    expect(err.status).toBe(401)
  })

  test('throws 401 when user is not found', async () => {
    mockFindOne(null)
    const err = await validateUser('nobody@test.com', 'pass').catch(e => e)
    expect(err.status).toBe(401)
  })

  test('throws 401 when password does not match', async () => {
    mockFindOne({ _id: 'u1', email: 'test@test.com', authSource: 'local', passwordHash: 'hash', isActive: true })
    bcrypt.compare.mockResolvedValue(false)
    const err = await validateUser('test@test.com', 'wrongpass').catch(e => e)
    expect(err.status).toBe(401)
  })

  test('throws 401 when account is inactive', async () => {
    mockFindOne({ _id: 'u1', email: 'test@test.com', passwordHash: 'hash', isActive: false })
    bcrypt.compare.mockResolvedValue(true)
    const err = await validateUser('test@test.com', 'pass').catch(e => e)
    expect(err.status).toBe(401)
  })

  test('returns user without passwordHash for valid credentials', async () => {
    mockFindOne({ _id: 'u1', email: 'test@test.com', passwordHash: 'hash', isActive: true, firstName: 'Test' })
    bcrypt.compare.mockResolvedValue(true)
    const result = await validateUser('test@test.com', 'correct')
    expect(result).not.toHaveProperty('passwordHash')
    expect(result.email).toBe('test@test.com')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('authService — register()', () => {
  test('throws 400 when required fields are missing', async () => {
    const err = await register({ email: 'test@test.com', password: 'pass', firstName: 'A' }).catch(e => e)
    expect(err.status).toBe(400)
  })

  test('throws 409 when email is already taken', async () => {
    User.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'existing' }) })
    const err = await register({ email: 'taken@test.com', password: 'pass123', firstName: 'A', lastName: 'B' }).catch(e => e)
    expect(err.status).toBe(409)
  })

  test('creates user and returns object without passwordHash', async () => {
    User.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) })
    bcrypt.hash.mockResolvedValue('$2b$12$hashed')
    User.create.mockResolvedValue({
      toObject: jest.fn().mockReturnValue({
        _id: 'new-user-id', email: 'new@test.com', firstName: 'New',
        lastName: 'User', role: 'employee', passwordHash: '$2b$12$hashed',
      }),
    })
    const result = await register({ email: 'new@test.com', password: 'mypassword', firstName: 'New', lastName: 'User' })
    expect(result).not.toHaveProperty('passwordHash')
    expect(result.email).toBe('new@test.com')
  })
})
