'use strict'

// =============================================================================
// services/evaluationService.js — Couche d'accès aux données pour les évaluations
// =============================================================================

const mongoose = require('mongoose')
const { Evaluation, Form, Campaign } = require('../models')

const DAY_MS = 24 * 60 * 60 * 1000

// Formulaires remplis par l'évalué lui-même → soumis à campaign.deadlineEmployee.
// Les autres (manager_evaluation, peer_review) → deadlineManager.
const EVALUATEE_FORM_TYPES = ['self_evaluation', 'upward_feedback', 'objectives']

/**
 * Backstop d'expiration absolue : date de fin de campagne + 30 jours.
 * @param {{endDate?: Date}|null} campaign
 * @returns {Date|null}
 */
function resolveExpiry(campaign) {
  return campaign?.endDate ? new Date(new Date(campaign.endDate).getTime() + 30 * DAY_MS) : null
}

/**
 * Date limite EFFECTIVE de réponse, dérivée de la phase (selon le type de form).
 * Renvoie null si la campagne n'a pas de deadline pour cette phase.
 * @param {{deadlineEmployee?: Date, deadlineManager?: Date}|null} campaign
 * @param {string} formType
 * @returns {Date|null}
 */
function resolvePhaseDeadline(campaign, formType) {
  if (!campaign) return null
  const d = EVALUATEE_FORM_TYPES.includes(formType) ? campaign.deadlineEmployee : campaign.deadlineManager
  return d ? new Date(d) : null
}

/**
 * Crée une nouvelle évaluation.
 * - Gèle le formulaire si ce n'est pas déjà fait (frozenAt)
 * - expiresAt = backstop absolu (endDate + 30j)
 * - phaseDeadline = deadline effective de réponse (selon la phase)
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

  const form     = await Form.findById(formId, 'formType').lean()
  const campaign = campaignId ? await Campaign.findById(campaignId, 'endDate name deadlineEmployee deadlineManager').lean() : null

  return Evaluation.create({
    campaignId:    campaignId || null,
    formId, evaluatorId, evaluateeId,
    expiresAt:     resolveExpiry(campaign),
    phaseDeadline: resolvePhaseDeadline(campaign, form?.formType),
  })
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
  resolveExpiry,
  resolvePhaseDeadline,
}
