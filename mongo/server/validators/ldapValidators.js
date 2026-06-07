'use strict'

// =============================================================================
// validators/ldapValidators.js — Schémas Joi pour la configuration LDAP
//
// Durcit les bodies des routes test/preview/sync/PUT config sans changer le
// comportement fonctionnel : on valide AVANT d'appeler le service.
//
// Particularités du domaine LDAP :
//   • Le champ URL s'appelle `host` côté sources (UI multi-annuaires) mais
//     `url` côté config legacy → on accepte les deux (`urlField`).
//   • `bindPassword` peut être vide : il est résolu depuis le stockage
//     (resolveBindPassword) pour test/preview/sync, ou préservé au PUT config.
//     → toujours optionnel ici ; le service gère la résolution.
//   • Bind anonyme : si `anonymous === true`, `bindDN` peut être vide.
// =============================================================================

const Joi = require('joi')

// URL LDAP : doit commencer par ldap:// ou ldaps://
const ldapUrl = Joi.string()
  .pattern(/^ldaps?:\/\/.+/i)
  .messages({
    'string.pattern.base': "L'URL doit commencer par ldap:// ou ldaps://",
    'string.empty':        "L'URL de l'annuaire est requise",
    'any.required':        "L'URL de l'annuaire est requise",
  })

// DN plausible : doit contenir au moins un « = » (ex. dc=example,dc=com)
const dn = Joi.string()
  .pattern(/=/)
  .messages({
    'string.pattern.base': 'Le DN doit ressembler à « dc=example,dc=com » (contenir un « = »)',
    'string.empty':        'Ce champ DN est requis',
  })

// Filtre LDAP : chaîne non vide si fournie (ex. (objectClass=person))
const ldapFilter = Joi.string().min(1).messages({
  'string.empty': 'Le filtre ne peut pas être vide',
})

// Construit le schéma d'une config LDAP.
//
// IMPORTANT — validation de FORMAT uniquement, aucun champ requis.
// La sauvegarde d'une config (PUT /config) et l'envoi au service (test/preview)
// acceptent des configs partielles ou vides : c'est le contrat historique
// (on peut sauvegarder {} pour réinitialiser, et tester une config minimale).
// La connexion réelle échoue d'elle-même si l'URL manque ; l'exigence des
// champs obligatoires est portée côté UI (Zod). Ici on ne fait que rejeter les
// valeurs MAL FORMÉES quand elles sont présentes (URL sans ldap://, DN sans «=»).
// `urlKey` = 'host' (sources) ou 'url' (legacy).
function buildConfigSchema({ urlKey = 'host' } = {}) {
  return Joi.object({
    // Champ URL (host ou url selon le contexte) — format validé si présent
    [urlKey]:      ldapUrl.allow('').optional(),

    baseDN:        dn.allow('').optional(),

    anonymous:     Joi.boolean().optional(),
    bindDN:        dn.allow('').optional(),

    // Résolu depuis le stockage si vide (PUT /config et test/preview/sync)
    bindPassword:  Joi.string().allow('').optional(),

    userFilter:    ldapFilter.optional(),
    searchFilter:  ldapFilter.optional(),

    // Mapping d'attributs : strings optionnelles
    attrEmail:      Joi.string().allow('').optional(),
    attrFirstName:  Joi.string().allow('').optional(),
    attrLastName:   Joi.string().allow('').optional(),
    attrDepartment: Joi.string().allow('').optional(),
    attrTitle:      Joi.string().allow('').optional(),
    attrUid:        Joi.string().allow('').optional(),

    // TLS
    tls: Joi.object({
      rejectUnauthorized: Joi.boolean().optional(),
    }).optional(),

    // Champs annexes tolérés (id, label, enabled, defaultRole…) sans validation stricte
    id:          Joi.string().optional(),
    label:       Joi.string().allow('').optional(),
    enabled:     Joi.boolean().optional(),
    defaultRole: Joi.string().allow('').optional(),
  }).unknown(true) // tolère d'autres champs sans casser le flux existant
}

// Schémas concrets pour les routes
const inlineConfig    = buildConfigSchema({ urlKey: 'host' })
const inlineConfigUrl = buildConfigSchema({ urlKey: 'url' })

// Pour PUT /config : URL legacy `url`, mot de passe optionnel (préservé si vide)
const savedConfig     = buildConfigSchema({ urlKey: 'url' })

/**
 * Valide une config inline et retourne un message d'erreur clair, ou null si OK.
 * Accepte indifféremment le champ `host` (sources) ou `url` (legacy).
 * @param {object} config
 * @returns {string|null} message d'erreur (français) ou null
 */
function validateInlineConfig(config) {
  const c = config || {}
  // On choisit le schéma selon le champ URL présent (host prioritaire)
  const schema = c.host !== undefined || c.url === undefined ? inlineConfig : inlineConfigUrl
  const { error } = schema.validate(c, { abortEarly: true })
  return error ? error.details[0].message : null
}

/**
 * Valide la config envoyée au PUT /config (legacy mono-source).
 * @param {object} config
 * @returns {string|null}
 */
function validateSavedConfig(config) {
  const { error } = savedConfig.validate(config || {}, { abortEarly: true })
  return error ? error.details[0].message : null
}

module.exports = {
  validateInlineConfig,
  validateSavedConfig,
  buildConfigSchema,
}
