'use strict'

// =============================================================================
// services/interviewService.js — Logique métier des entretiens
//
// Un Interview matérialise le duo Manager/Évalué dans une campagne.
// Il est créé/mis à jour à chaque fois qu'une évaluation est créée.
// =============================================================================

const { Interview, Evaluation } = require('../models')
const logger = require('../utils/logger')

// ── Upsert ────────────────────────────────────────────────────────────────────

/**
 * Crée ou met à jour l'Interview correspondant à l'évaluation donnée.
 * Ajoute l'évaluation à evaluationIds (via $addToSet, pas de doublon).
 * Renseigne managerId depuis User.managerId si disponible et pas encore défini.
 *
 * @param {object} evaluation — document Evaluation (doit avoir campaignId, evaluateeId)
 * @returns {Promise<object>} document Interview
 */
async function upsertInterviewForEvaluation(evaluation) {
  const { campaignId, evaluateeId, _id: evaluationId } = evaluation

  if (!campaignId || !evaluateeId) {
    // Évaluation standalone (pas de campagne) — pas d'entretien à créer
    return null
  }

  // Résoudre le manager de l'évaluatee si possible
  let managerId = null
  try {
    const User = require('../models/User')
    const evaluatee = await User.findById(evaluateeId, 'managerId').lean()
    managerId = evaluatee?.managerId ?? null
  } catch (err) {
    logger.warn('[interview] Impossible de résoudre managerId', {
      evaluateeId: evaluateeId?.toString(),
      error: err instanceof Error ? err.message : String(err),
    })
  }

  const filter = { campaignId, evaluateeId }
  const update = {
    $addToSet: { evaluationIds: evaluationId },
    $setOnInsert: { campaignId, evaluateeId, managerId },
  }

  const interview = await Interview.findOneAndUpdate(filter, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  })

  return interview
}

// ── Lecture ───────────────────────────────────────────────────────────────────

/**
 * Retourne l'Interview d'un duo (campagne, évaluatee) avec ses évaluations peuplées.
 *
 * @param {string|ObjectId} campaignId
 * @param {string|ObjectId} evaluateeId
 * @returns {Promise<object|null>} document Interview peuplé ou null si absent
 */
async function getInterview(campaignId, evaluateeId) {
  const interview = await Interview.findOne({ campaignId, evaluateeId })
    .populate({
      path: 'evaluationIds',
      populate: [
        {
          path: 'formId',
          select: 'title questions',
        },
        {
          path: 'evaluatorId',
          select: 'firstName lastName',
        },
        {
          path: 'evaluateeId',
          select: 'firstName lastName',
        },
      ],
      select: 'formId evaluatorId evaluateeId status answers reviewerScore reviewerComment nextYearObjectives objectiveRatings signatureStatus lastSavedAt createdAt updatedAt',
    })
    .populate('managerId', 'firstName lastName')
    .lean()

  return interview || null
}

// ── Helpers internes ──────────────────────────────────────────────────────────

/**
 * Génère les entretiens pour toutes les évaluations d'une campagne (bulk post-création).
 * Utilisé après generateEvaluationsForCampaign.
 *
 * @param {string|ObjectId} campaignId
 * @returns {Promise<number>} nombre d'entretiens upsertés
 */
async function generateInterviewsForCampaign(campaignId) {
  const evaluations = await Evaluation.find({ campaignId }).lean()

  let count = 0
  for (const evaluation of evaluations) {
    await upsertInterviewForEvaluation(evaluation).catch(err => {
      logger.warn('[interview] Erreur upsert lors de la génération bulk', {
        evaluationId: evaluation._id?.toString(),
        error: err instanceof Error ? err.message : String(err),
      })
    })
    count++
  }

  return count
}

// ── Synthèse d'entretien ──────────────────────────────────────────────────────

/**
 * Enregistre le score et le commentaire du manager sur l'évaluation « manager »
 * (celle dont evaluatorId ≠ evaluateeId) d'un Interview (campaignId, evaluateeId).
 *
 * @param {string|ObjectId} campaignId
 * @param {string|ObjectId} evaluateeId
 * @param {object}          payload
 * @param {number|null}     payload.reviewerScore     — 0-100 ou null
 * @param {string}          payload.reviewerComment   — ≤ 5000 chars
 * @param {string|ObjectId} payload.reviewedBy        — req.user.id
 * @returns {Promise<{ evaluationId: string }>}
 * @throws  {Error} avec .status si données invalides ou entretien introuvable
 */
async function saveSynthesis(campaignId, evaluateeId, { reviewerScore, reviewerComment, reviewedBy }) {
  const interview = await Interview.findOne({ campaignId, evaluateeId })
    .populate('evaluationIds', 'evaluatorId evaluateeId')
    .lean()

  if (!interview) {
    const err = new Error('Entretien introuvable')
    err.status = 404
    throw err
  }

  // L'évaluation du manager = celle dont evaluatorId ≠ evaluateeId
  const managerEval = interview.evaluationIds.find(
    ev => ev.evaluatorId.toString() !== ev.evaluateeId.toString()
  )
  if (!managerEval) {
    const err = new Error("Aucune évaluation manager trouvée dans cet entretien")
    err.status = 404
    throw err
  }

  const { Evaluation } = require('../models')
  const evaluation = await Evaluation.findById(managerEval._id)
  if (!evaluation) {
    const err = new Error("Évaluation manager introuvable")
    err.status = 404
    throw err
  }

  if (reviewerScore !== undefined && reviewerScore !== null) {
    evaluation.reviewerScore = reviewerScore
  } else if (reviewerScore === null) {
    evaluation.reviewerScore = null
  }
  evaluation.reviewerComment = reviewerComment
  evaluation.reviewedBy      = reviewedBy

  await evaluation.save()

  return { evaluationId: evaluation._id.toString() }
}

module.exports = {
  upsertInterviewForEvaluation,
  getInterview,
  generateInterviewsForCampaign,
  saveSynthesis,
}
