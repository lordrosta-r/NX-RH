'use strict'

// =============================================================================
// Unit tests — services/campaignService.js
// Mocked: ../models (Campaign, Evaluation, Form)
// mongoose.startSession is spied in tests that exercise deleteCampaign
// =============================================================================

const mongoose = require('mongoose')

jest.mock('../../models', () => ({
  Campaign: {
    create:   jest.fn(),
    findById: jest.fn(),
  },
  Evaluation: {
    aggregate:      jest.fn(),
    exists:         jest.fn(),
    deleteMany:     jest.fn(),
    countDocuments: jest.fn(),
  },
  Form: {
    find:        jest.fn(),
    deleteMany:  jest.fn(),
    insertMany:  jest.fn(),
  },
  // Minimal transition map used by updateCampaign (not under test here)
  CAMPAIGN_TRANSITIONS: {
    draft:    ['active'],
    active:   ['closed'],
    closed:   ['archived'],
    archived: [],
  },
}))

const { Campaign, Evaluation, Form } = require('../../models')
const {
  createCampaign,
  getCampaignById,
  cloneCampaign,
  deleteCampaign,
} = require('../../services/campaignService')

const VALID_ID  = '507f1f77bcf86cd799439011'
const VALID_ID2 = '507f1f77bcf86cd799439012'
const adminUser = { role: 'admin', _id: VALID_ID2 }

// ── createCampaign ────────────────────────────────────────────────────────────
describe('campaignService — createCampaign()', () => {
  test('creates campaign with required fields and returns populated doc', async () => {
    const created   = { _id: VALID_ID, name: 'Camp A' }
    const populated = { ...created, createdBy: { firstName: 'Alice', lastName: 'Liddell' } }

    Campaign.create.mockResolvedValue(created)
    Campaign.findById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean:     jest.fn().mockResolvedValue(populated),
    })

    const result = await createCampaign(
      { name: 'Camp A', startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31') },
      VALID_ID2,
    )

    expect(Campaign.create).toHaveBeenCalledWith(expect.objectContaining({
      name:      'Camp A',
      createdBy: VALID_ID2,
    }))
    expect(result).toMatchObject({ name: 'Camp A' })
  })

  test('throws 400 when name is missing', async () => {
    await expect(
      createCampaign({ startDate: new Date(), endDate: new Date() }, VALID_ID2),
    ).rejects.toMatchObject({ status: 400 })
  })

  test('throws 400 when endDate is before startDate', async () => {
    await expect(
      createCampaign({
        name:      'Bad Dates',
        startDate: new Date('2025-12-31'),
        endDate:   new Date('2025-01-01'),
      }, VALID_ID2),
    ).rejects.toMatchObject({ status: 400 })
  })

  test('throws 400 for an invalid initial status', async () => {
    await expect(
      createCampaign({
        name:      'Test',
        startDate: new Date('2025-01-01'),
        endDate:   new Date('2025-12-31'),
        status:    'closed',
      }, VALID_ID2),
    ).rejects.toMatchObject({ status: 400 })
  })
})

// ── getCampaignById ───────────────────────────────────────────────────────────
describe('campaignService — getCampaignById()', () => {
  test('throws 400 for an invalid ObjectId', async () => {
    await expect(getCampaignById('not-an-id', adminUser)).rejects.toMatchObject({ status: 400 })
  })

  test('throws 404 when campaign is not found', async () => {
    Campaign.findById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean:     jest.fn().mockResolvedValue(null),
    })
    await expect(getCampaignById(VALID_ID, adminUser)).rejects.toMatchObject({ status: 404 })
  })

  test('returns campaign with stats for admin', async () => {
    Campaign.findById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean:     jest.fn().mockResolvedValue({ _id: VALID_ID, name: 'Camp A', createdBy: {} }),
    })
    Evaluation.aggregate.mockResolvedValue([
      { total: 10, started: 7, submitted: 5, validated: 3 },
    ])

    const result = await getCampaignById(VALID_ID, adminUser)
    expect(result).toMatchObject({ name: 'Camp A' })
    expect(result.stats).toEqual({ total: 10, started: 7, submitted: 5, validated: 3 })
  })

  test('returns zeroed stats when no evaluations exist', async () => {
    Campaign.findById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean:     jest.fn().mockResolvedValue({ _id: VALID_ID, name: 'Empty', createdBy: {} }),
    })
    Evaluation.aggregate.mockResolvedValue([])

    const result = await getCampaignById(VALID_ID, adminUser)
    expect(result.stats).toEqual({ total: 0, started: 0, submitted: 0, validated: 0 })
  })
})

