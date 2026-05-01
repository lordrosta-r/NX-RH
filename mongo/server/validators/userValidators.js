'use strict'

// =============================================================================
// validators/userValidators.js — Schémas Joi pour les utilisateurs
// =============================================================================

const Joi = require('joi')

const ROLES = ['admin', 'hr', 'director', 'manager', 'employee']

const objectId = Joi.string().hex().length(24).messages({
  'string.hex':    '{{#label}} doit être un ObjectId hexadécimal valide',
  'string.length': '{{#label}} doit faire 24 caractères',
})

const createUser = Joi.object({
  firstName:   Joi.string().min(1).max(80).required(),
  lastName:    Joi.string().min(1).max(80).required(),
  email:       Joi.string().email().required(),
  role:        Joi.string().valid(...ROLES).required(),
  department:  Joi.string().max(120).optional().allow(''),
  managerId:   objectId.optional().allow(null),
  password:    Joi.string().min(8).max(128).optional(), // optionnel si LDAP
})

const updateUser = Joi.object({
  firstName:  Joi.string().min(1).max(80).optional(),
  lastName:   Joi.string().min(1).max(80).optional(),
  email:      Joi.string().email().optional(),
  role:       Joi.string().valid(...ROLES).optional(),
  department: Joi.string().max(120).optional().allow(''),
  managerId:  objectId.optional().allow(null),
  isActive:   Joi.boolean().optional(),
}).min(1)

const changePassword = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword:     Joi.string().min(8).max(128).required(),
})

module.exports = { createUser, updateUser, changePassword }
