'use strict'

// =============================================================================
// Tests — models/User.js (static rules & schema validation — no DB required)
//
// Strategy : Mongoose's doc.validate() runs validators synchronously without
// a live connection, which lets us check required/enum/format rules in Jest.
// Pre-save hooks that call bcrypt or traverse the DB are exercised separately
// via integration tests (not included here).
// =============================================================================

const mongoose = require('mongoose')
const User     = require('../../models/User')
const { ROLES, DEPARTMENTS, LOCALES, THEMES, NOTIF_PREF_KEYS, AUTH_SOURCES } = require('../../config/constants')

// Minimal valid user payload — every test customises only the field under test
function validPayload(overrides = {}) {
  return new User({
    email:        'test@example.com',
    firstName:    'Alice',
    lastName:     'Martin',
    role:         'employee',
    authSource:   'local',
    ...overrides,
  })
}

// Helper : returns the first validation error message for a given path
async function validationError(doc, path) {
  try {
    await doc.validate()
    return null
  } catch (err) {
    return err.errors?.[path]?.message ?? null
  }
}

// =============================================================================
// Constants exported by User (indirect — via constants.js)
// =============================================================================

describe('User model — constants', () => {
  it('ROLES contains the expected roles', () => {
    expect(ROLES).toEqual(expect.arrayContaining(['admin', 'hr', 'manager', 'employee']))
  })

  it('LOCALES contains fr and en', () => {
    expect(LOCALES).toContain('fr')
    expect(LOCALES).toContain('en')
  })

  it('THEMES contains dark, light, light-sidebar', () => {
    expect(THEMES).toContain('dark')
    expect(THEMES).toContain('light')
    expect(THEMES).toContain('light-sidebar')
  })

  it('NOTIF_PREF_KEYS contains expected keys', () => {
    const expected = ['campaignLaunch', 'evaluationAssigned', 'evaluationSubmitted',
      'deadlineReminder', 'managerActionRequired', 'systemAlerts']
    expected.forEach(k => expect(NOTIF_PREF_KEYS).toContain(k))
  })

  it('AUTH_SOURCES contains local and ldap', () => {
    expect(AUTH_SOURCES).toContain('local')
    expect(AUTH_SOURCES).toContain('ldap')
  })
})

// =============================================================================
// Required fields
// =============================================================================

describe('User model — required fields', () => {
  it('fails validation when email is missing', async () => {
    const doc = validPayload({ email: undefined })
    const msg = await validationError(doc, 'email')
    expect(msg).toBeTruthy()
  })

  it('fails validation when firstName is missing', async () => {
    const doc = validPayload({ firstName: undefined })
    const msg = await validationError(doc, 'firstName')
    expect(msg).toBeTruthy()
  })

  it('fails validation when lastName is missing', async () => {
    const doc = validPayload({ lastName: undefined })
    const msg = await validationError(doc, 'lastName')
    expect(msg).toBeTruthy()
  })

  it('defaults to "employee" when role is not provided (has a default)', () => {
    // role has default:'employee', so omitting it does NOT produce a validation error.
    // The schema guarantees a role is always set; tested via the defaults test below.
    const doc = new User({ email: 'x@x.com', firstName: 'A', lastName: 'B' })
    expect(doc.role).toBe('employee')
  })

  it('passes validation with all required fields set', async () => {
    const doc = validPayload()
    await expect(doc.validate()).resolves.toBeUndefined()
  })
})

// =============================================================================
// Email validation
// =============================================================================

describe('User model — email validation', () => {
  it('rejects an email without @', async () => {
    const doc = validPayload({ email: 'notanemail' })
    const msg = await validationError(doc, 'email')
    expect(msg).toMatch(/invalide/i)
  })

  it('rejects an email without TLD', async () => {
    const doc = validPayload({ email: 'user@domain' })
    const msg = await validationError(doc, 'email')
    expect(msg).toMatch(/invalide/i)
  })

  it('rejects an email with spaces', async () => {
    const doc = validPayload({ email: 'a b@example.com' })
    const msg = await validationError(doc, 'email')
    expect(msg).toMatch(/invalide/i)
  })

  it('accepts a valid email', async () => {
    const doc = validPayload({ email: 'alice.martin@corp.io' })
    const msg = await validationError(doc, 'email')
    expect(msg).toBeNull()
  })

  it('normalises email to lowercase (Mongoose lowercase:true)', () => {
    const doc = validPayload({ email: 'Alice@CORP.COM' })
    expect(doc.email).toBe('alice@corp.com')
  })
})

// =============================================================================
// Role validation
// =============================================================================

