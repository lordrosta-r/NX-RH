'use strict'

// =============================================================================
// validators/smtpValidators.js — Schéma Joi pour la configuration SMTP
//
// Valide le corps du PUT /api/admin/config/mail AVANT écriture des clés
// Config.smtp.* consommées par services/mailer.js.
//
// Particularité : le mot de passe est optionnel à l'édition. Vide = réutiliser
// la valeur déjà stockée. On n'exige donc jamais smtpPass ici ; la route décide
// si une valeur existe déjà en base.
// =============================================================================

const Joi = require('joi')

// Hostname strict (ex : smtp.ovh.net). Joi.string().hostname() couvre les FQDN
// et adresses IP littérales, ce qui suffit pour un hôte SMTP.
const mailConfig = Joi.object({
  smtpHost: Joi.string().hostname().required().messages({
    'string.base':     "L'hôte SMTP doit être une chaîne de caractères",
    'string.empty':    "L'hôte SMTP est requis",
    'string.hostname': "L'hôte SMTP doit être un nom d'hôte valide (ex : smtp.ovh.net)",
    'any.required':    "L'hôte SMTP est requis",
  }),
  smtpPort: Joi.number().integer().min(1).max(65535).required().messages({
    'number.base':    'Le port doit être un nombre',
    'number.integer': 'Le port doit être un entier',
    'number.min':     'Le port doit être compris entre 1 et 65535',
    'number.max':     'Le port doit être compris entre 1 et 65535',
    'any.required':   'Le port est requis',
  }),
  smtpSecure: Joi.boolean().required().messages({
    'boolean.base': 'Le champ « connexion sécurisée » doit être un booléen',
    'any.required': 'Le champ « connexion sécurisée » est requis',
  }),
  smtpUser: Joi.string().allow('').optional().messages({
    'string.base': "L'utilisateur SMTP doit être une chaîne de caractères",
  }),
  smtpPass: Joi.string().allow('').optional().messages({
    'string.base': 'Le mot de passe SMTP doit être une chaîne de caractères',
  }),
  fromEmail: Joi.string().email({ tlds: { allow: false } }).required().messages({
    'string.base':  "L'adresse expéditeur doit être une chaîne de caractères",
    'string.empty': "L'adresse expéditeur est requise",
    'string.email': "L'adresse expéditeur doit être un e-mail valide",
    'any.required': "L'adresse expéditeur est requise",
  }),
  fromName: Joi.string().allow('').optional().messages({
    'string.base': "Le nom de l'expéditeur doit être une chaîne de caractères",
  }),
})

module.exports = { mailConfig }
