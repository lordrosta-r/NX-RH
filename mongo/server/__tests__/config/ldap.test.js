'use strict'

// Mock ldapjs before requiring ldap config
jest.mock('ldapjs', () => ({
  createClient: jest.fn().mockReturnValue({ bind: jest.fn(), unbind: jest.fn() }),
}))

// =============================================================================
// Tests — config/ldap.js
// =============================================================================

describe('ldap config', () => {
  let ldap

  beforeEach(() => {
    jest.resetModules()
    // Clean LDAP env vars
    delete process.env.LDAP_URL
    delete process.env.LDAP_BASE_DN
    delete process.env.LDAP_BIND_DN
    delete process.env.LDAP_BIND_PASSWORD
    delete process.env.LDAP_USER_FILTER
    delete process.env.LDAP_TLS_REJECT_UNAUTHORIZED
    // Re-require after resetting modules and env
    ldap = require('../../config/ldap')
  })

  describe('isEnabled()', () => {
    it('returns false when LDAP_URL is not set', () => {
      expect(ldap.isEnabled()).toBe(false)
    })

    it('returns true when LDAP_URL is set', () => {
      process.env.LDAP_URL = 'ldaps://dc.corp.com:636'
      jest.resetModules()
      ldap = require('../../config/ldap')
      expect(ldap.isEnabled()).toBe(true)
    })
  })

  describe('getConfig()', () => {
    it('throws when required env vars are missing', () => {
      expect(() => ldap.getConfig()).toThrow('[LDAP]')
    })

    it('returns config when all vars are set', () => {
      process.env.LDAP_URL             = 'ldaps://dc.corp.com:636'
      process.env.LDAP_BASE_DN         = 'ou=people,dc=corp,dc=com'
      process.env.LDAP_BIND_DN         = 'cn=svc,dc=corp,dc=com'
      process.env.LDAP_BIND_PASSWORD   = 'secret'
      process.env.LDAP_USER_FILTER     = '(sAMAccountName={{u}})'
      jest.resetModules()
      ldap = require('../../config/ldap')

      const config = ldap.getConfig()
      expect(config.url).toBe('ldaps://dc.corp.com:636')
      expect(config.baseDn).toBe('ou=people,dc=corp,dc=com')
      expect(config.bindDn).toBe('cn=svc,dc=corp,dc=com')
      expect(config.bindPw).toBe('secret')
      expect(config.filter).toBe('(sAMAccountName={{u}})')
    })

    it('sets rejectUnauthorized to true by default (secure)', () => {
      process.env.LDAP_URL           = 'ldaps://dc.corp.com:636'
      process.env.LDAP_BASE_DN       = 'ou=people,dc=corp,dc=com'
      process.env.LDAP_BIND_DN       = 'cn=svc,dc=corp,dc=com'
      process.env.LDAP_BIND_PASSWORD = 'secret'
      process.env.LDAP_USER_FILTER   = '(uid={{u}})'
      jest.resetModules()
      ldap = require('../../config/ldap')

      const config = ldap.getConfig()
      expect(config.tlsOptions.rejectUnauthorized).toBe(true)
    })

    it('sets rejectUnauthorized to false when LDAP_TLS_REJECT_UNAUTHORIZED=false', () => {
      process.env.LDAP_URL                        = 'ldap://localhost:389'
      process.env.LDAP_BASE_DN                    = 'dc=test,dc=com'
      process.env.LDAP_BIND_DN                    = 'cn=admin,dc=test,dc=com'
      process.env.LDAP_BIND_PASSWORD              = 'pass'
      process.env.LDAP_USER_FILTER                = '(uid={{u}})'
      process.env.LDAP_TLS_REJECT_UNAUTHORIZED    = 'false'
      jest.resetModules()
      ldap = require('../../config/ldap')

      const config = ldap.getConfig()
      expect(config.tlsOptions.rejectUnauthorized).toBe(false)
    })
  })

  describe('buildFilter() — LDAP injection prevention', () => {
    beforeEach(() => {
      process.env.LDAP_URL           = 'ldaps://dc.corp.com:636'
      process.env.LDAP_BASE_DN       = 'ou=people,dc=corp,dc=com'
      process.env.LDAP_BIND_DN       = 'cn=svc,dc=corp,dc=com'
      process.env.LDAP_BIND_PASSWORD = 'secret'
      process.env.LDAP_USER_FILTER   = '(sAMAccountName={{u}})'
      jest.resetModules()
      ldap = require('../../config/ldap')
    })

    it('replaces {{u}} with the username', () => {
      const filter = ldap.buildFilter('alice')
      expect(filter).toBe('(sAMAccountName=alice)')
    })

    it('escapes asterisk (*) — wildcard injection', () => {
      const filter = ldap.buildFilter('*')
      expect(filter).toContain('\\2a')
      expect(filter).not.toContain('*)')
    })

    it('escapes opening parenthesis ( — injection vector', () => {
      const filter = ldap.buildFilter('alice)(|(uid=*)')
      expect(filter).toContain('\\28')
      expect(filter).not.toContain('(|(uid=*)')
    })

    it('escapes closing parenthesis )', () => {
      const filter = ldap.buildFilter('alice)')
      expect(filter).toContain('\\29')
    })

    it('escapes backslash', () => {
      const filter = ldap.buildFilter('alice\\hack')
      expect(filter).toContain('\\5c')
    })

    it('escapes null byte', () => {
      const filter = ldap.buildFilter('alice\0hack')
      expect(filter).toContain('\\00')
    })

    it('classic LDAP injection vector *)(&(password=*) is neutralised', () => {
      const filter = ldap.buildFilter('*)(&(password=*')
      // Must NOT produce a valid compound filter
      expect(filter).not.toMatch(/\*\)/)
      expect(filter).toContain('\\2a')
      expect(filter).toContain('\\28')
      expect(filter).toContain('\\29')
    })

    it('passes through normal alphanumeric usernames unchanged', () => {
      const filter = ldap.buildFilter('john.doe')
      expect(filter).toBe('(sAMAccountName=john.doe)')
    })
  })
})
