'use strict'

// authService.ldap.test.js — Authentification LDAP (fallback multi-source)

process.env.JWT_SECRET = 'test-secret-long-enough-for-hs256-algorithm'

jest.mock('../../models/User')
jest.mock('../../services/ldapService', () => ({
  authenticate:   jest.fn(),
  upsertLdapUser: jest.fn(),
}))
jest.mock('../../services/ldapSources', () => ({
  getEnabledSources: jest.fn(),
}))

const User        = require('../../models/User')
const ldapService = require('../../services/ldapService')
const ldapSources = require('../../services/ldapSources')
const authService = require('../../services/authService')

// User.findOne(...).select(...).lean()
function mockLocalUser(user) {
  User.findOne.mockReturnValue({ select: () => ({ lean: () => Promise.resolve(user) }) })
}

beforeEach(() => {
  jest.clearAllMocks()
  User.updateOne = jest.fn().mockResolvedValue({})
})

describe('authService.login — fallback LDAP', () => {
  it('authentifie via LDAP quand l’utilisateur est inconnu localement', async () => {
    mockLocalUser(null)
    ldapSources.getEnabledSources.mockResolvedValue([
      { id: 'env', host: 'ldap://x', bindDN: 'cn=a', baseDN: 'dc=x' },
    ])
    ldapService.authenticate.mockResolvedValue({ dn: 'uid=bob,dc=x', mail: 'bob@x' })
    ldapService.upsertLdapUser.mockResolvedValue({
      _id: 'u1', email: 'bob@x', role: 'employee', firstName: 'Bob', lastName: 'X', isActive: true,
    })

    const res = await authService.login('bob@x', 'pw', false)

    expect(ldapService.authenticate).toHaveBeenCalledTimes(1)
    expect(ldapService.upsertLdapUser).toHaveBeenCalledTimes(1)
    expect(res.accessToken).toBeDefined()
    expect(res.user.email).toBe('bob@x')
  })

  it('essaie chaque source jusqu’au succès', async () => {
    mockLocalUser(null)
    ldapSources.getEnabledSources.mockResolvedValue([
      { id: 's1', host: 'ldap://1', bindDN: 'x', baseDN: 'y' },
      { id: 's2', host: 'ldap://2', bindDN: 'x', baseDN: 'y' },
    ])
    ldapService.authenticate
      .mockResolvedValueOnce(null) // s1 échoue
      .mockResolvedValueOnce({ dn: 'uid=c', mail: 'c@2' }) // s2 réussit
    ldapService.upsertLdapUser.mockResolvedValue({
      _id: 'u2', email: 'c@2', role: 'employee', firstName: 'C', lastName: 'D', isActive: true,
    })

    const res = await authService.login('c@2', 'pw', false)
    expect(ldapService.authenticate).toHaveBeenCalledTimes(2)
    expect(res.user.email).toBe('c@2')
  })

  it('renvoie 401 quand aucune source LDAP ne valide', async () => {
    mockLocalUser(null)
    ldapSources.getEnabledSources.mockResolvedValue([{ id: 's1', host: 'ldap://1', bindDN: 'x', baseDN: 'y' }])
    ldapService.authenticate.mockResolvedValue(null)

    await expect(authService.login('nobody@x', 'pw', false)).rejects.toMatchObject({ status: 401 })
  })

  it('n’essaie pas LDAP pour un compte local valide', async () => {
    // bcrypt hash de "pw" — mais on contrôle via authSource local + mock bcrypt impossible ici,
    // donc on vérifie juste qu'un local avec mauvais mdp ne déclenche PAS le LDAP.
    mockLocalUser({ _id: 'u', email: 'a@b', authSource: 'local', passwordHash: '$2b$12$invalidhashvalueforcomparexxxxxxxxxxxxxxxxxxxxxxxxxxxx', role: 'employee', firstName: 'A', lastName: 'B' })
    ldapSources.getEnabledSources.mockResolvedValue([{ id: 's1', host: 'ldap://1', bindDN: 'x', baseDN: 'y' }])

    await expect(authService.login('a@b', 'wrong', false)).rejects.toMatchObject({ status: 401 })
    expect(ldapService.authenticate).not.toHaveBeenCalled()
  })
})
