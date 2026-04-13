// =============================================================================
// config/ldap.js — Configuration LDAP/LDAPS
//
// Supporte deux types d'annuaires :
//   • Active Directory (AD)  — filtre typique : (sAMAccountName={{u}})
//   • OpenLDAP / Linux LDAP  — filtre typique : (uid={{u}})
//
// Variables d'environnement requises :
//   LDAP_URL                  ldaps://dc.corp.com:636  (ou ldap:// en dev)
//   LDAP_BASE_DN              ou=people,dc=corp,dc=com
//   LDAP_BIND_DN              cn=svc-nanoxplore,dc=corp,dc=com
//   LDAP_BIND_PASSWORD        secret
//   LDAP_USER_FILTER          (sAMAccountName={{u}}) ou (uid={{u}})
//   LDAP_TLS_REJECT_UNAUTHORIZED  true (false seulement en dev avec cert auto-signé)
//
// Usage (phase 2 — service auth) :
//   const ldap = require('../config/ldap')
//   const config = ldap.getConfig()
//   // utiliser ldapjs avec config.url, config.bindDn, etc.
// =============================================================================

const ldap = require('ldapjs')

// Retourne true si LDAP est configuré (LDAP_URL défini dans l'environnement).
// En mode local-only, LDAP_URL est absent — toutes les auth passent par passwordHash.
function isEnabled() {
  return !!process.env.LDAP_URL
}

// Retourne la config LDAP lue depuis l'environnement.
// Lève une erreur au démarrage si les variables obligatoires sont absentes.
function getConfig() {
  const url    = process.env.LDAP_URL
  const baseDn = process.env.LDAP_BASE_DN
  const bindDn = process.env.LDAP_BIND_DN
  const bindPw = process.env.LDAP_BIND_PASSWORD
  const filter = process.env.LDAP_USER_FILTER

  if (!url || !baseDn || !bindDn || !bindPw || !filter) {
    throw new Error('[LDAP] Variables manquantes : LDAP_URL, LDAP_BASE_DN, LDAP_BIND_DN, LDAP_BIND_PASSWORD, LDAP_USER_FILTER')
  }

  // En production, on refuse les certificats TLS non vérifiés
  const rejectUnauthorized = process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== 'false'

  return {
    url,
    baseDn,
    bindDn,
    bindPw,
    filter,          // contient {{u}} comme placeholder pour le username
    tlsOptions: { rejectUnauthorized },
  }
}

// Crée un client ldapjs à partir de la config.
// Appelé dans le service auth (phase 2) pour chaque tentative de connexion.
function createClient() {
  const config = getConfig()
  return ldap.createClient({
    url: config.url,
    tlsOptions: config.tlsOptions,
  })
}

// Remplace {{u}} dans le filtre par le username fourni.
// Échappe les caractères spéciaux LDAP pour éviter l'injection.
function buildFilter(username) {
  const config = getConfig()
  // Caractères spéciaux LDAP : \ * ( ) NUL
  const escaped = username
    .replace(/\\/g, '\\5c')
    .replace(/\*/g,  '\\2a')
    .replace(/\(/g,  '\\28')
    .replace(/\)/g,  '\\29')
    .replace(/\0/g,  '\\00')
  return config.filter.replace('{{u}}', escaped)
}

module.exports = { isEnabled, getConfig, createClient, buildFilter }