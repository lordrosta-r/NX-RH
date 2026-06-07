'use strict'

// =============================================================================
// Unit tests — services/userService.js
// Mocked: ../models (User as constructor + statics, Evaluation), bcrypt
// =============================================================================

jest.mock('../../models', () => {
  // MockUser works both as a constructor (new User(data)) and as a static model
  const MockUser = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data)
    this.save     = jest.fn().mockResolvedValue()
    this.toObject = jest.fn().mockReturnValue({ ...data })
  })
  MockUser.findById      = jest.fn()
  MockUser.find          = jest.fn()
  MockUser.updateOne     = jest.fn()
  MockUser.countDocuments = jest.fn()
  MockUser.aggregate     = jest.fn()

  return {
    User: MockUser,
    Evaluation: {
      find:           jest.fn(),
      countDocuments: jest.fn(),
      updateMany:     jest.fn(),
    },
    AuditLog: {
      create: jest.fn(),
    },
  }
})

jest.mock('bcrypt')

const { User, Evaluation } = require('../../models')
const bcrypt = require('bcrypt')

const {
  createUser,
  getUserById,
  updateUser,
  gdprExportUser,
  gdprAnonymizeUser,
  searchUsers,
  bulkUpsertUsers,
  getUserStats,
} = require('../../services/userService')

const VALID_ID  = '507f1f77bcf86cd799439011'
const VALID_ID2 = '507f1f77bcf86cd799439012'

// ── createUser ────────────────────────────────────────────────────────────────
describe('userService — createUser()', () => {
  test('hashes the generated temp password with bcrypt (rounds=12)', async () => {
    bcrypt.hash.mockResolvedValue('$2b$12$hashedpassword')

    const result = await createUser({
      firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com', role: 'employee',
    })

    expect(bcrypt.hash).toHaveBeenCalledWith(expect.any(String), 12)
    expect(result).not.toHaveProperty('passwordHash')
    expect(result).toHaveProperty('tempPassword')
    expect(typeof result.tempPassword).toBe('string')
  })

  test('throws 400 when required fields (firstName/lastName/email) are missing', async () => {
    await expect(createUser({ email: 'x@test.com' })).rejects.toMatchObject({ status: 400 })
  })

  test('throws 400 for an invalid role', async () => {
    await expect(
      createUser({ firstName: 'A', lastName: 'B', email: 'a@b.com', role: 'superadmin' }),
    ).rejects.toMatchObject({ status: 400 })
  })

  test('propagates save() error on duplicate email (E11000)', async () => {
    bcrypt.hash.mockResolvedValue('hash')
    const dupError = Object.assign(new Error('E11000 duplicate key'), { code: 11000 })

    User.mockImplementationOnce(function (data) {
      Object.assign(this, data)
      this.save     = jest.fn().mockRejectedValue(dupError)
      this.toObject = jest.fn().mockReturnValue({ ...data })
    })

    await expect(
      createUser({ firstName: 'A', lastName: 'B', email: 'dup@test.com' }),
    ).rejects.toMatchObject({ code: 11000 })
  })
})

// ── getUserById ───────────────────────────────────────────────────────────────
describe('userService — getUserById()', () => {
  test('throws 400 for an invalid ObjectId', async () => {
    await expect(getUserById('not-an-id', { role: 'admin', id: VALID_ID2 }))
      .rejects.toMatchObject({ status: 400 })
  })

  test('throws 404 when user is not found', async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean:   jest.fn().mockResolvedValue(null),
    })
    await expect(getUserById(VALID_ID, { role: 'admin', id: VALID_ID2 }))
      .rejects.toMatchObject({ status: 404 })
  })

  test('returns user without passwordHash for admin', async () => {
    const mockUser = { _id: VALID_ID, email: 'alice@test.com', firstName: 'Alice' }
    User.findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean:   jest.fn().mockResolvedValue(mockUser),
    })

    const result = await getUserById(VALID_ID, { role: 'admin', id: VALID_ID2 })
    expect(result).toEqual(mockUser)
    expect(result).not.toHaveProperty('passwordHash')
  })

  test('throws 403 when manager tries to view a non-subordinate', async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean:   jest.fn().mockResolvedValue({ _id: VALID_ID, managerId: 'other-manager' }),
    })
    await expect(getUserById(VALID_ID, { role: 'manager', id: VALID_ID2 }))
      .rejects.toMatchObject({ status: 403 })
  })
})

