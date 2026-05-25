'use strict'

// =============================================================================
// services/evaluationService.js — Couche d'accès aux données pour les évaluations
// =============================================================================

const mongoose = require('mongoose')
const { Evaluation, Form, Campaign } = require('../models')

/**
 * Crée une nouvelle évaluation.
 * - Gèle le formulaire si ce n'est pas déjà fait (frozenAt)
 * - Calcule expiresAt à partir de la date de fin de campagne + 30 jours
 *
 * @param {object} params
 * @param {string|null} params.campaignId
 * @param {string}      params.formId
 * @param {string}      params.evaluatorId
 * @param {string}      params.evaluateeId
 * @returns {Promise<import('mongoose').Document>} L'évaluation créée
 */
async function createEvaluation({ campaignId, formId, evaluatorId, evaluateeId }) {
  // Geler le formulaire si pas encore figé
  await Form.findByIdAndUpdate(formId, { $set: { frozenAt: new Date() } }, { timestamps: false })
    .where({ frozenAt: null })

  const campaign  = campaignId ? await Campaign.findById(campaignId, 'endDate name').lean() : null
  const expiresAt = campaign?.endDate
    ? new Date(new Date(campaign.endDate).getTime() + 30 * 24 * 60 * 60 * 1000)
    : null

  return Evaluation.create({ campaignId: campaignId || null, formId, evaluatorId, evaluateeId, expiresAt })
}

/**
 * Récupère une évaluation par son ID (document Mongoose mutable pour modification).
 *
 * @param {string} id
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function findEvaluationById(id) {
  if (!mongoose.isValidObjectId(id)) return null
  return Evaluation.findById(id)
}

/**
 * Récupère une évaluation avec ses relations populées (lecture seule, lean).
 *
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function findEvaluationWithDetails(id) {
  if (!mongoose.isValidObjectId(id)) return null
  return Evaluation.findById(id)
    .populate('formId', 'title formType isAnonymous questions')
    .populate('evaluatorId', 'firstName lastName')
    .populate('evaluateeId', 'firstName lastName department position')
    .populate('campaignId', 'name status extendedVisibility')
    .lean()
}

/**
 * Expire manuellement une évaluation (status → 'expired').
 * Ne persiste pas si le statut est déjà terminal.
 *
 * @param {import('mongoose').Document} evaluation
 * @returns {Promise<import('mongoose').Document>}
 */
async function expireEvaluation(evaluation) {
  evaluation.status     = 'expired'
  evaluation.nearExpiry = false
  return evaluation.save()
}

module.exports = {
  createEvaluation,
  findEvaluationById,
  findEvaluationWithDetails,
  expireEvaluation,
}
