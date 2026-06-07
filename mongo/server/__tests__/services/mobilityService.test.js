'use strict'

// =============================================================================
// Unit tests — services/mobilityService.js
// Mocked: ../models/MobilityRequest, ../utils/paginate
// =============================================================================

// ─── Model mock ───────────────────────────────────────────────────────────────

jest.mock('../../models/MobilityRequest', () => {
  const MockMR = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data)
    this.save      = jest.fn().mockResolvedValue(this)
    this.deleteOne = jest.fn().mockResolvedValue(undefined)
  })
  MockMR.create            = jest.fn()
  MockMR.findById          = jest.fn()
  MockMR.find              = jest.fn()
  MockMR.countDocuments    = jest.fn()
  return MockMR
})

jest.mock('../../utils/paginate', () => ({
  paginate: jest.fn(),
}))

const MobilityRequest = require('../../models/MobilityRequest')
const { paginate }    = require('../../utils/paginate')
const {
  listRequests,
  getRequestById,
  createRequest,
  updateRequest,
  deleteRequest,
} = require('../../services/mobilityService')

const VALID_ID      = '507f1f77bcf86cd799439011'
const EMPLOYEE_ID   = '507f1f77bcf86cd799439012'
const HR_ID         = '507f1f77bcf86cd799439013'

const employeeUser = { _id: EMPLOYEE_ID, role: 'employee', position: 'Dev', department: 'Tech' }
const hrUser       = { _id: HR_ID,       role: 'hr' }

// ── listRequests() ────────────────────────────────────────────────────────────

describe('mobilityService — listRequests()', () => {
  beforeEach(() => jest.clearAllMocks())

  it('should filter by employeeId for employee role', async () => {
    paginate.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    await listRequests(employeeUser, {})

    expect(paginate).toHaveBeenCalledWith(
      MobilityRequest,
      expect.objectContaining({ employeeId: EMPLOYEE_ID }),
      expect.any(Object),
    )
  })

  it('should filter by status when provided', async () => {
    paginate.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 })

    await listRequests(hrUser, { status: 'pending' })

    expect(paginate).toHaveBeenCalledWith(
      MobilityRequest,
      expect.objectContaining({ status: 'pending' }),
      expect.any(Object),
    )
  })

  it('should return all requests for HR role (no employeeId filter)', async () => {
    const fakeData = [{ _id: VALID_ID, status: 'pending' }]
    paginate.mockResolvedValue({ data: fakeData, total: 1, page: 1, limit: 20 })

    const result = await listRequests(hrUser, {})

    // HR: filter should not contain employeeId
    const callFilter = paginate.mock.calls[0][1]
    expect(callFilter).not.toHaveProperty('employeeId')
    expect(result.data).toHaveLength(1)
  })
})

// ── getRequestById() ──────────────────────────────────────────────────────────

describe('mobilityService — getRequestById()', () => {
  beforeEach(() => jest.clearAllMocks())

  it('should return populated request for HR', async () => {
    const fakeRequest = {
      _id:        VALID_ID,
      employeeId: { _id: EMPLOYEE_ID, firstName: 'Alice', lastName: 'Doe' },
      status:     'pending',
    }

    const chain = {
      populate: jest.fn().mockReturnThis(),
      lean:     jest.fn().mockResolvedValue(fakeRequest),
    }
    MobilityRequest.findById.mockReturnValue(chain)

    const result = await getRequestById(VALID_ID, hrUser)

    expect(MobilityRequest.findById).toHaveBeenCalledWith(VALID_ID)
    expect(result).toMatchObject({ _id: VALID_ID, status: 'pending' })
  })

  it('should throw 404 if request does not exist', async () => {
    const chain = {
      populate: jest.fn().mockReturnThis(),
      lean:     jest.fn().mockResolvedValue(null),
    }
    MobilityRequest.findById.mockReturnValue(chain)

    await expect(getRequestById(VALID_ID, hrUser)).rejects.toMatchObject({ status: 404 })
  })

  it('should throw 403 if employee tries to access another employee\'s request', async () => {
    const OTHER_ID = '507f1f77bcf86cd799439099'
    const fakeRequest = {
      _id:        VALID_ID,
      employeeId: { _id: OTHER_ID },
      status:     'pending',
    }
    const chain = {
      populate: jest.fn().mockReturnThis(),
      lean:     jest.fn().mockResolvedValue(fakeRequest),
    }
    MobilityRequest.findById.mockReturnValue(chain)

    await expect(getRequestById(VALID_ID, employeeUser)).rejects.toMatchObject({ status: 403 })
  })
})

// ── createRequest() ───────────────────────────────────────────────────────────

