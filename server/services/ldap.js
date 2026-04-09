'use strict'

// =============================================================================
// LDAP Authentication Service
//
// Supports two providers, selected via LDAP_TYPE env var:
//   - activedirectory  → Windows Active Directory (LDAP/LDAPS + UPN bind)
//   - openldap         → Linux OpenLDAP (simple bind with uid/cn filter)
//
// Required env vars (see .env.example):
//   AUTH_PROVIDER=ldap           ← enable LDAP (vs 'local')
//   LDAP_TYPE=activedirectory    ← or 'openldap'
//   LDAP_URL=ldaps://dc.corp.local:636
//   LDAP_BASE_DN=DC=corp,DC=local
//   LDAP_BIND_DN=CN=svc-nanoxplore,OU=Service Accounts,DC=corp,DC=local
//   LDAP_BIND_PASSWORD=...
//   LDAP_USER_SEARCH_BASE=OU=Users,DC=corp,DC=local
//   LDAP_TLS_REJECT_UNAUTHORIZED=true  ← set false only for self-signed certs
//
// Usage (from auth route):
//   const { ldapAuthenticate } = require('../services/ldap')
//   const userInfo = await ldapAuthenticate(username, password)
// =============================================================================

const ldap = require('ldapjs')
const tls  = require('tls')

// ── Search filter templates ───────────────────────────────────────────────

/**
 * Returns the appropriate LDAP search filter for the configured directory type.
 * @param {string} username
 * @returns {string} LDAP filter string
 */
function buildSearchFilter(username) {
  const type = (process.env.LDAP_TYPE || 'activedirectory').toLowerCase()

  if (type === 'activedirectory') {
    // AD: match on sAMAccountName (login name) OR userPrincipalName (UPN)
    return `(|(sAMAccountName=${ldap.escapeFiler(username)})(userPrincipalName=${ldap.escapeFiler(username)}))`
  }

  if (type === 'openldap') {
    // OpenLDAP: match on uid (most common) or cn
    return `(|(uid=${ldap.escapeFiler(username)})(cn=${ldap.escapeFiler(username)}))`
  }

  throw new Error(`Unknown LDAP_TYPE: "${type}". Expected 'activedirectory' or 'openldap'.`)
}

// ── Client factory ────────────────────────────────────────────────────────

/**
 * Creates a configured ldapjs client.
 * @returns {ldap.Client}
 */
function createLdapClient() {
  const rejectUnauthorized = process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== 'false'

  return ldap.createClient({
    url:                process.env.LDAP_URL,
    tlsOptions:         { rejectUnauthorized },
    reconnect:          false,
    connectTimeout:     5000,
    idleTimeout:        10000,
  })
}

// ── Core authentication function ──────────────────────────────────────────

/**
 * Authenticates a user against the configured LDAP directory.
 *
 * Flow:
 *   1. Bind with the service account (LDAP_BIND_DN) to perform a search.
 *   2. Search for the user entry by username.
 *   3. Re-bind with the user's DN + provided password to verify credentials.
 *   4. Return a normalized user object.
 *
 * @param {string} username  - login name (sAMAccountName, uid, or UPN)
 * @param {string} password  - user-provided password
 * @returns {Promise<{dn: string, email: string, displayName: string, groups: string[]}>}
 * @throws {Error} on invalid credentials or LDAP error
 */
async function ldapAuthenticate(username, password) {
  // TODO: implement full authentication flow
  // Skeleton:
  //   const client = createLdapClient()
  //   await bindServiceAccount(client)
  //   const entry  = await searchUser(client, username)
  //   await bindAsUser(client, entry.dn, password)    ← verifies password
  //   client.destroy()
  //   return normalizeEntry(entry)
  throw new Error('LDAP authentication not yet implemented — see server/services/ldap.js')
}

// ── Connectivity test (used at startup for config validation) ─────────────

/**
 * Pings the LDAP server with the service account bind.
 * Called at server start when AUTH_PROVIDER=ldap.
 * @returns {Promise<void>}
 */
async function testLdapConnection() {
  // TODO: bind with service account, log success/failure, destroy client
  const url  = process.env.LDAP_URL
  const type = process.env.LDAP_TYPE || 'activedirectory'
  console.log(`[LDAP] Checking connectivity → ${url} (type: ${type})`)
  // Implement bind test here
}

module.exports = { ldapAuthenticate, testLdapConnection, buildSearchFilter }
