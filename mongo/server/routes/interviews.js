'use strict'

// =============================================================================
// routes/interviews.js — /api/interviews
//
// GET  /api/interviews?campaignId=&evaluateeId=
//   Retourne l'entretien (Interview) pour un duo (campagne, évaluatee),
//   avec toutes les évaluations peuplées.
//
// PATCH /api/interviews/synthesis
//   Enregistre le score et le commentaire du manager (synthèse d'entretien).
//   body : { campaignId, evaluateeId, reviewerScore?, reviewerComment }
//
// PATCH /api/interviews/state
//   Sauvegarde partielle de l'état éditorial de l'entretien.
//   body : { campaignId, evaluateeId, discussion?, objectivesReview?, nextYearObjectives?, synthesis? }
//
// POST /api/interviews/sign
//   Enregistre la signature d'un participant (évalué ou manager).
//   body : { campaignId, evaluateeId, role, dataUrl }
//
// POST /api/interviews/disagreement
//   Enregistre un désaccord formel de l'évalué.
//   body : { campaignId, evaluateeId, reason }
//
// RBAC :
//   - admin/hr : accès total
//   - manager  : seulement si l'évaluatee est dans sa visibilité
//   - employee : GET autorisé sur lui-même ; PATCH /state + POST /sign autorisés
//               sur lui-même ; PATCH /synthesis et POST /disagreement → selon rôle
// =============================================================================

const express  = require('express')
const mongoose = require('mongoose')
const { getInterview, saveSynthesis, saveState, addSignature, flagDisagreement } = require('../services/interviewService')
const { getVisibleUserIds } = require('../services/managerVisibility')
const { Campaign } = require('../models')

const router = express.Router()

/**
 * GET /api/interviews?campaignId=&evaluateeId=
 */
router.get('/', async (req, res, next) => {
  try {
    const { campaignId, evaluateeId } = req.query

    if (!campaignId || !mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({ error: 'campaignId valide requis' })
    }
    if (!evaluateeId || !mongoose.isValidObjectId(evaluateeId)) {
      return res.status(400).json({ error: 'evaluateeId valide requis' })
    }

    const role = req.user.role
    const uid  = req.user.id.toString()

    // RBAC
    if (role === 'employee') {
      if (uid !== evaluateeId) {
        return res.status(403).json({ error: 'Accès refusé' })
      }
    } else if (role === 'manager') {
      const campaign = await Campaign.findById(campaignId, 'extendedVisibility').lean()
      const visibleIds = await getVisibleUserIds(req.user.id, campaign)
      if (!visibleIds.includes(evaluateeId)) {
        return res.status(403).json({ error: 'Accès refusé' })
      }
    }
    // admin / hr : accès total

    const interview = await getInterview(campaignId, evaluateeId)
    if (!interview) {
      return res.status(404).json({ error: 'Entretien introuvable' })
    }

    res.json(interview)
  } catch (err) {
    next(err)
  }
})

/**
 * PATCH /api/interviews/synthesis
 * body : { campaignId, evaluateeId, reviewerScore (number|null)?, reviewerComment (string) }
 */
router.patch('/synthesis', async (req, res, next) => {
  try {
    const { campaignId, evaluateeId, reviewerScore, reviewerComment } = req.body

    // ── Validation ──────────────────────────────────────────────────────────
    if (!campaignId || !mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({ error: 'campaignId valide requis' })
    }
    if (!evaluateeId || !mongoose.isValidObjectId(evaluateeId)) {
      return res.status(400).json({ error: 'evaluateeId valide requis' })
    }
    if (reviewerScore !== undefined && reviewerScore !== null) {
      if (typeof reviewerScore !== 'number' || reviewerScore < 0 || reviewerScore > 100) {
        return res.status(400).json({ error: 'reviewerScore doit être un nombre entre 0 et 100' })
      }
    }
    if (reviewerComment !== undefined) {
      if (typeof reviewerComment !== 'string' || reviewerComment.length > 5000) {
        return res.status(400).json({ error: 'reviewerComment invalide (max 5000 chars)' })
      }
    }

    // ── RBAC ────────────────────────────────────────────────────────────────
    const role = req.user.role
    const uid  = req.user.id.toString()

    if (role === 'employee') {
      return res.status(403).json({ error: 'Accès refusé' })
    }
    if (role === 'manager') {
      const campaign = await Campaign.findById(campaignId, 'extendedVisibility').lean()
      const visibleIds = await getVisibleUserIds(req.user.id, campaign)
      if (!visibleIds.includes(evaluateeId)) {
        return res.status(403).json({ error: 'Accès refusé' })
      }
    }
    // admin / hr : accès total

    const result = await saveSynthesis(campaignId, evaluateeId, {
      reviewerScore,
      reviewerComment: reviewerComment ?? '',
      reviewedBy: uid,
    })

    res.json({ ok: true, evaluationId: result.evaluationId })
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message })
    }
    next(err)
  }
})

