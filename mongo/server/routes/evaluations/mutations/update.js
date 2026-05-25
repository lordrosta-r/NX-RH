'use strict'

// =============================================================================
// mutations/update.js — PATCH /:id : Sauvegarder réponses / modifier statut
// =============================================================================

const mongoose = require('mongoose')
const { Evaluation, User, AuditLog, VALID_TRANSITIONS, ROLE_TRANSITIONS, LOCKED_STATUSES } = require('../../../models')
const { sanitizeAnonymity } = require('../helpers')
const { _sendStatusNotifications } = require('./notifications')
const cache = require('../../../utils/cache')

/**
 * PATCH /:id
 * Patch partiel : réponses, score, commentaires, objectifs, flag désaccord, statut.
 * Les droits RBAC sont vérifiés par champ.
 */
async function handleUpdate(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const evaluation = await Evaluation.findById(req.params.id)
    if (!evaluation) return res.status(404).json({ error: 'Évaluation introuvable' })

    const originalStatus = evaluation.status
    const uid  = req.user.id.toString()
    const role = req.user.role

    if (role === 'employee') {
      const isEvaluator = evaluation.evaluatorId.toString() === uid
      const isEvaluatee = evaluation.evaluateeId.toString() === uid
      if (!isEvaluator && !isEvaluatee) {
        return res.status(403).json({ error: 'Accès refusé' })
      }
    }

    // Cache de l'évalué pour éviter les requêtes répétées dans le même appel
    let _evaluatee = null

    // ── Réponses (brouillon) ──────────────────────────────────────────────────
    if (req.body.answers !== undefined) {
      if (!Array.isArray(req.body.answers)) {
        return res.status(400).json({ error: 'answers doit être un tableau' })
      }
      for (const a of req.body.answers) {
        if (!a || typeof a.questionId !== 'string' || a.questionId.length > 100) {
          return res.status(400).json({ error: 'questionId invalide dans answers' })
        }
        if (typeof a.value === 'object' && a.value !== null && !Array.isArray(a.value)) {
          return res.status(400).json({ error: 'answer.value ne peut pas être un objet' })
        }
      }
      if (LOCKED_STATUSES.includes(evaluation.status)) {
        return res.status(409).json({ error: 'Les réponses sont verrouillées — évaluation déjà soumise' })
      }
      if (['manager', 'director'].includes(role)) {
        if (!_evaluatee) _evaluatee = await User.findById(evaluation.evaluateeId).select('managerId').lean()
        if (!_evaluatee || !_evaluatee.managerId || !_evaluatee.managerId.equals(req.user._id)) {
          return res.status(403).json({ error: "Accès interdit : vous n'êtes pas le manager de cet évaluataire." })
        }
      }
      evaluation.answers     = req.body.answers
      evaluation.lastSavedAt = new Date()
    }

    // ── Score reviewer (manager/director/admin/hr) ────────────────────────────
    if (req.body.reviewerScore !== undefined) {
      if (!['manager', 'director', 'admin', 'hr'].includes(role)) {
        return res.status(403).json({ error: 'Seuls les managers et admins peuvent ajouter un score' })
      }
      if (evaluation.status === 'validated') {
        return res.status(403).json({ error: 'Score non modifiable sur une évaluation validée' })
      }
      if (['manager', 'director'].includes(role)) {
        if (!_evaluatee) _evaluatee = await User.findById(evaluation.evaluateeId, 'managerId').lean()
        if (!_evaluatee || _evaluatee.managerId?.toString() !== uid) {
          return res.status(403).json({ error: "Vous n'êtes pas le manager de cet évalué" })
        }
      }
      evaluation.reviewerScore = req.body.reviewerScore
    }

    // ── Commentaire reviewer ──────────────────────────────────────────────────
    if (req.body.reviewerComment !== undefined) {
      if (!['manager', 'director', 'admin', 'hr'].includes(role)) {
        return res.status(403).json({ error: 'Seuls les managers et admins peuvent ajouter un commentaire reviewer' })
      }
      if (typeof req.body.reviewerComment !== 'string' || req.body.reviewerComment.length > 5000) {
        return res.status(400).json({ error: 'reviewerComment invalide (max 5000 chars)' })
      }
      if (['manager', 'director'].includes(role)) {
        if (!_evaluatee) _evaluatee = await User.findById(evaluation.evaluateeId, 'managerId').lean()
        const isEvaluator = evaluation.evaluatorId.toString() === uid
        const isManagerOf = _evaluatee?.managerId?.toString() === uid
        if (!isEvaluator && !isManagerOf) {
          return res.status(403).json({ error: "Accès refusé : vous n'êtes pas l'évaluateur ou le manager de cet évalué" })
        }
      }
      evaluation.reviewerComment = req.body.reviewerComment
    }

    // ── Objectifs suivants ────────────────────────────────────────────────────
    if (req.body.nextYearObjectives !== undefined) {
      if (!['manager', 'director', 'admin', 'hr'].includes(role)) {
        return res.status(403).json({ error: 'Seuls les managers et admins peuvent définir les objectifs suivants' })
      }
      if (typeof req.body.nextYearObjectives !== 'string' || req.body.nextYearObjectives.length > 5000) {
        return res.status(400).json({ error: 'nextYearObjectives invalide (max 5000 chars)' })
      }
      if (['manager', 'director'].includes(role)) {
        if (!_evaluatee) _evaluatee = await User.findById(evaluation.evaluateeId, 'managerId').lean()
        const isEvaluator = evaluation.evaluatorId.toString() === uid
        const isManagerOf = _evaluatee?.managerId?.toString() === uid
        if (!isEvaluator && !isManagerOf) {
          return res.status(403).json({ error: "Accès refusé : vous n'êtes pas l'évaluateur ou le manager de cet évalué" })
        }
      }
      evaluation.nextYearObjectives = req.body.nextYearObjectives
    }

    // ── Notations des objectifs ───────────────────────────────────────────────
    if (req.body.objectiveRatings !== undefined) {
      if (!['manager', 'director', 'admin', 'hr'].includes(role)) {
        return res.status(403).json({ error: 'Seuls les managers et admins peuvent noter les objectifs' })
      }
      if (typeof req.body.objectiveRatings !== 'object' || Array.isArray(req.body.objectiveRatings)) {
        return res.status(400).json({ error: 'objectiveRatings doit être un objet' })
      }
      if (['manager', 'director'].includes(role)) {
        if (!_evaluatee) _evaluatee = await User.findById(evaluation.evaluateeId, 'managerId').lean()
        const isEvaluator = evaluation.evaluatorId.toString() === uid
        const isManagerOf = _evaluatee?.managerId?.toString() === uid
        if (!isEvaluator && !isManagerOf) {
          return res.status(403).json({ error: "Accès refusé : vous n'êtes pas l'évaluateur ou le manager de cet évalué" })
        }
      }
      evaluation.objectiveRatings = req.body.objectiveRatings
    }

    // ── Commentaire de l'évalué ───────────────────────────────────────────────
    if (req.body.evaluateeComment !== undefined) {
      const isEvaluatee = evaluation.evaluateeId.toString() === uid
      if (!isEvaluatee && !['admin', 'hr'].includes(role)) {
        return res.status(403).json({ error: "Seul l'évalué ou un admin peut ajouter un commentaire evaluatee" })
      }
      if (typeof req.body.evaluateeComment !== 'string' || req.body.evaluateeComment.length > 5000) {
        return res.status(400).json({ error: 'evaluateeComment invalide (max 5000 chars)' })
      }
      evaluation.evaluateeComment = req.body.evaluateeComment
    }

    // ── Flag de désaccord ─────────────────────────────────────────────────────
    if (req.body.disagreementFlag !== undefined) {
      const isEvaluatee = evaluation.evaluateeId.toString() === uid
      if (!isEvaluatee && !['admin', 'hr'].includes(role)) {
        return res.status(403).json({ error: "Seul l'évalué ou un admin peut modifier le flag de désaccord" })
      }
      if (typeof req.body.disagreementFlag !== 'boolean') {
        return res.status(400).json({ error: 'disagreementFlag doit être un booléen' })
      }
      evaluation.disagreementFlag = req.body.disagreementFlag
    }

    // ── Transition de statut ──────────────────────────────────────────────────
    if (req.body.status !== undefined) {
      if (['manager', 'director'].includes(role)) {
        if (evaluation.evaluatorId.toString() !== uid) {
          return res.status(403).json({ error: "Accès refusé : vous n'êtes pas l'évaluateur de cette évaluation" })
        }
      }

      const allowed = role === 'admin'
        ? (VALID_TRANSITIONS[evaluation.status] || [])
        : ((ROLE_TRANSITIONS[role] || {})[evaluation.status] || [])

      if (!allowed.includes(req.body.status)) {
        return res.status(400).json({
          error: `Transition '${evaluation.status}' → '${req.body.status}' non autorisée pour le rôle '${role}'`,
        })
      }
      evaluation.status = req.body.status

      // Timestamps de signature lors des transitions déclenchées via ce endpoint
      if (req.body.status === 'signed_evaluatee') evaluation.signedByEvaluateeAt = new Date()
      if (req.body.status === 'signed_manager')   evaluation.signedByManagerAt   = new Date()
      if (req.body.status === 'signed_hr')        evaluation.signedByHrAt        = new Date()
    }

    await evaluation.save()

    cache.invalidatePattern('GET:/api/analytics')
    cache.invalidatePattern('GET:/api/v1/analytics')
    cache.invalidatePattern('GET:/api/dashboard')
    cache.invalidatePattern('GET:/api/v1/dashboard')

    // Audit log (fire-and-forget — erreur loguée mais non bloquante)
    AuditLog.create({
      userId:     req.user.id,
      userRole:   req.user.role,
      action:     req.body.status ? 'status_change' : 'evaluation_update',
      targetType: 'Evaluation',
      targetId:   evaluation._id,
      meta: {
        from:        originalStatus,
        to:          evaluation.status,
        fields:      Object.keys(req.body).filter(k => k !== 'status'),
        evaluateeId: evaluation.evaluateeId,
        campaignId:  evaluation.campaignId,
      },
    }).catch(err => console.error('[AuditLog] create failed:', err))

    // Notifications sur changement de statut (fire-and-forget, erreurs swallowed dans la fonction)
    if (req.body.status) {
      _sendStatusNotifications(evaluation, req.body.status).catch(() => {})
    }

    const updated = await Evaluation.findById(evaluation._id)
      .populate('formId', 'title formType isAnonymous questions')
      .populate('evaluatorId', 'firstName lastName')
      .populate('evaluateeId', 'firstName lastName department position')
      .populate('campaignId', 'name status extendedVisibility')
      .lean()

    res.json(sanitizeAnonymity(updated))
  } catch (err) {
    next(err)
  }
}

module.exports = { handleUpdate }
