'use strict'

// =============================================================================
// services/ldapService.js — Intégration LDAP (PAS SSO, PAS SAML)
//
// Fonctions:
//   testConnection(config)  → { ok, info? } | { ok, error }
//   previewUsers(config)    → Array<entry> (max 50)
//   syncUsers(config)       → { created, updated, skipped, errors[] }
//
// Config shape attendue:
//   { host, bindDN, bindPassword, baseDN, userFilter,
//     attrFirstName, attrLastName, attrEmail, attrDepartment, attrTitle,
//     defaultRole }
// =============================================================================

const ldap    = require('ldapjs')
const bcrypt  = require('bcrypt')
const { randomUUID }    = require('crypto')
const User              = require('../models/User')
const { BCRYPT_ROUNDS } = require('../config/constants')
const logger            = require('../utils/logger')

// ─── Helpers ─────────────────────────────────────────────────────────────────

function validate(config) {
  if (!config.host || !config.bindDN || !config.baseDN) {
    throw new Error('Champs obligatoires manquants : host, bindDN, baseDN')
  }
}

function makeClient(config) {
  // TLS certificate verification (default: true)
  // Override via config.rejectUnauthorized or LDAP_TLS_REJECT_UNAUTHORIZED env var.
  const rejectUnauthorized = config.rejectUnauthorized !== undefined
    ? config.rejectUnauthorized
    : (process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== 'false')

  const client = ldap.createClient({
    url:            config.host,
    connectTimeout: 5000,
    timeout:        10000,
    tlsOptions:     { rejectUnauthorized },
  })
  // Prevent unhandled 'error' event from crashing the process
  client.on('error', (err) => logger.warn('[LDAP] Erreur client', { error: err.message }))
  return client
}

function bindAsync(client, dn, password) {
  return new Promise((resolve, reject) => {
    client.bind(dn, password, (err) => {
      if (err) return reject(err)
      resolve()
    })
  })
}

function unbindAsync(client) {
  return new Promise((resolve) => {
    try {
      client.unbind((err) => {
        if (err) logger.warn('[LDAP] Erreur unbind', { error: err.message })
        resolve()
      })
    } catch (_) {
      resolve()
    }
  })
}

function searchAsync(client, base, opts) {
  return new Promise((resolve, reject) => {
    const entries = []
    client.search(base, opts, (err, res) => {
      if (err) return reject(err)
      res.on('searchEntry', (entry) => {
        // entry.object includes dn + all attributes as a plain JS object
        const obj = entry.object || {}
        if (!obj.dn) obj.dn = entry.dn ? String(entry.dn) : ''
        entries.push(obj)
      })
      res.on('error',  (e)      => reject(e))
      res.on('end',    (result) => {
        if (result.status !== 0) {
          return reject(new Error(`Statut LDAP inattendu : ${result.status}`))
        }
        resolve(entries)
      })
    })
  })
}