// ── Helper RBAC mutualisé ──────────────────────────────────────────────────────
/**
 * Vérifie que l'utilisateur courant peut accéder à l'évaluatee donné.
 * - admin/hr : toujours autorisé
 * - manager  : évaluatee dans getVisibleUserIds
 * - employee : uniquement lui-même
 *
 * @returns {boolean} true si accès autorisé
 */
async function canAccessEvaluatee(req, campaignId, evaluateeId) {
  const role = req.user.role
  const uid  = req.user.id.toString()

  if (role === 'admin' || role === 'hr') return true

  if (role === 'manager') {
    const campaign = await Campaign.findById(campaignId, 'extendedVisibility').lean()
    const visibleIds = await getVisibleUserIds(req.user.id, campaign)
    return visibleIds.includes(evaluateeId)
  }

  // employee
  return uid === evaluateeId
}

/**
 * PATCH /api/interviews/state
 * body : { campaignId, evaluateeId, discussion?, objectivesReview?, nextYearObjectives?, synthesis? }
 */
router.patch('/state', async (req, res, next) => {
  try {
    const { campaignId, evaluateeId, discussion, objectivesReview, nextYearObjectives, synthesis } = req.body

    if (!campaignId || !mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({ error: 'campaignId valide requis' })
    }
    if (!evaluateeId || !mongoose.isValidObjectId(evaluateeId)) {
      return res.status(400).json({ error: 'evaluateeId valide requis' })
    }

    const allowed = await canAccessEvaluatee(req, campaignId, evaluateeId)
    if (!allowed) return res.status(403).json({ error: 'Accès refusé' })

    await saveState(campaignId, evaluateeId, { discussion, objectivesReview, nextYearObjectives, synthesis })

    res.json({ ok: true })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
})

/**
 * POST /api/interviews/sign
 * body : { campaignId, evaluateeId, role, dataUrl }
 */
router.post('/sign', async (req, res, next) => {
  try {
    const { campaignId, evaluateeId, dataUrl } = req.body

    if (!campaignId || !mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({ error: 'campaignId valide requis' })
    }
    if (!evaluateeId || !mongoose.isValidObjectId(evaluateeId)) {
      return res.status(400).json({ error: 'evaluateeId valide requis' })
    }
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
      return res.status(400).json({ error: "dataUrl invalide (doit être un data URI image)" })
    }

    const allowed = await canAccessEvaluatee(req, campaignId, evaluateeId)
    if (!allowed) return res.status(403).json({ error: 'Accès refusé' })

    // SÉCURITÉ (anti-forgery) : le slot de signature est DÉDUIT du rôle réel de
    // l'appelant, jamais accepté depuis le body. L'évalué ne peut signer que le
    // slot 'evaluatee' ; un employé ne peut pas apposer la signature manager.
    const isEvaluatee = req.user.id.toString() === evaluateeId.toString()
    if (!isEvaluatee && req.user.role === 'employee') {
      return res.status(403).json({ error: 'Accès refusé' })
    }
    const role = isEvaluatee ? 'evaluatee' : 'manager'

    const interview = await addSignature(campaignId, evaluateeId, { role, dataUrl })

    res.json({ ok: true, status: interview.status })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
})

/**
 * POST /api/interviews/disagreement
 * body : { campaignId, evaluateeId, reason }
 */
router.post('/disagreement', async (req, res, next) => {
  try {
    const { campaignId, evaluateeId, reason } = req.body

    if (!campaignId || !mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({ error: 'campaignId valide requis' })
    }
    if (!evaluateeId || !mongoose.isValidObjectId(evaluateeId)) {
      return res.status(400).json({ error: 'evaluateeId valide requis' })
    }

    const allowed = await canAccessEvaluatee(req, campaignId, evaluateeId)
    if (!allowed) return res.status(403).json({ error: 'Accès refusé' })

    await flagDisagreement(campaignId, evaluateeId, { by: req.user.id, reason })

    res.json({ ok: true })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
})

module.exports = router
