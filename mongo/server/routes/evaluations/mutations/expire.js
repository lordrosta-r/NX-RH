'use strict'

// =============================================================================
// mutations/expire.js — POST /:id/expire : Expiration manuelle (admin/hr)
// =============================================================================

const mongoose = require('mongoose')
const { Evaluation } = require('../../../models')
const { ADMIN_ROLES } = require('../../../config/constants')

/**
 * POST /:id/expire
 * Réservé aux admins/RH. Force le statut 'expired' sur une évaluation non terminale.
 */
async function handleExpire(req, res, next) {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const evaluation = await Evaluation.findById(req.params.id)
    if (!evaluation) return res.status(404).json({ error: 'Évaluation introuvable' })

    if (['validated', 'expired'].includes(evaluation.status)) {
      return res.status(409).json({ error: `Impossible d'expirer — statut actuel: ${evaluation.status}` })
    }

    evaluation.status     = 'expired'
    evaluation.nearExpiry = false
    await evaluation.save()

    res.json({ id: evaluation._id, status: evaluation.status })
  } catch (err) {
    next(err)
  }
}

module.exports = { handleExpire }
