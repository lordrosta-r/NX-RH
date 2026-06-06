'use strict'

// =============================================================================
// services/interviewService.js — Logique métier des entretiens
//
// Un Interview matérialise le duo Manager/Évalué dans une campagne.
// Il est créé/mis à jour à chaque fois qu'une évaluation est créée.
// =============================================================================

const { Interview, Evaluation, Campaign } = require('../models')
const { VALID_TRANSITIONS } = require('../models/Evaluation')
const logger = require('../utils/logger')

// Statuts d'évaluation considérés comme « de référence » pour le lookup N-1
const N1_VALID_STATUSES = ['validated', 'signed_hr', 'signed_manager', 'reviewed']

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
 * Enrichit le résultat d'un champ `previousObjectives` (string) contenant les
 * nextYearObjectives de la dernière évaluation validée de l'évaluatee dans la
 * campagne précédente (via previousCampaignId ou fallback dernière campagne clôturée).
 *
 * @param {string|ObjectId} campaignId
 * @param {string|ObjectId} evaluateeId
 * @returns {Promise<object|null>} document Interview peuplé + previousObjectives, ou null
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

  if (!interview) return null

  // ── Lookup previousObjectives ──────────────────────────────────────────────
  let previousObjectives = null
  try {
    const campaign = await Campaign.findById(campaignId, 'previousCampaignId startDate').lean()

    let n1Eval = null

    // Stratégie 1 : previousCampaignId explicite
    if (campaign?.previousCampaignId) {
      n1Eval = await Evaluation.findOne({
        evaluateeId,
        campaignId: campaign.previousCampaignId,
        status: { $in: N1_VALID_STATUSES },
      }, 'nextYearObjectives').lean()
    }

    // Stratégie 2 : fallback — dernière campagne clôturée avant startDate
    if (!n1Eval && campaign?.startDate) {
      const prevCampaigns = await Campaign.find(
        { status: { $in: ['closed', 'archived'] }, endDate: { $lt: campaign.startDate } },
        '_id'
      ).lean()

      if (prevCampaigns.length > 0) {
        n1Eval = await Evaluation.findOne({
          evaluateeId,
          campaignId: { $in: prevCampaigns.map(c => c._id) },
          status: { $in: N1_VALID_STATUSES },
        }, 'nextYearObjectives').sort({ updatedAt: -1 }).lean()
      }
    }

    previousObjectives = n1Eval?.nextYearObjectives ?? null
  } catch (err) {
    logger.warn('[interview] Impossible de résoudre previousObjectives', {
      campaignId: campaignId?.toString(),
      evaluateeId: evaluateeId?.toString(),
      error: err instanceof Error ? err.message : String(err),
    })
  }

  return { ...interview, previousObjectives }
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

// ── État de l'entretien (discussion, objectifs, synthèse) ────────────────────

/**
 * Met à jour en best-effort les champs éditables de l'Interview.
 * Seuls les champs fournis dans `patch` sont écrasés ($set partiel).
 *
 * @param {string|ObjectId} campaignId
 * @param {string|ObjectId} evaluateeId
 * @param {object}          patch — sous-ensemble de { discussion, objectivesReview, nextYearObjectives, synthesis }
 * @returns {Promise<object>} document Interview mis à jour
 * @throws  {Error} avec .status=404 si l'entretien est introuvable
 */
async function saveState(campaignId, evaluateeId, patch) {
  // Construction manuelle pour éviter l'injection d'objet (clés fixes et connues)
  const $set = {}
  const { discussion, objectivesReview, nextYearObjectives, synthesis } = patch
  if (discussion        !== undefined) $set.discussion        = discussion
  if (objectivesReview  !== undefined) $set.objectivesReview  = objectivesReview
  if (nextYearObjectives !== undefined) $set.nextYearObjectives = nextYearObjectives
  if (synthesis         !== undefined) $set.synthesis         = synthesis

  const interview = await Interview.findOneAndUpdate(
    { campaignId, evaluateeId },
    { $set },
    { new: true, runValidators: true }
  ).lean()

  if (!interview) {
    const err = new Error('Entretien introuvable')
    err.status = 404
    throw err
  }

  return interview
}

// ── Signatures ────────────────────────────────────────────────────────────────