// Retourne la première valeur d'un attribut LDAP (string ou tableau).
function getVal(entry, attr) {
  // eslint-disable-next-line security/detect-object-injection
  const v = entry[attr]
  if (!v) return null
  return Array.isArray(v) ? v[0] : String(v)
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Teste la connexion LDAP (bind + unbind).
 * Ne lance jamais d'exception — renvoie toujours { ok, info? | error }.
 */
async function testConnection(config) {
  if (!config.host || !config.bindDN || !config.baseDN) {
    return { ok: false, error: 'Champs obligatoires manquants : host, bindDN, baseDN' }
  }
  const client = makeClient(config)
  try {
    await bindAsync(client, config.bindDN, config.bindPassword || '')
    await unbindAsync(client)
    return { ok: true, info: `Connexion établie sur ${config.host}` }
  } catch (err) {
    try { await unbindAsync(client) } catch (_) { /* ignore */ }
    return { ok: false, error: `Erreur LDAP : ${err.message}` }
  }
}

/**
 * Prévisualise les utilisateurs trouvés dans l'annuaire (max 50).
 * @returns {Array<Object>}  Entrées LDAP brutes (attributs + dn)
 */
async function previewUsers(config) {
  validate(config)
  const attrEmail = config.attrEmail      || 'mail'
  const attrFirst = config.attrFirstName  || 'givenName'
  const attrLast  = config.attrLastName   || 'sn'
  const attrDept  = config.attrDepartment || 'department'
  const attrTitle = config.attrTitle      || 'title'

  const client = makeClient(config)
  try {
    await bindAsync(client, config.bindDN, config.bindPassword || '')
    const entries = await searchAsync(client, config.baseDN, {
      scope:      'sub',
      filter:     config.userFilter || '(objectClass=person)',
      sizeLimit:  50,
      attributes: ['dn', 'cn', attrEmail, attrFirst, attrLast, attrDept, attrTitle],
    })
    await unbindAsync(client)
    return entries
  } catch (err) {
    try { await unbindAsync(client) } catch (_) { /* ignore */ }
    throw new Error(`Prévisualisation impossible : ${err.message}`, { cause: err })
  }
}

/**
 * Synchronise les utilisateurs LDAP vers MongoDB (upsert sur email).
 * Ne jamais écraser le mot de passe des utilisateurs existants.
 * @returns {{ created, updated, skipped, errors[] }}
 */
async function syncUsers(config) {
  validate(config)
  const attrEmail = config.attrEmail      || 'mail'
  const attrFirst = config.attrFirstName  || 'givenName'
  const attrLast  = config.attrLastName   || 'sn'
  const attrDept  = config.attrDepartment || 'department'
  const attrTitle = config.attrTitle      || 'title'
  const defaultRole = config.defaultRole  || 'employee'

  const client = makeClient(config)
  const report = { created: 0, updated: 0, skipped: 0, errors: [] }

  try {
    await bindAsync(client, config.bindDN, config.bindPassword || '')
    const entries = await searchAsync(client, config.baseDN, {
      scope:      'sub',
      filter:     config.userFilter || '(objectClass=person)',
      sizeLimit:  1000,
      attributes: ['dn', attrEmail, attrFirst, attrLast, attrDept, attrTitle],
    })
    await unbindAsync(client)

    for (const entry of entries) {
      const email = getVal(entry, attrEmail)
      if (!email) { report.skipped++; continue }

      const firstName = getVal(entry, attrFirst)  || 'Inconnu'
      const lastName  = getVal(entry, attrLast)   || 'Inconnu'
      const dept      = getVal(entry, attrDept)
      const position  = getVal(entry, attrTitle)
      const dn        = entry.dn || ''

      try {
        const existing = await User.findOne({ email: email.toLowerCase() })
          .select('_id')
          .lean()

        if (existing) {
          const updates = { firstName, lastName, ldapDn: dn, authSource: 'ldap' }
          if (dept)     updates.department = dept
          if (position) updates.position   = position
          await User.findByIdAndUpdate(existing._id, { $set: updates })
          report.updated++
        } else {
          // Mot de passe aléatoire — l'utilisateur s'authentifiera via LDAP
          const randomPwd = await bcrypt.hash(randomUUID(), BCRYPT_ROUNDS)
          await User.create({
            email:        email.toLowerCase(),
            firstName,
            lastName,
            passwordHash: randomPwd,
            authSource:   'ldap',
            ldapDn:       dn,
            role:         defaultRole,
            department:   dept     || null,
            position:     position || null,
            isActive:     true,
          })
          report.created++
        }
      } catch (userErr) {
        report.errors.push(`${email}: ${userErr.message}`)
      }
    }

    return report
  } catch (err) {
    try { await unbindAsync(client) } catch (_) { /* ignore */ }
    throw new Error(`Synchronisation impossible : ${err.message}`, { cause: err })
  }
}

module.exports = { testConnection, previewUsers, syncUsers }