// ── cloneCampaign ─────────────────────────────────────────────────────────────
describe('campaignService — cloneCampaign()', () => {
  const sourceDoc = {
    _id:                VALID_ID,
    name:               'Original',
    startDate:          new Date('2024-01-01'),
    endDate:            new Date('2024-12-31'),
    formIds:            [],
    targetDepartments:  [],
    extendedVisibility: [],
    description:        '',
  }

  beforeEach(() => {
    Campaign.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(sourceDoc) })
    Campaign.create.mockResolvedValue({ _id: VALID_ID2 })
    Form.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })
  })

  test('creates a copy with "(copie)" appended to the source name', async () => {
    await cloneCampaign(VALID_ID, {}, 'user123')
    expect(Campaign.create).toHaveBeenCalledWith(expect.objectContaining({
      name:               'Original (copie)',
      status:             'draft',
      previousCampaignId: VALID_ID,
    }))
  })

  test('uses a custom name when one is provided', async () => {
    await cloneCampaign(VALID_ID, { name: 'Custom Clone' }, 'user123')
    expect(Campaign.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Custom Clone' }))
  })

  test('returns { id, formsCloned } object', async () => {
    const result = await cloneCampaign(VALID_ID, {}, 'user123')
    expect(result).toHaveProperty('id', VALID_ID2)
    expect(result).toHaveProperty('formsCloned', 0)
  })

  test('throws 404 when source campaign is not found', async () => {
    Campaign.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) })
    await expect(cloneCampaign(VALID_ID, {}, 'user123')).rejects.toMatchObject({ status: 404 })
  })

  test('throws 400 for an invalid source ObjectId', async () => {
    await expect(cloneCampaign('bad-id', {}, 'user123')).rejects.toMatchObject({ status: 400 })
  })
})

// ── deleteCampaign ────────────────────────────────────────────────────────────
describe('campaignService — deleteCampaign()', () => {
  test('throws 400 for an invalid ObjectId', async () => {
    await expect(deleteCampaign('bad-id')).rejects.toMatchObject({ status: 400 })
  })

  test('throws 404 when campaign is not found', async () => {
    Campaign.findById.mockResolvedValue(null)
    await expect(deleteCampaign(VALID_ID)).rejects.toMatchObject({ status: 404 })
  })

  test('throws 400 when campaign is active', async () => {
    Campaign.findById.mockResolvedValue({ _id: VALID_ID, status: 'active', formIds: [], deleteOne: jest.fn() })
    await expect(deleteCampaign(VALID_ID)).rejects.toMatchObject({ status: 400 })
  })

  test('throws 400 when campaign is closed (not draft or archived)', async () => {
    Campaign.findById.mockResolvedValue({ _id: VALID_ID, status: 'closed', formIds: [], deleteOne: jest.fn() })
    await expect(deleteCampaign(VALID_ID)).rejects.toMatchObject({ status: 400 })
  })

  test('deletes draft campaign via fallback when transactions are unavailable', async () => {
    const mockCampaign = {
      _id:      VALID_ID,
      status:   'draft',
      formIds:  [],
      deleteOne: jest.fn().mockResolvedValue({}),
    }
    Campaign.findById.mockResolvedValue(mockCampaign)
    Evaluation.deleteMany.mockResolvedValue({})
    Form.deleteMany.mockResolvedValue({})

    jest.spyOn(mongoose, 'startSession').mockResolvedValue({
      withTransaction: jest.fn().mockRejectedValue(
        Object.assign(new Error('Transaction requires replica set'), { code: 20 }),
      ),
      endSession: jest.fn().mockResolvedValue(),
    })

    const result = await deleteCampaign(VALID_ID)

    expect(Evaluation.deleteMany).toHaveBeenCalledWith({ campaignId: VALID_ID })
    expect(mockCampaign.deleteOne).toHaveBeenCalled()
    expect(result).toBe(mockCampaign)
  })

  test('deletes archived campaign via fallback when transactions are unavailable', async () => {
    const mockCampaign = {
      _id:      VALID_ID,
      status:   'archived',
      formIds:  [],
      deleteOne: jest.fn().mockResolvedValue({}),
    }
    Campaign.findById.mockResolvedValue(mockCampaign)
    Evaluation.deleteMany.mockResolvedValue({})
    Form.deleteMany.mockResolvedValue({})

    jest.spyOn(mongoose, 'startSession').mockResolvedValue({
      withTransaction: jest.fn().mockRejectedValue(
        Object.assign(new Error('replica'), { code: 20 }),
      ),
      endSession: jest.fn().mockResolvedValue(),
    })

    await expect(deleteCampaign(VALID_ID)).resolves.toBe(mockCampaign)
  })
})
