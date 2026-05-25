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
const { login, allowedNotifKeysFor, filterNotifPrefsByRole } = require('../../services/authService')

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

    const result = await login('test@test.com', 'correctpass', false)
    expect(result.accessToken).toBe('mock-jwt-token')
    expect(result.user).toEqual(mockUser)
  })

  test('returns accessToken and refreshToken when remember=true', async () => {
    mockFindOne({ _id: 'u1', authSource: 'local', passwordHash: 'hash', mustChangePassword: false })
    bcrypt.compare.mockResolvedValue(true)
    jwt.sign.mockReturnValue('token')

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
