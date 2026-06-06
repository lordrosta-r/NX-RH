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
// RBAC :
//   - admin/hr : accès total
//   - manager  : seulement si l'évaluatee est dans sa visibilité
//   - employee : 403
// =============================================================================

const express  = require('express')
const mongoose = require('mongoose')
const { getInterview, saveSynthesis } = require('../services/interviewService')
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

module.exports = router
