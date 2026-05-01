'use strict'

// =============================================================================
// validators/evaluationValidators.js — Schémas Joi pour les évaluations
// =============================================================================

const Joi = require('joi')

const objectId = Joi.string().hex().length(24).messages({
  'string.hex':    '{{#label}} doit être un ObjectId hexadécimal valide',
  'string.length': '{{#label}} doit faire 24 caractères',
})

const answer = Joi.object({
  questionId: Joi.string().required(),
  value:      Joi.alternatives().try(
    Joi.string().max(5000),
    Joi.number(),
    Joi.array().items(Joi.string()),
    Joi.boolean()
  ).required(),
})

const createEvaluation = Joi.object({
  campaignId:  objectId.required(),
  formId:      objectId.required(),
  evaluatorId: objectId.required(),
  evaluateeId: objectId.required(),
})

const updateEvaluation = Joi.object({
  answers:           Joi.array().items(answer).optional(),
  evaluateeComment:  Joi.string().max(5000).optional().allow(''),
  reviewerComment:   Joi.string().max(5000).optional().allow(''),
  status:            Joi.string().optional(),
  phase:             Joi.string().valid('self', 'n-1', 'objectives', 'aspirations', 'all').optional(),
  signAction:        Joi.string().valid('sign_evaluatee', 'sign_manager', 'sign_hr').optional(),
}).min(1)

const bulkCreate = Joi.object({
  evaluations: Joi.array().items(createEvaluation).min(1).max(500).required(),
})

const bulkAction = Joi.object({
  ids:        Joi.array().items(objectId).min(1).max(200).required(),
  action:     Joi.string().valid('archive', 'sign_hr', 'assign_reviewer').required(),
  reviewerId: Joi.when('action', {
    is:   'assign_reviewer',
    then: objectId.required(),
  }),
})

module.exports = { createEvaluation, updateEvaluation, bulkCreate, bulkAction }
