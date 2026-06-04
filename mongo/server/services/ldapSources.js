'use strict'

// =============================================================================
// services/ldapSources.js — Gestion des sources LDAP (multi-annuaires)
//
// Les sources sont stockées dans Config{key:'ldap'}.value.sources (tableau).
// Rétro-compatibilité :
//   • si value.sources existe → on l'utilise ;
//   • sinon si value.host existe → la config mono-source legacy est exposée
//     comme une source unique « default » ;
//   • sinon si les variables d'env LDAP_* existent → source « env » dérivée
//     (permet au login LDAP de marcher contre l'OpenLDAP de docker-compose.dev
//     sans configuration admin préalable).
//
// Chaque source : { id, label, enabled, host, bindDN, bindPassword, baseDN,
//   userFilter, attrEmail, attrFirstName, attrLastName, attrDepartment,
//   attrTitle, defaultRole }
// =============================================================================

const Config = require('../models/Config')

const CONFIG_KEY = 'ldap'

function envSource() {
  if (!process.env.LDAP_URL) return null
  return {
    id:           'env',
    label:        'Annuaire (env)',
    enabled:      true,
    host:         process.env.LDAP_URL,
    baseDN:       process.env.LDAP_BASE_DN || '',
    bindDN:       process.env.LDAP_BIND_DN || '',
    bindPassword: process.env.LDAP_BIND_PASSWORD || '',
    userFilter:   process.env.LDAP_USER_FILTER || '(objectClass=person)',
  }
}

/** Normalise une source : garantit un id et un flag enabled. */
function normalize(src, idx = 0) {
  return { enabled: true, ...src, id: src.id || `src-${idx}` }
}

/**
 * Retourne toutes les sources LDAP configurées (avec bindPassword).
 * @returns {Promise<Array>}
 */
async function getSources() {
  let value = null
  try {
    const doc = await Config.findOne({ key: CONFIG_KEY }).lean()
    value = doc?.value || null
  } catch {
    // Erreur DB → on retombe sur le repli env (value reste null)
  }

  if (value && Array.isArray(value.sources) && value.sources.length) {
    return value.sources.map(normalize)
  }
  // Legacy mono-source : la value elle-même est une config
  if (value && value.host) {
    return [normalize({ label: 'Annuaire principal', enabled: true, ...value }, 0)]
  }
  const env = envSource()
  return env ? [env] : []
}

/** Sources activées uniquement (pour le login). */
async function getEnabledSources() {
  return (await getSources()).filter(s => s.enabled !== false)
}

/** Retire les secrets (bindPassword) pour exposition côté API. */
function stripSecrets(sources) {
  return sources.map(({ bindPassword: _bp, ...rest }) => rest)
}

/**
 * Sauvegarde la liste des sources. Préserve le bindPassword existant d'une
 * source (matché par id) lorsque la nouvelle valeur est vide.
 * @param {Array} incoming
 * @returns {Promise<Array>} sources sauvegardées (sans secrets)
 */
async function saveSources(incoming) {
  const doc      = await Config.findOne({ key: CONFIG_KEY }).lean()
  const existing = (doc?.value?.sources || []).reduce((m, s) => { m[s.id] = s; return m }, {})

  const sources = (incoming || []).map((s, i) => {
    const norm = normalize(s, i)
    if (!norm.bindPassword && existing[norm.id]?.bindPassword) {
      norm.bindPassword = existing[norm.id].bindPassword
    }
    return norm
  })

  await Config.findOneAndUpdate(
    { key: CONFIG_KEY },
    { $set: { value: { ...(doc?.value || {}), sources } } },
    { upsert: true },
  )
  return stripSecrets(sources)
}

module.exports = { getSources, getEnabledSources, saveSources, stripSecrets, CONFIG_KEY }
