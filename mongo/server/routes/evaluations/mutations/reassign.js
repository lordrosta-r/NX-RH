'use strict'

// =============================================================================
// mutations/reassign.js — PATCH /:id/reassign : Réaffecter l'évaluateur
// =============================================================================

const mongoose = require('mongoose')
const { Evaluation, User } = require('../../../models')
const { ADMIN_ROLES } = require('../../../config/constants')

/**
 * PATCH /:id/reassign
 * Réservé aux admins/RH. Réaffecte l'évaluateur sur une évaluation non terminale.
 */
async function handleReassign(req, res, next) {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const { newEvaluatorId, reason } = req.body
    if (!newEvaluatorId || !mongoose.isValidObjectId(newEvaluatorId)) {
      return res.status(400).json({ error: 'newEvaluatorId valide requis' })
    }

    const evaluation = await Evaluation.findById(req.params.id)
    if (!evaluation) return res.status(404).json({ error: 'Évaluation introuvable' })

    const TERMINAL = ['signed_hr', 'validated']
    if (TERMINAL.includes(evaluation.status)) {
      return res.status(409).json({
        error: `Réaffectation impossible — statut terminal (${evaluation.status})`,
      })
    }

    const newEvaluator = await User.findById(newEvaluatorId, 'firstName lastName role isActive').lean()
    if (!newEvaluator) return res.status(404).json({ error: 'Utilisateur introuvable' })
    if (!newEvaluator.isActive) {
      return res.status(400).json({ error: "L'évaluateur sélectionné n'est pas actif" })
    }
    if (!['manager', 'director'].includes(newEvaluator.role)) {
      return res.status(400).json({ error: "L'évaluateur doit avoir le rôle manager ou director" })
    }

    const previousEvaluatorId = evaluation.evaluatorId

    evaluation.evaluatorId = newEvaluatorId
    evaluation.auditLog.push({
      action: 'reassigned',
      by:     req.user._id,
      at:     new Date(),
      meta:   {
        previousEvaluatorId,
        newEvaluatorId,
        reason: reason ? String(reason).slice(0, 500) : null,
      },
    })

    await evaluation.save()

    res.json({
      id:            evaluation._id,
      evaluatorId:   evaluation.evaluatorId,
      evaluatorName: `${newEvaluator.firstName} ${newEvaluator.lastName}`,
    })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        error: 'Cet évaluateur a déjà une évaluation pour ce formulaire et cet évalué dans cette campagne',
      })
    }
    next(err)
  }
}

module.exports = { handleReassign }
