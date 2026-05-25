'use strict'

// =============================================================================
// mutations/sign.js — POST /:id/sign : Signature électronique
// =============================================================================

const mongoose = require('mongoose')
const { Evaluation, User } = require('../../../models')
const { ADMIN_ROLES } = require('../../../config/constants')
const { notify: notifyInApp } = require('../../../services/notificationHelper')
const { sanitizeAnonymity } = require('../helpers')
const cache = require('../../../utils/cache')

/**
 * POST /:id/sign
 * Enregistre la signature de l'évalué, de l'évaluateur ou d'un RH/admin.
 * Chaque utilisateur ne peut signer qu'une seule fois.
 */
async function handleSign(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const evaluation = await Evaluation.findById(req.params.id)
    if (!evaluation) return res.status(404).json({ error: 'Évaluation introuvable' })

    const userId        = req.user._id.toString()
    const role          = req.user.role
    const isHrAdmin     = ADMIN_ROLES.includes(role)
    const isEvaluatee   = evaluation.evaluateeId?.toString() === userId
    const isEvaluator   = evaluation.evaluatorId?.toString() === userId
    const isManagerRole = ['manager', 'director'].includes(role)

    // Empêcher double signature
    const alreadySigned = (evaluation.signatures ?? []).some(s => s.userId.toString() === userId)
    if (alreadySigned) {
      return res.status(409).json({ error: 'Vous avez déjà signé cette évaluation' })
    }

    // Déterminer la transition autorisée selon statut courant et rôle
    let signingRole, nextStatus, timestampField

    if (isEvaluatee && evaluation.status === 'reviewed') {
      signingRole    = 'evaluatee'
      nextStatus     = 'signed_evaluatee'
      timestampField = 'signedByEvaluateeAt'
    } else if ((isEvaluator || isManagerRole) && !isHrAdmin && evaluation.status === 'signed_evaluatee') {
      signingRole    = 'evaluator'
      nextStatus     = 'signed_manager'
      timestampField = 'signedByManagerAt'
    } else if (isHrAdmin && ['reviewed', 'signed_evaluatee', 'signed_manager'].includes(evaluation.status)) {
      signingRole    = 'hr'
      nextStatus     = 'signed_hr'
      timestampField = 'signedByHrAt'
    } else {
      return res.status(403).json({
        error: `Signature non autorisée — statut '${evaluation.status}', rôle '${role}'`,
      })
    }

    const now = new Date()

    evaluation.signatures.push({ userId: req.user._id, role: signingRole, signedAt: now, ipAddress: req.ip })
    evaluation[timestampField] = now
    evaluation.status = nextStatus

    // Mettre à jour signatureStatus (suit la paire évalué/évaluateur)
    const hasEvaluateeSig = evaluation.signatures.some(s => s.role === 'evaluatee')
    const hasEvaluatorSig = evaluation.signatures.some(s => s.role === 'evaluator')
    if (hasEvaluateeSig && hasEvaluatorSig) {
      evaluation.signatureStatus = 'complete'
    } else if (hasEvaluatorSig) {
      evaluation.signatureStatus = 'pending_evaluatee'
    } else if (hasEvaluateeSig) {
      evaluation.signatureStatus = 'pending_evaluator'
    }

    evaluation.auditLog.push({ action: 'signed', by: req.user._id, at: now, meta: { signingRole, nextStatus, ip: req.ip } })

    await evaluation.save()

    cache.invalidatePattern('GET:/api/analytics')
    cache.invalidatePattern('GET:/api/v1/analytics')
    cache.invalidatePattern('GET:/api/dashboard')
    cache.invalidatePattern('GET:/api/v1/dashboard')

    // Notifications in-app (fire-and-forget)
    if (signingRole === 'evaluatee') {
      notifyInApp(evaluation.evaluatorId, 'eval_signed_evaluatee', "Évaluation signée par l'évalué",
        '', `/evaluations/${evaluation._id}`).catch(() => {})
    } else if (signingRole === 'evaluator') {
      User.find({ role: { $in: ['hr', 'admin'] }, isActive: true }).select('_id').lean()
        .then(hrUsers => hrUsers.forEach(u =>
          notifyInApp(u._id, 'eval_signed_manager', 'Évaluation signée par le manager',
            '', `/evaluations/${evaluation._id}`).catch(() => {})))
        .catch(() => {})
    }

    const updated = await Evaluation.findById(evaluation._id)
      .populate('formId', 'title formType isAnonymous')
      .populate('evaluatorId', 'firstName lastName')
      .populate('evaluateeId', 'firstName lastName department position')
      .populate('campaignId', 'name status')
      .lean()

    res.json({ data: sanitizeAnonymity(updated), message: 'Signature enregistrée' })
  } catch (err) { next(err) }
}

module.exports = { handleSign }