// ── updateUser ────────────────────────────────────────────────────────────────
describe('userService — updateUser()', () => {
  test('throws 403 when a non-admin tries to update another user', async () => {
    await expect(
      updateUser(VALID_ID, { firstName: 'New' }, { role: 'employee', id: VALID_ID2 }),
    ).rejects.toMatchObject({ status: 403 })
  })

  test('throws 403 when a non-admin tries to update protected fields (role)', async () => {
    // isSelf=true but role is a protected field
    await expect(
      updateUser(VALID_ID, { role: 'admin' }, { role: 'employee', id: VALID_ID }),
    ).rejects.toMatchObject({ status: 403 })
  })

  test('throws 404 when user is not found', async () => {
    User.findById.mockResolvedValue(null)
    await expect(
      updateUser(VALID_ID, { firstName: 'New' }, { role: 'admin', id: VALID_ID2 }),
    ).rejects.toMatchObject({ status: 404 })
  })

  test('admin can update a user and result has no passwordHash', async () => {
    const mockUserDoc = {
      _id:      VALID_ID,
      firstName: 'Old',
      save:     jest.fn().mockResolvedValue(),
      toObject: jest.fn().mockReturnValue({ _id: VALID_ID, firstName: 'New', passwordHash: 'secret' }),
    }
    User.findById.mockResolvedValue(mockUserDoc)

    const result = await updateUser(
      VALID_ID,
      { firstName: 'New' },
      { role: 'admin', id: VALID_ID2 },
    )

    expect(mockUserDoc.save).toHaveBeenCalled()
    expect(result).not.toHaveProperty('passwordHash')
    expect(result.firstName).toBe('New')
  })
})

// ── gdprExportUser ────────────────────────────────────────────────────────────
describe('userService — gdprExportUser()', () => {
  test('throws 400 for an invalid ObjectId', async () => {
    await expect(gdprExportUser('bad-id')).rejects.toMatchObject({ status: 400 })
  })

  test('throws 404 when user is not found', async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean:   jest.fn().mockResolvedValue(null),
    })
    Evaluation.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean:     jest.fn().mockResolvedValue([]),
    })
    await expect(gdprExportUser(VALID_ID)).rejects.toMatchObject({ status: 404 })
  })

  test('returns user data, evaluations, and exportedAt timestamp', async () => {
    const mockUser  = { _id: VALID_ID, firstName: 'Alice', email: 'alice@test.com' }
    const mockEvals = [{ _id: 'e1', status: 'submitted' }]

    User.findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean:   jest.fn().mockResolvedValue(mockUser),
    })
    Evaluation.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean:     jest.fn().mockResolvedValue(mockEvals),
    })

    const result = await gdprExportUser(VALID_ID)
    expect(result.user).toEqual(mockUser)
    expect(result.evaluations).toEqual(mockEvals)
    expect(result.exportedAt).toBeInstanceOf(Date)
  })
})

// ── gdprAnonymizeUser ─────────────────────────────────────────────────────────
describe('userService — gdprAnonymizeUser()', () => {
  test('throws 400 for an invalid ObjectId', async () => {
    await expect(gdprAnonymizeUser('bad-id')).rejects.toMatchObject({ status: 400 })
  })

  test('throws 404 when user is not found', async () => {
    User.findById.mockResolvedValue(null)
    await expect(gdprAnonymizeUser(VALID_ID)).rejects.toMatchObject({ status: 404 })
  })

  test('throws 409 when active evaluations are still in progress', async () => {
    User.findById.mockResolvedValue({ _id: VALID_ID, save: jest.fn() })
    Evaluation.countDocuments.mockResolvedValue(2)

    await expect(gdprAnonymizeUser(VALID_ID)).rejects.toMatchObject({ status: 409 })
  })

  test('anonymizes personal data and calls save()', async () => {
    const mockUserDoc = {
      _id:       VALID_ID,
      firstName: 'Alice',
      lastName:  'Smith',
      email:     'alice@test.com',
      save:      jest.fn().mockResolvedValue(),
    }
    User.findById.mockResolvedValue(mockUserDoc)
    Evaluation.countDocuments.mockResolvedValue(0)

    await gdprAnonymizeUser(VALID_ID)

    expect(mockUserDoc.firstName).toBe('Anonyme')
    expect(mockUserDoc.lastName).toBe('Anonyme')
    expect(mockUserDoc.email).toContain('anonyme')
    expect(mockUserDoc.isActive).toBe(false)
    expect(mockUserDoc.save).toHaveBeenCalled()
  })
})

// ── searchUsers ───────────────────────────────────────────────────────────────

/** Minimal chainable stub for User.find(...).select().sort().skip().limit().lean() */
function mockUserFindChain(result) {
  return {
    select: jest.fn().mockReturnThis(),
    sort:   jest.fn().mockReturnThis(),
    skip:   jest.fn().mockReturnThis(),
    limit:  jest.fn().mockReturnThis(),
    lean:   jest.fn().mockResolvedValue(result),
  }
}

