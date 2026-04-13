'use strict'

// Mock the User model used by managerVisibility
jest.mock('../../models/index', () => {
  const User = { find: jest.fn() }
  return { User }
})

const { User } = require('../../models/index')
const {
  getVisibleUserIds,
  canManagerSeeEvaluatee,
  getSubManagerTree,
} = require('../../services/managerVisibility')

// =============================================================================
// Tests — services/managerVisibility.js
// =============================================================================

const id = (n) => `000000000000000000000${n}`.slice(-24)   // fake 24-char ObjectId string

// Helper: make a lean User array from IDs
const userList = (...ids) => ids.map(_id => ({ _id }))

// User.find().lean() — the service always chains .lean() on User.find()
const mockFind = (value) => ({ lean: jest.fn().mockResolvedValue(value) })

describe('managerVisibility', () => {
  afterEach(() => jest.clearAllMocks())

  // ─── getSubManagerTree ────────────────────────────────────────────────────

  describe('getSubManagerTree()', () => {
    it('returns empty array when manager has no sub-managers', async () => {
      User.find.mockReturnValue(mockFind([]))
      const result = await getSubManagerTree(id(1))
      expect(result).toEqual([])
    })

    it('returns direct sub-managers', async () => {
      User.find
        .mockReturnValueOnce(mockFind(userList(id(2), id(3))))  // direct subs
        .mockReturnValue(mockFind([]))                          // no further depth
      const result = await getSubManagerTree(id(1))
      expect(result.map(x => x.toString())).toEqual(
        expect.arrayContaining([id(2), id(3)])
      )
    })

    it('prevents infinite loops via visited set (cycle A-B-A)', async () => {
      User.find
        .mockReturnValueOnce(mockFind(userList(id(2))))   // id(1) sub-managers: id(2)
        .mockReturnValueOnce(mockFind(userList(id(1))))   // id(2) sub-managers: id(1) cycle
        .mockReturnValue(mockFind([]))
      const result = await getSubManagerTree(id(1))
      expect(Array.isArray(result)).toBe(true)
    })

    it('filters by restrictedToManagers when provided', async () => {
      User.find
        .mockReturnValueOnce(mockFind(userList(id(2), id(3))))  // direct subs: 2 and 3
        .mockReturnValue(mockFind([]))
      // Only allow id(2) branch
      const result = await getSubManagerTree(id(1), [{ toString: () => id(2) }])
      expect(result.map(x => x.toString())).toContain(id(2))
      expect(result.map(x => x.toString())).not.toContain(id(3))
    })
  })

  // ─── getVisibleUserIds ─────────────────────────────────────────────────────

  describe('getVisibleUserIds()', () => {
    it('returns only direct reports when no extendedVisibility', async () => {
      User.find.mockReturnValueOnce(mockFind(userList(id(10), id(11))))
      const campaign = { extendedVisibility: [] }
      const result = await getVisibleUserIds(id(1), campaign)
      expect(result).toEqual(expect.arrayContaining([id(10), id(11)]))
      expect(result).toHaveLength(2)
    })

    it('returns empty array when manager has no direct reports', async () => {
      User.find.mockReturnValue(mockFind([]))
      const campaign = { extendedVisibility: [] }
      const result = await getVisibleUserIds(id(1), campaign)
      expect(result).toEqual([])
    })

    it('includes sub-team reports when extendedVisibility grant exists', async () => {
      // id(1) direct reports: id(10)
      // getSubManagerTree(id(1)): sub-managers id(2), then id(2) leaf []
      // reports of sub-manager id(2): id(20)
      User.find
        .mockReturnValueOnce(mockFind(userList(id(10))))    // direct reports of id(1)
        .mockReturnValueOnce(mockFind(userList(id(2))))     // sub-managers of id(1)
        .mockReturnValueOnce(mockFind([]))                  // sub-managers of id(2) (leaf)
        .mockReturnValueOnce(mockFind(userList(id(20))))    // reports of id(2)

      const campaign = {
        extendedVisibility: [{
          managerId: { toString: () => id(1) },
          restrictedToManagers: [],
        }],
      }
      const result = await getVisibleUserIds(id(1), campaign)
      expect(result).toEqual(expect.arrayContaining([id(10), id(20), id(2)]))
    })

    it('deduplicates IDs when same user appears in direct and extended scope', async () => {
      User.find
        .mockReturnValueOnce(mockFind(userList(id(10))))
        .mockReturnValueOnce(mockFind(userList(id(10))))
        .mockReturnValueOnce(mockFind([]))
        .mockReturnValueOnce(mockFind(userList(id(10))))

      const campaign = {
        extendedVisibility: [{ managerId: { toString: () => id(1) }, restrictedToManagers: [] }],
      }
      const result = await getVisibleUserIds(id(1), campaign)
      const unique = [...new Set(result)]
      expect(result).toHaveLength(unique.length)
    })
  })

  // ─── canManagerSeeEvaluatee ───────────────────────────────────────────────

  describe('canManagerSeeEvaluatee()', () => {
    it('returns true when evaluateeId is in visible IDs', async () => {
      User.find.mockReturnValue(mockFind(userList(id(10))))
      const campaign = { extendedVisibility: [] }
      const result = await canManagerSeeEvaluatee(id(1), id(10), campaign)
      expect(result).toBe(true)
    })

    it('returns false when evaluateeId is NOT in visible IDs', async () => {
      User.find.mockReturnValue(mockFind(userList(id(10))))
      const campaign = { extendedVisibility: [] }
      const result = await canManagerSeeEvaluatee(id(1), id(99), campaign)
      expect(result).toBe(false)
    })
  })
})