describe('User model — role enum', () => {
  it('rejects an unknown role', async () => {
    const doc = validPayload({ role: 'superuser' })
    const msg = await validationError(doc, 'role')
    expect(msg).toBeTruthy()
  })

  it.each(ROLES)('accepts valid role: %s', async (role) => {
    const doc = validPayload({ role })
    const msg = await validationError(doc, 'role')
    expect(msg).toBeNull()
  })

  it('defaults to "employee" when no role is given but field is present', () => {
    const doc = new User({ email: 'x@x.com', firstName: 'A', lastName: 'B' })
    expect(doc.role).toBe('employee')
  })
})

// =============================================================================
// Department validation
// =============================================================================

describe('User model — department (liste dynamique en DB)', () => {
  it('accepts null department', async () => {
    const doc = validPayload({ department: null })
    const msg = await validationError(doc, 'department')
    expect(msg).toBeNull()
  })

  // L'enum figé a été retiré du modèle : la validation se fait désormais au
  // niveau des routes contre la liste gérée en DB (departmentsService).
  it('accepts any string department at the model level (validation route-level)', async () => {
    const doc = validPayload({ department: 'UnNouveauDepartement' })
    const msg = await validationError(doc, 'department')
    expect(msg).toBeNull()
  })

  it.each(DEPARTMENTS)('accepts default department: %s', async (dept) => {
    const doc = validPayload({ department: dept })
    const msg = await validationError(doc, 'department')
    expect(msg).toBeNull()
  })
})

// =============================================================================
// Notification preferences validation
// =============================================================================

describe('User model — notificationPrefs', () => {
  it('rejects prefs with an unknown key', async () => {
    const doc = validPayload({ notificationPrefs: { unknownKey: true } })
    const msg = await validationError(doc, 'notificationPrefs')
    expect(msg).toBeTruthy()
  })

  it('rejects prefs with a non-boolean value', async () => {
    const doc = validPayload({ notificationPrefs: { evaluationAssigned: 'yes' } })
    const msg = await validationError(doc, 'notificationPrefs')
    expect(msg).toBeTruthy()
  })

  it('accepts valid prefs', async () => {
    const doc = validPayload({ notificationPrefs: { evaluationAssigned: false, deadlineReminder: true } })
    const msg = await validationError(doc, 'notificationPrefs')
    expect(msg).toBeNull()
  })
})

// =============================================================================
// bcrypt hash detection regex (used in pre-save hook)
// =============================================================================

describe('User model — bcrypt hash detection regex', () => {
  // The regex is: /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/
  // We test it directly via the RegExp used in the model source.
  const BCRYPT_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/

  it('matches a real bcrypt hash', () => {
    const hash = '$2b$12$eImiTXuWVxfM37uY4JANjQ.JiHnlJMj.7HXeD1.jUJJdV2Cri3eNi'
    expect(BCRYPT_RE.test(hash)).toBe(true)
  })

  it('does not match a plain password', () => {
    expect(BCRYPT_RE.test('Admin1234!')).toBe(false)
  })

  it('does not match an empty string', () => {
    expect(BCRYPT_RE.test('')).toBe(false)
  })
})

// =============================================================================
// offboardingStatus enum
// =============================================================================

describe('User model — offboardingStatus', () => {
  it('defaults to "active"', () => {
    const doc = validPayload()
    expect(doc.offboardingStatus).toBe('active')
  })

  it('rejects an invalid offboardingStatus', async () => {
    const doc = validPayload({ offboardingStatus: 'retired' })
    const msg = await validationError(doc, 'offboardingStatus')
    expect(msg).toBeTruthy()
  })

  it.each(['active', 'offboarding', 'offboarded'])('accepts "%s"', async (status) => {
    const doc = validPayload({ offboardingStatus: status })
    const msg = await validationError(doc, 'offboardingStatus')
    expect(msg).toBeNull()
  })
})

// =============================================================================
// versionKey removed from schema
// =============================================================================

describe('User model — schema options', () => {
  it('does not include __v in toObject() output', () => {
    const doc = validPayload()
    const obj = doc.toObject()
    expect(obj.__v).toBeUndefined()
  })
})

// =============================================================================
// phone + avatar fields exist in schema
// =============================================================================

describe('User model — phone and avatar fields', () => {
  it('has a phone field defaulting to null', () => {
    const doc = validPayload()
    expect(Object.prototype.hasOwnProperty.call(doc.toObject(), 'phone')).toBe(true)
    expect(doc.phone).toBeNull()
  })

  it('has an avatar field defaulting to null', () => {
    const doc = validPayload()
    expect(Object.prototype.hasOwnProperty.call(doc.toObject(), 'avatar')).toBe(true)
    expect(doc.avatar).toBeNull()
  })

  it('rejects a phone longer than 30 chars', async () => {
    const doc = validPayload({ phone: 'a'.repeat(31) })
    const msg = await validationError(doc, 'phone')
    expect(msg).toBeTruthy()
  })
})

// Disconnect mongoose to let Jest exit cleanly (no open handle)
afterAll(() => mongoose.disconnect())
