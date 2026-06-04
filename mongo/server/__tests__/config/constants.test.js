'use strict'

const {
  ROLES, DEPARTMENTS, QUESTION_TYPES, FORM_TYPES,
  ADMIN_ROLES, MANAGER_ROLES,
  EVENT_TYPES, RESOURCE_TYPES,
  CAMPAIGN_STATUSES, EVALUATION_STATUSES, AUTH_SOURCES,
  BCRYPT_ROUNDS,
} = require('../../config/constants')

// =============================================================================
// Tests — config/constants.js
// =============================================================================

describe('constants', () => {
  describe('ROLES', () => {
    it('is an array', () => expect(Array.isArray(ROLES)).toBe(true))
    it('contains admin, hr, manager, employee', () => {
      expect(ROLES).toEqual(expect.arrayContaining(['admin', 'hr', 'manager', 'employee']))
    })
    it('has exactly 4 roles', () => expect(ROLES).toHaveLength(4))
    it('does not contain the removed director role', () => expect(ROLES).not.toContain('director'))
  })

  describe('ADMIN_ROLES', () => {
    it('contains admin and hr', () => {
      expect(ADMIN_ROLES).toContain('admin')
      expect(ADMIN_ROLES).toContain('hr')
    })
    it('does not contain employee or manager', () => {
      expect(ADMIN_ROLES).not.toContain('employee')
      expect(ADMIN_ROLES).not.toContain('manager')
    })
  })

  describe('MANAGER_ROLES', () => {
    it('contains admin, hr, manager', () => {
      expect(MANAGER_ROLES).toEqual(expect.arrayContaining(['admin', 'hr', 'manager']))
    })
    it('does not contain employee', () => {
      expect(MANAGER_ROLES).not.toContain('employee')
    })
  })

  describe('EVALUATION_STATUSES', () => {
    const expected = [
      'assigned', 'in_progress', 'submitted', 'reviewed',
      'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated', 'expired',
      'archived', 'rejected',
    ]
    it('has all 11 statuses', () => expect(EVALUATION_STATUSES).toHaveLength(11))
    it('contains all expected status values', () => {
      expect(EVALUATION_STATUSES).toEqual(expect.arrayContaining(expected))
    })
    it('first status is "assigned"', () => expect(EVALUATION_STATUSES[0]).toBe('assigned'))
    it('contains terminal status "expired"', () => expect(EVALUATION_STATUSES).toContain('expired'))
    it('contains terminal status "archived" (offboarding cancellation)', () => {
      expect(EVALUATION_STATUSES).toContain('archived')
    })
    it('contains terminal status "rejected" (HR refusal)', () => {
      expect(EVALUATION_STATUSES).toContain('rejected')
    })
  })

  describe('CAMPAIGN_STATUSES', () => {
    it('contains draft, active, closed, archived', () => {
      expect(CAMPAIGN_STATUSES).toEqual(expect.arrayContaining(['draft', 'active', 'closed', 'archived']))
    })
  })

  describe('AUTH_SOURCES', () => {
    it('contains local and ldap', () => {
      expect(AUTH_SOURCES).toEqual(expect.arrayContaining(['local', 'ldap']))
    })
    it('has exactly 2 sources', () => expect(AUTH_SOURCES).toHaveLength(2))
  })

  describe('QUESTION_TYPES', () => {
    it('contains rating, text, yes_no, choice', () => {
      expect(QUESTION_TYPES).toEqual(expect.arrayContaining(['rating', 'text', 'yes_no', 'choice']))
    })
  })

  describe('FORM_TYPES', () => {
    it('contains upward_feedback (always anonymous)', () => {
      expect(FORM_TYPES).toContain('upward_feedback')
    })
    it('contains manager_evaluation', () => {
      expect(FORM_TYPES).toContain('manager_evaluation')
    })
  })

  describe('BCRYPT_ROUNDS', () => {
    it('is a number', () => expect(typeof BCRYPT_ROUNDS).toBe('number'))
    it('is at least 10', () => expect(BCRYPT_ROUNDS).toBeGreaterThanOrEqual(10))
    it('is at most 14 (performance limit)', () => expect(BCRYPT_ROUNDS).toBeLessThanOrEqual(14))
  })

  describe('DEPARTMENTS', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(DEPARTMENTS)).toBe(true)
      expect(DEPARTMENTS.length).toBeGreaterThan(0)
    })
    it('contains HR and Engineering', () => {
      expect(DEPARTMENTS).toContain('HR')
      expect(DEPARTMENTS).toContain('Engineering')
    })
  })

  describe('EVENT_TYPES', () => {
    it('contains deadline and campaign', () => {
      expect(EVENT_TYPES).toContain('deadline')
      expect(EVENT_TYPES).toContain('campaign')
    })
  })

  describe('RESOURCE_TYPES', () => {
    it('contains common document formats', () => {
      expect(RESOURCE_TYPES).toEqual(expect.arrayContaining(['pdf', 'xlsx', 'docx', 'pptx']))
    })
  })
})