describe('userService — searchUsers()', () => {
  test('throws 400 when query is empty', async () => {
    await expect(searchUsers('', {})).rejects.toMatchObject({ status: 400 })
  })

  test('throws 400 when query is not a string', async () => {
    await expect(searchUsers(null, {})).rejects.toMatchObject({ status: 400 })
  })

  test('returns paginated users matching the query', async () => {
    const mockUsers = [{ _id: VALID_ID, firstName: 'Alice', email: 'alice@test.com' }]
    User.find.mockReturnValue(mockUserFindChain(mockUsers))
    User.countDocuments.mockResolvedValue(1)

    const result = await searchUsers('Alice', {})
    expect(result.users).toEqual(mockUsers)
    expect(result.total).toBe(1)
    expect(result).toHaveProperty('pages')
    expect(result.pages).toBe(1)
  })

  test('applies role filter when provided', async () => {
    User.find.mockReturnValue(mockUserFindChain([]))
    User.countDocuments.mockResolvedValue(0)

    await searchUsers('test', { role: 'manager' })

    expect(User.find).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'manager' }),
    )
  })

  test('applies department filter when provided', async () => {
    User.find.mockReturnValue(mockUserFindChain([]))
    User.countDocuments.mockResolvedValue(0)

    await searchUsers('test', { department: 'Engineering' })

    expect(User.find).toHaveBeenCalledWith(
      expect.objectContaining({ department: 'Engineering' }),
    )
  })

  test('returns correct page metadata', async () => {
    User.find.mockReturnValue(mockUserFindChain([]))
    User.countDocuments.mockResolvedValue(45)

    const result = await searchUsers('test', { page: 2, limit: 20 })
    expect(result.page).toBe(2)
    expect(result.limit).toBe(20)
    expect(result.pages).toBe(3)
  })
})

// ── getUserStats ──────────────────────────────────────────────────────────────
describe('userService — getUserStats()', () => {
  test('returns total, byRole, byDept, inactive counts', async () => {
    User.countDocuments
      .mockResolvedValueOnce(100)  // total
      .mockResolvedValueOnce(10)   // inactive
    User.aggregate
      .mockResolvedValueOnce([{ _id: 'employee', count: 80 }, { _id: 'manager', count: 20 }])
      .mockResolvedValueOnce([{ _id: 'Engineering', count: 50 }])

    const result = await getUserStats()
    expect(result.total).toBe(100)
    expect(result.inactive).toBe(10)
    expect(Array.isArray(result.byRole)).toBe(true)
    expect(result.byRole).toHaveLength(2)
    expect(Array.isArray(result.byDept)).toBe(true)
  })
})

// ── bulkUpsertUsers ───────────────────────────────────────────────────────────
describe('userService — bulkUpsertUsers()', () => {
  test('throws 400 for empty array', async () => {
    await expect(bulkUpsertUsers([])).rejects.toMatchObject({ status: 400 })
  })

  test('throws 400 for non-array input', async () => {
    await expect(bulkUpsertUsers(null)).rejects.toMatchObject({ status: 400 })
  })

  test('creates new users not already in DB', async () => {
    User.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })
    bcrypt.hash.mockResolvedValue('$2b$12$hashed')

    const result = await bulkUpsertUsers([
      { email: 'new@test.com', firstName: 'New', lastName: 'User' },
    ])

    expect(result.created).toBe(1)
    expect(result.updated).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  test('updates existing users matched by email', async () => {
    User.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([{ email: 'existing@test.com' }]) })
    User.updateOne.mockResolvedValue({ modifiedCount: 1 })

    const result = await bulkUpsertUsers([
      { email: 'existing@test.com', firstName: 'Updated', lastName: 'User' },
    ])

    expect(result.updated).toBe(1)
    expect(result.created).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  test('returns { created, updated, errors } summary', async () => {
    User.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ email: 'existing@test.com' }]),
    })
    bcrypt.hash.mockResolvedValue('$2b$12$hashed')
    User.updateOne.mockResolvedValue({ modifiedCount: 1 })

    const result = await bulkUpsertUsers([
      { email: 'existing@test.com', firstName: 'Updated' },
      { email: 'new@test.com',      firstName: 'New', lastName: 'User' },
    ])

    expect(result).toHaveProperty('created')
    expect(result).toHaveProperty('updated')
    expect(result).toHaveProperty('errors')
    expect(result.created + result.updated).toBe(2)
  })

  test('records errors for failed upserts without throwing', async () => {
    User.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })
    bcrypt.hash.mockResolvedValue('$2b$12$hashed')

    User.mockImplementationOnce(function (data) {
      Object.assign(this, data)
      this.save     = jest.fn().mockRejectedValue(new Error('Validation error'))
      this.toObject = jest.fn().mockReturnValue({ ...data })
    })

    const result = await bulkUpsertUsers([{ email: 'bad@test.com', firstName: 'Bad' }])
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].email).toBe('bad@test.com')
  })
})
