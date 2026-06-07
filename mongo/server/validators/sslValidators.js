'use strict'

// =============================================================================
// validators/sslValidators.js — Schémas Joi pour le téléversement de certificat SSL
//
// On valide ici uniquement la forme grossière (présence, type, taille, markers
// PEM). La validation cryptographique réelle (parsing X509, cohérence clé/cert)
// est faite dans la route via le module `crypto` natif.
// =============================================================================

const Joi = require('joi')

// Limite ~64 Ko par fichier (un fullchain réaliste fait quelques Ko).
const MAX_PEM_BYTES = 64 * 1024

const pemString = Joi.string()
  .max(MAX_PEM_BYTES)
  .pattern(/-----BEGIN /)
  .required()
  .messages({
    'string.max':       'Le fichier PEM dépasse la taille maximale autorisée (64 Ko)',
    'string.pattern.base': 'Le contenu ne ressemble pas à un fichier PEM (marqueur BEGIN absent)',
    'any.required':     'Ce champ est requis',
    'string.empty':     'Ce champ ne peut pas être vide',
  })

const installCert = Joi.object({
  fullchain: pemString,
  privkey:   pemString,
})

module.exports = { installCert, MAX_PEM_BYTES }
