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
  // Override via config.rejectUnauthorized ou LDAP_TLS_REJECT_UNAUTHORIZED env var.
  // SÉCURITÉ : en production, on FORCE la vérification — aucune source ne peut
  // la désactiver (anti-MITM).
  const rejectUnauthorized = process.env.NODE_ENV === 'production'
    ? true
    : config.rejectUnauthorized !== undefined
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

// Convertit une entrée searchEntry (ldapjs 3.x) en objet plat { dn, attr: value }.
// ldapjs 3 n'expose plus entry.object : les attributs sont dans entry.pojo.attributes
// (tableau { type, values }) et le DN dans pojo.objectName.
function entryToObject(entry) {
  const pojo = entry.pojo || entry
  const obj  = { dn: pojo.objectName || (entry.dn ? String(entry.dn) : '') }
  for (const a of (pojo.attributes || entry.attributes || [])) {
    obj[a.type] = Array.isArray(a.values) && a.values.length === 1 ? a.values[0] : a.values
  }
  return obj
}

function searchAsync(client, base, opts) {
  return new Promise((resolve, reject) => {
    const entries = []
    client.search(base, opts, (err, res) => {
      if (err) return reject(err)
      res.on('searchEntry', (entry) => {
        entries.push(entryToObject(entry))
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
      // Élargi (500) pour permettre à l'admin de voir TOUS les utilisateurs de l'annuaire.
      sizeLimit:  config.previewLimit || 500,
      attributes: ['dn', 'cn', attrEmail, attrFirst, attrLast, attrDept, attrTitle],
    })
    await unbindAsync(client)
    return entries
  } catch (err) {
    try { await unbindAsync(client) } catch (_) { /* ignore */ }
    throw new Error(`Prévisualisation impossible : ${err.message}`, { cause: err })
  }
}

// Échappe une valeur pour un filtre LDAP (anti-injection).
function escapeFilter(value) {
  return String(value).replace(/[\\*()\0]/g, c => '\\' + c.charCodeAt(0).toString(16).padStart(2, '0'))
}

// Mappe une entrée LDAP brute vers les champs User selon les attributs configurés.
function mapLdapEntry(entry, config) {
  return {
    email:     (getVal(entry, config.attrEmail || 'mail') || '').toLowerCase(),
    firstName: getVal(entry, config.attrFirstName || 'givenName') || 'Inconnu',
    lastName:  getVal(entry, config.attrLastName  || 'sn')        || 'Inconnu',
    dept:      getVal(entry, config.attrDepartment || 'department'),
    position:  getVal(entry, config.attrTitle      || 'title'),
    dn:        entry.dn || '',
  }
}

/**
 * Crée ou met à jour un utilisateur local à partir d'une entrée LDAP.
 * Trace la source d'origine via ldapSource. Ne remplace jamais un mot de passe existant.
 * @returns {Promise<object|null>} l'utilisateur (lean) ou null si pas d'email
 */
async function upsertLdapUser(entry, config) {
  const { email, firstName, lastName, dept, position, dn } = mapLdapEntry(entry, config)
  if (!email) return null
  const sourceId = config.id || config.label || null

  const existing = await User.findOne({ email }).lean()
  if (existing) {
    const updates = { firstName, lastName, ldapDn: dn, authSource: 'ldap', ldapSource: sourceId }
    if (dept)     updates.department = dept
    if (position) updates.position   = position
    await User.updateOne({ _id: existing._id }, { $set: updates })
    return User.findById(existing._id).lean()
  }

  const randomPwd = await bcrypt.hash(randomUUID(), BCRYPT_ROUNDS)
  const created = await User.create({
    email, firstName, lastName,
    passwordHash: randomPwd,
    authSource:   'ldap',
    ldapDn:       dn,
    ldapSource:   sourceId,
    role:         config.defaultRole || 'employee',
    department:   dept     || null,
    position:     position || null,
    isActive:     true,
  })
  return created.toObject()
}

/**
 * Authentifie un utilisateur contre un annuaire LDAP (bind avec son DN).
 * 1. bind compte de service → 2. recherche par email → 3. bind comme l'utilisateur.
 * Ne lance jamais : renvoie l'entrée LDAP en cas de succès, sinon null.
 * @returns {Promise<object|null>}
 */
async function authenticate(config, email, password) {
  if (!config?.host || !config?.bindDN || !config?.baseDN || !email || !password) return null
  const attrEmail = config.attrEmail || 'mail'

  const client = makeClient(config)
  let userDn = null
  let entry  = null
  try {
    await bindAsync(client, config.bindDN, config.bindPassword || '')
    const entries = await searchAsync(client, config.baseDN, {
      scope:      'sub',
      filter:     `(${attrEmail}=${escapeFilter(email)})`,
      sizeLimit:  2,
      attributes: ['dn', attrEmail, config.attrFirstName || 'givenName', config.attrLastName || 'sn', config.attrDepartment || 'department', config.attrTitle || 'title'],
    })
    await unbindAsync(client)
    if (entries.length === 1 && entries[0].dn) { userDn = entries[0].dn; entry = entries[0] }
  } catch (err) {
    try { await unbindAsync(client) } catch (_) { /* ignore */ }
    logger.warn('[LDAP] authenticate — search error', { error: err.message })
    return null
  }
  if (!userDn) return null

  // Vérifie le mot de passe en se bindant comme l'utilisateur
  const userClient = makeClient(config)
  try {
    await bindAsync(userClient, userDn, password)
    await unbindAsync(userClient)
    return entry
  } catch (_) {
    try { await unbindAsync(userClient) } catch (_) { /* ignore */ }
    return null
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
  const attrManager = config.attrManager  || 'manager'
  const defaultRole = config.defaultRole  || 'employee'

  // Comptes à exclure (système / services). Motifs glob (« svc-* », « *@bots.local »…)
  // testés sur l'email ET le DN. Un compte déjà absorbé qui matche est DÉSACTIVÉ.
  const excludePatterns = Array.isArray(config.excludePatterns) ? config.excludePatterns.filter(Boolean) : []
  const excludeRe = excludePatterns.map(p => {
    try { return new RegExp(String(p).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*'), 'i') } catch { return null }
  }).filter(Boolean)
  const isExcluded = (email, dn) => excludeRe.some(re => re.test(`${email} ${dn}`))

  const client = makeClient(config)
  const report = { created: 0, updated: 0, skipped: 0, linked: 0, excluded: 0, deactivated: 0, errors: [] }

  try {
    await bindAsync(client, config.bindDN, config.bindPassword || '')
    const entries = await searchAsync(client, config.baseDN, {
      scope:      'sub',
      filter:     config.userFilter || '(objectClass=person)',
      sizeLimit:  1000,
      attributes: ['dn', attrEmail, attrFirst, attrLast, attrDept, attrTitle, attrManager],
    })
    await unbindAsync(client)

    // Batch pre-fetch all existing users (1 query replaces N findOne calls)
    const allEmails = entries
      .map(e => { const v = getVal(e, attrEmail); return v ? v.toLowerCase() : null })
      .filter(Boolean)
    const existingUsers = allEmails.length
      ? await User.find({ email: { $in: allEmails } }, '_id email').lean()
      : []
    const existingByEmail = new Map(existingUsers.map(u => [u.email.toLowerCase(), u]))

    for (const entry of entries) {
      const email = getVal(entry, attrEmail)
      if (!email) { report.skipped++; continue }

      const emailLower = email.toLowerCase()
      const firstName  = getVal(entry, attrFirst)  || 'Inconnu'
      const lastName   = getVal(entry, attrLast)   || 'Inconnu'
      const dept       = getVal(entry, attrDept)
      const position   = getVal(entry, attrTitle)
      const dn         = entry.dn || ''

      // Compte système/service exclu : on l'ignore, et s'il avait été absorbé
      // lors d'un sync précédent, on le DÉSACTIVE (« virer »).
      if (isExcluded(emailLower, dn.toLowerCase())) {
        report.excluded++
        const dupe = existingByEmail.get(emailLower)
        if (dupe) {
          // Bloqué (réversible) plutôt que supprimé : visible dans la liste des
          // comptes bloqués, débloquable si c'est un faux positif.
          await User.updateOne({ _id: dupe._id }, { $set: {
            blocked: true, isActive: false, blockedAt: new Date(),
            blockedReason: 'Compte système/service exclu (synchro LDAP)',
          } })
          report.deactivated++
        }
        continue
      }

      try {
        const existing = existingByEmail.get(emailLower)

        if (existing) {
          const updates = { firstName, lastName, ldapDn: dn, authSource: 'ldap' }
          if (dept)     updates.department = dept
          if (position) updates.position   = position
          await User.updateOne({ _id: existing._id }, { $set: updates })
          report.updated++
        } else {
          // Mot de passe aléatoire — l'utilisateur s'authentifiera via LDAP
          const randomPwd = await bcrypt.hash(randomUUID(), BCRYPT_ROUNDS)
          await User.create({
            email:        emailLower,
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

    // ── 2e passe : hiérarchie (attribut `manager` DN → managerId) ────────────
    // Comme un AD réel : chaque entrée peut porter un `manager` = DN du
    // responsable. On résout ce DN vers l'utilisateur correspondant (par son
    // ldapDn) et on fixe managerId. Les rôles ne sont PAS dérivés : ils restent
    // à `defaultRole` et seront attribués par l'admin dans l'app.
    try {
      // dn (minuscule) → email, pour tous les utilisateurs de cette source
      const dnToEmail = new Map()
      const managerPairs = [] // { email, managerDn }
      for (const entry of entries) {
        const email = (getVal(entry, attrEmail) || '').toLowerCase()
        if (!email) continue
        if (entry.dn) dnToEmail.set(entry.dn.toLowerCase(), email)
        const mgrDn = getVal(entry, attrManager)
        if (mgrDn) managerPairs.push({ email, managerDn: mgrDn.toLowerCase() })
      }
      if (managerPairs.length) {
        const wantedEmails = [...new Set(
          managerPairs.flatMap(p => [p.email, dnToEmail.get(p.managerDn)]).filter(Boolean),
        )]
        const users = await User.find({ email: { $in: wantedEmails } }, '_id email ldapDn').lean()
        const emailToId = new Map(users.map(u => [u.email.toLowerCase(), u._id]))
        // Résolution croisée possible : manager déjà synchronisé par une autre source
        const ops = []
        for (const { email, managerDn } of managerPairs) {
          const selfId = emailToId.get(email)
          let mgrId = null
          const mgrEmail = dnToEmail.get(managerDn)
          if (mgrEmail) mgrId = emailToId.get(mgrEmail)
          if (!mgrId) {
            const mgr = await User.findOne({ ldapDn: new RegExp(`^${managerDn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }, '_id').lean()
            if (mgr) mgrId = mgr._id
          }
          // Garde-fou anti-boucle directe : un user ne peut pas être son manager
          if (mgrId && selfId && String(mgrId) !== String(selfId)) {
            ops.push({ updateOne: { filter: { _id: selfId }, update: { $set: { managerId: mgrId } } } })
          }
        }
        if (ops.length) {
          const res = await User.bulkWrite(ops, { ordered: false })
          report.linked = res.modifiedCount || ops.length
        }
      }
    } catch (linkErr) {
      report.errors.push(`hiérarchie: ${linkErr.message}`)
    }

    return report
  } catch (err) {
    try { await unbindAsync(client) } catch (_) { /* ignore */ }
    throw new Error(`Synchronisation impossible : ${err.message}`, { cause: err })
  }
}

module.exports = { testConnection, previewUsers, syncUsers, authenticate, upsertLdapUser, mapLdapEntry }
