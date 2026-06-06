'use strict'

// =============================================================================
// validators/campaignValidators.js — Schémas Joi pour les campagnes
// =============================================================================

const Joi = require('joi')

const VALID_STATUSES    = ['draft', 'active', 'closed', 'archived']
const VALID_TRANSITIONS = ['draft', 'active', 'closed', 'archived']
const VALID_SCOPE_TYPES = ['all', 'role', 'department', 'sector', 'users', 'group']

const objectId = Joi.string().hex().length(24).messages({
  'string.hex':    '{{#label}} doit être un ObjectId hexadécimal valide',
  'string.length': '{{#label}} doit faire 24 caractères',
})

// Champs de périmètre partagés entre création et mise à jour.
// Le frontend envoie targetScope comme chaîne (scopeType) + les tableaux plats.
// Les tests (et données legacy) peuvent aussi envoyer targetScope comme objet
// { scopeType, ids } — les deux formes sont acceptées ; le service normalise.
const scopeFields = {
  targetScope: Joi.alternatives().try(
    Joi.string().valid(...VALID_SCOPE_TYPES),
    Joi.object({
      scopeType: Joi.string().valid(...VALID_SCOPE_TYPES).required(),
      ids: Joi.array().items(Joi.alternatives().try(objectId, Joi.string())).optional(),
    })
  ).optional(),
  targetRoleIds:     Joi.array().items(Joi.string()).optional(),
  targetDepartments: Joi.array().items(Joi.string()).optional(),
  targetSectorIds:   Joi.array().items(Joi.alternatives().try(objectId, Joi.string())).optional(),
  targetUserIds:     Joi.array().items(objectId).optional(),
  targetGroupIds:    Joi.array().items(objectId).optional(),
}

const createCampaign = Joi.object({
  name:        Joi.string().min(2).max(120).required(),
  description: Joi.string().max(2000).optional().allow(''),
  formId:      objectId.required(),
  startDate:   Joi.date().iso().required(),
  endDate:     Joi.date().iso().min(Joi.ref('startDate')).required()
    .messages({ 'date.min': 'endDate doit être postérieure à startDate' }),
  participants: Joi.array().items(objectId).optional(),
  status:       Joi.string().valid(...VALID_STATUSES).optional().default('draft'),
  // Contexte N-1 (import des données de l'évaluation précédente)
  enableN1Context:     Joi.boolean().optional(),
  n1VisibleToEmployee: Joi.boolean().optional(),
  previousCampaignId:  objectId.optional().allow(null, ''),
  ...scopeFields,
})

const updateCampaign = Joi.object({
  name:         Joi.string().min(2).max(120).optional(),
  description:  Joi.string().max(2000).optional().allow(''),
  formId:       objectId.optional(),
  startDate:    Joi.date().iso().optional(),
  endDate:      Joi.date().iso().optional(),
  participants: Joi.array().items(objectId).optional(),
  status:       Joi.string().valid(...VALID_TRANSITIONS).optional(),
  // Contexte N-1 — sans ces clés, le toggle RH était silencieusement ignoré.
  enableN1Context:     Joi.boolean().optional(),
  n1VisibleToEmployee: Joi.boolean().optional(),
  previousCampaignId:  objectId.optional().allow(null, ''),
  ...scopeFields,
}).min(1).messages({ 'object.min': 'Au moins un champ doit être modifié' })

module.exports = { createCampaign, updateCampaign }