/**
 * Enregistre la signature d'un participant (évalué ou manager).
 * Fait avancer en best-effort le statut de l'évaluation manager dans la
 * machine d'états (VALID_TRANSITIONS) :
 *   - role='evaluatee' + éval en 'reviewed'       → 'signed_evaluatee'
 *   - role='manager'  + éval en 'signed_evaluatee' → 'signed_manager'
 * Si les deux rôles ont signé → interview.status = 'signed'.
 *
 * @param {string|ObjectId} campaignId
 * @param {string|ObjectId} evaluateeId
 * @param {object}          payload
 * @param {'evaluatee'|'manager'} payload.role
 * @param {string}          payload.dataUrl — data URI de la signature
 * @returns {Promise<object>} document Interview mis à jour
 * @throws  {Error} avec .status si données invalides ou entretien introuvable
 */
async function addSignature(campaignId, evaluateeId, { role, dataUrl }) {
  const interview = await Interview.findOne({ campaignId, evaluateeId })
    .populate('evaluationIds', 'evaluatorId evaluateeId status')

  if (!interview) {
    const err = new Error('Entretien introuvable')
    err.status = 404
    throw err
  }

  // Push de la signature (on n'empêche pas une double signature ici — la route valide déjà)
  interview.signatures.push({ role, dataUrl })

  // ── Avancer le statut de l'évaluation manager en best-effort ──────────────
  const managerEval = interview.evaluationIds.find(
    ev => ev.evaluatorId?.toString() !== ev.evaluateeId?.toString()
  )

  if (managerEval) {
    try {
      const evalDoc = await Evaluation.findById(managerEval._id)
      if (evalDoc) {
        const targetStatus = role === 'evaluatee' ? 'signed_evaluatee' : 'signed_manager'
        const allowed = VALID_TRANSITIONS[evalDoc.status] ?? []
        if (allowed.includes(targetStatus)) {
          evalDoc.status = targetStatus
          await evalDoc.save()
        }
      }
    } catch (err) {
      logger.warn('[interview] Transition éval manager impossible (best-effort)', {
        evaluationId: managerEval._id?.toString(),
        role,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // ── Statut de l'entretien ──────────────────────────────────────────────────
  const signedRoles = new Set(interview.signatures.map(s => s.role))
  if (signedRoles.has('evaluatee') && signedRoles.has('manager')) {
    interview.status = 'signed'
  }

  await interview.save()
  return interview.toObject()
}

// ── Désaccord formel ──────────────────────────────────────────────────────────

/**
 * Enregistre un désaccord formel de l'évalué sur l'entretien.
 * Passe interview.status à 'disputed'.
 * Tente en best-effort de faire avancer l'évaluation manager :
 *   - 'reviewed' → 'disputed' si la transition est autorisée.
 *
 * @param {string|ObjectId} campaignId
 * @param {string|ObjectId} evaluateeId
 * @param {object}          payload
 * @param {string|ObjectId} payload.by     — req.user.id
 * @param {string}          payload.reason — motif du désaccord
 * @returns {Promise<object>} document Interview mis à jour
 * @throws  {Error} avec .status si l'entretien est introuvable
 */
async function flagDisagreement(campaignId, evaluateeId, { by, reason }) {
  const interview = await Interview.findOne({ campaignId, evaluateeId })
    .populate('evaluationIds', 'evaluatorId evaluateeId status')

  if (!interview) {
    const err = new Error('Entretien introuvable')
    err.status = 404
    throw err
  }

  interview.disagreement = { flagged: true, by, reason, at: new Date() }
  interview.status = 'disputed'

  // ── Transition éval manager en best-effort ──────────────────────────────
  const managerEval = interview.evaluationIds.find(
    ev => ev.evaluatorId?.toString() !== ev.evaluateeId?.toString()
  )

  if (managerEval) {
    try {
      const evalDoc = await Evaluation.findById(managerEval._id)
      if (evalDoc) {
        const allowed = VALID_TRANSITIONS[evalDoc.status] ?? []
        if (allowed.includes('disputed')) {
          evalDoc.status = 'disputed'
          await evalDoc.save()
        }
      }
    } catch (err) {
      logger.warn('[interview] Transition éval manager (disputed) impossible (best-effort)', {
        evaluationId: managerEval._id?.toString(),
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  await interview.save()
  return interview.toObject()
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
  saveState,
  addSignature,
  flagDisagreement,
}
