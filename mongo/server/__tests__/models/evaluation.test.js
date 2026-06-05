'use strict'

const { VALID_TRANSITIONS, ROLE_TRANSITIONS, LOCKED_STATUSES } = require('../../models/Evaluation')
const { EVALUATION_STATUSES } = require('../../config/constants')

// =============================================================================
// Tests — models/Evaluation.js (static constants & business rules)
// NOTE: Pre-save hook tests require a connected Mongoose instance.
//       We test the exported static constants here (no DB needed).
// =============================================================================

describe('Evaluation model — VALID_TRANSITIONS', () => {
  it('is defined and is an object', () => {
    expect(typeof VALID_TRANSITIONS).toBe('object')
    expect(VALID_TRANSITIONS).not.toBeNull()
  })

  it('covers all evaluation statuses as keys', () => {
    EVALUATION_STATUSES.forEach(status => {
      expect(VALID_TRANSITIONS).toHaveProperty(status)
    })
  })

  it('"validated" has no valid transitions (terminal state)', () => {
    expect(VALID_TRANSITIONS.validated).toEqual([])
  })

  it('"expired" has no valid transitions (terminal state)', () => {
    expect(VALID_TRANSITIONS.expired).toEqual([])
  })

  it('"archived" has no valid transitions (terminal — offboarding cancellation)', () => {
    expect(VALID_TRANSITIONS.archived).toEqual([])
  })

  it('"assigned" can only transition to "in_progress"', () => {
    expect(VALID_TRANSITIONS.assigned).toEqual(['in_progress'])
  })

  it('"in_progress" can only transition to "submitted"', () => {
    expect(VALID_TRANSITIONS.in_progress).toEqual(['submitted'])
  })

  it('"submitted" can only transition to "reviewed"', () => {
    expect(VALID_TRANSITIONS.submitted).toEqual(['reviewed'])
  })

  it('"reviewed" can transition to "signed_evaluatee" or "disputed"', () => {
    expect(VALID_TRANSITIONS.reviewed).toEqual(['signed_evaluatee', 'disputed'])
  })

  it('"disputed" can transition back to "reviewed" or forward to "signed_evaluatee"', () => {
    expect(VALID_TRANSITIONS.disputed).toEqual(['reviewed', 'signed_evaluatee'])
  })

  it('"signed_evaluatee" can only transition to "signed_manager"', () => {
    expect(VALID_TRANSITIONS.signed_evaluatee).toEqual(['signed_manager'])
  })

  it('"signed_manager" can only transition to "signed_hr"', () => {
    expect(VALID_TRANSITIONS.signed_manager).toEqual(['signed_hr'])
  })

  it('"signed_hr" can only transition to "validated"', () => {
    expect(VALID_TRANSITIONS.signed_hr).toEqual(['validated'])
  })

  it('transition chain is linear (each step leads to the next)', () => {
    // Follow the happy path from assigned to validated
    const path = ['assigned', 'in_progress', 'submitted', 'reviewed',
      'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated']
    for (let i = 0; i < path.length - 1; i++) {
      expect(VALID_TRANSITIONS[path[i]]).toContain(path[i + 1])
    }
  })
})

describe('Evaluation model — ROLE_TRANSITIONS', () => {
  it('is defined for employee, manager, hr', () => {
    ['employee', 'manager', 'hr'].forEach(role => {
      expect(ROLE_TRANSITIONS).toHaveProperty(role)
    })
  })
  it('no longer defines the removed director role', () => {
    expect(ROLE_TRANSITIONS).not.toHaveProperty('director')
  })

  describe('employee transitions', () => {
    const emp = ROLE_TRANSITIONS.employee
    it('can start: assigned → in_progress', () => {
      expect(emp.assigned).toContain('in_progress')
    })
    it('can submit: in_progress → submitted', () => {
      expect(emp.in_progress).toContain('submitted')
    })
    it('can sign after review: reviewed → signed_evaluatee', () => {
      expect(emp.reviewed).toContain('signed_evaluatee')
    })
    it('cannot skip review phase directly', () => {
      expect(emp).not.toHaveProperty('submitted')
    })
  })

  describe('manager transitions', () => {
    const mgr = ROLE_TRANSITIONS.manager
    it('can review: submitted → reviewed', () => {
      expect(mgr.submitted).toContain('reviewed')
    })
    it('can co-sign: signed_evaluatee → signed_manager', () => {
      expect(mgr.signed_evaluatee).toContain('signed_manager')
    })
    it('cannot validate directly', () => {
      // Manager should NOT be able to jump to "validated"
      Object.values(mgr).forEach(targets => {
        expect(targets).not.toContain('validated')
      })
    })
  })

  describe('hr transitions', () => {
    const hr = ROLE_TRANSITIONS.hr
    it('can sign from reviewed (bypass if manager absent)', () => {
      expect(hr.reviewed).toContain('signed_hr')
    })
    it('can sign from signed_evaluatee (intentional bypass)', () => {
      expect(hr.signed_evaluatee).toContain('signed_hr')
    })
    it('can sign from signed_manager (normal path)', () => {
      expect(hr.signed_manager).toContain('signed_hr')
    })
    it('can validate after signing (signed_hr → validated)', () => {
      expect(hr.signed_hr).toContain('validated')
    })
    it('cannot transition to "validated" from early statuses (reviewed, signed_evaluatee, signed_manager)', () => {
      // Only signed_hr → validated is allowed for HR; earlier states must not jump to validated
      const earlyStates = ['reviewed', 'signed_evaluatee', 'signed_manager']
      earlyStates.forEach(state => {
        expect(hr[state]).not.toContain('validated')
      })
    })
  })
})

describe('Evaluation model — LOCKED_STATUSES', () => {
  it('is an array', () => {
    expect(Array.isArray(LOCKED_STATUSES)).toBe(true)
  })

  it('contains submitted (first lock point)', () => {
    expect(LOCKED_STATUSES).toContain('submitted')
  })

  it('contains all post-submission statuses including archived', () => {
    ['submitted', 'reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated', 'archived']
      .forEach(s => expect(LOCKED_STATUSES).toContain(s))
  })

  it('does NOT contain assigned or in_progress (editable statuses)', () => {
    expect(LOCKED_STATUSES).not.toContain('assigned')
    expect(LOCKED_STATUSES).not.toContain('in_progress')
  })
})