describe('mobilityService — createRequest()', () => {
  beforeEach(() => jest.clearAllMocks())

  it('should create and return a mobility request', async () => {
    const savedDoc = {
      _id:            VALID_ID,
      employeeId:     EMPLOYEE_ID,
      targetPosition: 'Manager',
      status:         'pending',
      populate:       jest.fn().mockResolvedValue({ _id: VALID_ID, targetPosition: 'Manager' }),
    }
    MobilityRequest.create.mockResolvedValue(savedDoc)

    const result = await createRequest({ targetPosition: 'Manager' }, employeeUser)

    expect(MobilityRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: EMPLOYEE_ID, targetPosition: 'Manager' }),
    )
    expect(result).toMatchObject({ _id: VALID_ID })
  })

  it('should throw 400 if targetPosition is missing', async () => {
    await expect(createRequest({}, employeeUser)).rejects.toMatchObject({ status: 400 })
    expect(MobilityRequest.create).not.toHaveBeenCalled()
  })

  it('should default requestType to internal_transfer', async () => {
    const savedDoc = {
      _id:      VALID_ID,
      populate: jest.fn().mockResolvedValue({ _id: VALID_ID }),
    }
    MobilityRequest.create.mockResolvedValue(savedDoc)

    await createRequest({ targetPosition: 'Lead' }, employeeUser)

    expect(MobilityRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({ requestType: 'internal_transfer' }),
    )
  })
})

// ── updateRequest() — validate (HR) / reject / employee edit ─────────────────

describe('mobilityService — updateRequest() RBAC', () => {
  beforeEach(() => jest.clearAllMocks())

  function makePendingDoc(overrides = {}) {
    const doc = {
      _id:        VALID_ID,
      employeeId: EMPLOYEE_ID,
      status:     'pending',
      ...overrides,
    }
    doc.save = jest.fn().mockResolvedValue(doc)
    return doc
  }

  it('should allow HR to set status to approved (validate)', async () => {
    const doc = makePendingDoc()
    MobilityRequest.findById.mockResolvedValue(doc)

    const result = await updateRequest(VALID_ID, { status: 'approved' }, hrUser)

    expect(doc.status).toBe('approved')
    expect(doc.reviewedBy).toBe(HR_ID)
    expect(doc.save).toHaveBeenCalled()
    expect(result).toBe(doc)
  })

  it('should allow HR to set status to rejected with hrComment', async () => {
    const doc = makePendingDoc()
    MobilityRequest.findById.mockResolvedValue(doc)

    await updateRequest(VALID_ID, { status: 'rejected', hrComment: 'Budget freeze' }, hrUser)

    expect(doc.status).toBe('rejected')
    expect(doc.hrComment).toBe('Budget freeze')
    expect(doc.save).toHaveBeenCalled()
  })

  it('should deny non-HR/admin employee from changing status', async () => {
    const doc = makePendingDoc({ employeeId: '507f1f77bcf86cd799439099' }) // different employee
    MobilityRequest.findById.mockResolvedValue(doc)

    await expect(
      updateRequest(VALID_ID, { status: 'approved' }, employeeUser),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('should allow owner (employee) to edit motivation when pending', async () => {
    const doc = makePendingDoc({ employeeId: EMPLOYEE_ID })
    MobilityRequest.findById.mockResolvedValue(doc)

    await updateRequest(VALID_ID, { motivation: 'New motivation' }, employeeUser)

    expect(doc.motivation).toBe('New motivation')
    expect(doc.save).toHaveBeenCalled()
  })

  it('should throw 404 if request not found', async () => {
    MobilityRequest.findById.mockResolvedValue(null)

    await expect(
      updateRequest(VALID_ID, { status: 'approved' }, hrUser),
    ).rejects.toMatchObject({ status: 404 })
  })
})

// ── deleteRequest() ───────────────────────────────────────────────────────────

describe('mobilityService — deleteRequest()', () => {
  beforeEach(() => jest.clearAllMocks())

  it('should allow HR to delete any request', async () => {
    const doc = {
      _id:        VALID_ID,
      employeeId: EMPLOYEE_ID,
      status:     'approved',
      deleteOne:  jest.fn().mockResolvedValue(undefined),
    }
    MobilityRequest.findById.mockResolvedValue(doc)

    await expect(deleteRequest(VALID_ID, hrUser)).resolves.toBeUndefined()
    expect(doc.deleteOne).toHaveBeenCalled()
  })

  it('should allow owner to delete their own pending request', async () => {
    const doc = {
      _id:        VALID_ID,
      employeeId: EMPLOYEE_ID,
      status:     'pending',
      deleteOne:  jest.fn().mockResolvedValue(undefined),
    }
    MobilityRequest.findById.mockResolvedValue(doc)

    await expect(deleteRequest(VALID_ID, employeeUser)).resolves.toBeUndefined()
    expect(doc.deleteOne).toHaveBeenCalled()
  })

  it('should throw 403 if employee tries to delete a non-pending request', async () => {
    const doc = {
      _id:        VALID_ID,
      employeeId: EMPLOYEE_ID,
      status:     'approved',
      deleteOne:  jest.fn(),
    }
    MobilityRequest.findById.mockResolvedValue(doc)

    await expect(deleteRequest(VALID_ID, employeeUser)).rejects.toMatchObject({ status: 403 })
    expect(doc.deleteOne).not.toHaveBeenCalled()
  })

  it('should throw 404 if request not found', async () => {
    MobilityRequest.findById.mockResolvedValue(null)

    await expect(deleteRequest(VALID_ID, hrUser)).rejects.toMatchObject({ status: 404 })
  })
})
