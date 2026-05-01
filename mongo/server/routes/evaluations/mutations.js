'use strict'

// =============================================================================
// routes/evaluations/mutations.js — Écriture sur les évaluations individuelles
//
// POST /           → créer une évaluation (admin/hr)
// PATCH /:id       → sauvegarder réponses / modifier statut / commentaires
// PATCH /:id/reassign → réaffecter l'évaluateur (admin/hr)
// POST  /:id/expire   → expiration manuelle (admin/hr)
// =============================================================================

const mongoose  = require('mongoose')
const { Evaluation, Form, Campaign, User, AuditLog, VALID_TRANSITIONS, ROLE_TRANSITIONS, LOCKED_STATUSES } = require('../../models')
const { ADMIN_ROLES }          = require('../../config/constants')
const { notify }               = require('../../services/notificationService')
const { sanitizeAnonymity }    = require('./helpers')

// POST / — Créer une évaluation individuelle (admin/hr)
async function handleCreate(req, res, next) {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }

    const { campaignId, formId, evaluatorId, evaluateeId } = req.body

    if (!campaignId || !formId || !evaluatorId || !evaluateeId) {
      return res.status(400).json({ error: 'campaignId, formId, evaluatorId et evaluateeId sont requis' })
    }

    for (const [key, val] of Object.entries({ campaignId, formId, evaluatorId, evaluateeId })) {
      if (!mongoose.isValidObjectId(val)) {
        return res.status(400).json({ error: `${key} invalide` })
      }
    }

    // Geler le formulaire si pas encore figé
    await Form.findByIdAndUpdate(formId, { $set: { frozenAt: new Date() } }, { timestamps: false })
      .where({ frozenAt: null })

    const campaign  = await Campaign.findById(campaignId, 'endDate').lean()
    const expiresAt = campaign?.endDate
      ? new Date(new Date(campaign.endDate).getTime() + 30 * 24 * 60 * 60 * 1000)
      : null

    const evaluation = await Evaluation.create({ campaignId, formId, evaluatorId, evaluateeId, expiresAt })
    res.status(201).json({ id: evaluation._id })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Cette évaluation existe déjà' })
    }
    next(err)
  }
}

// PATCH /:id/reassign — Réaffecter l'évaluateur (admin/hr)
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

// PATCH /:id — Sauvegarder réponses, modifier statut ou commentaires
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

    // Sauvegarde des réponses (brouillon)
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
      evaluation.answers     = req.body.answers
      evaluation.lastSavedAt = new Date()
    }

    // Score (manager/director/admin/hr uniquement)
    if (req.body.score !== undefined) {
      if (!['manager', 'director', 'admin', 'hr'].includes(role)) {
        return res.status(403).json({ error: 'Seuls les managers et admins peuvent ajouter un score' })
      }
      if (evaluation.status === 'validated') {
        return res.status(403).json({ error: 'Score non modifiable sur une évaluation validée' })
      }
      if (['manager', 'director'].includes(role)) {
        const evaluatee = await User.findById(evaluation.evaluateeId, 'managerId').lean()
        if (!evaluatee || evaluatee.managerId?.toString() !== uid) {
          return res.status(403).json({ error: "Vous n'êtes pas le manager de cet évalué" })
        }
      }
      evaluation.score = req.body.score
    }

    // Commentaire reviewer (manager/director/admin/hr)
    if (req.body.reviewerComment !== undefined) {
      if (!['manager', 'director', 'admin', 'hr'].includes(role)) {
        return res.status(403).json({ error: 'Seuls les managers et admins peuvent ajouter un commentaire reviewer' })
      }
      if (typeof req.body.reviewerComment !== 'string' || req.body.reviewerComment.length > 5000) {
        return res.status(400).json({ error: 'reviewerComment invalide (max 5000 chars)' })
      }
      evaluation.reviewerComment = req.body.reviewerComment
    }

    // Objectifs suivants (manager/director/admin/hr)
    if (req.body.nextObjectives !== undefined) {
      if (!['manager', 'director', 'admin', 'hr'].includes(role)) {
        return res.status(403).json({ error: 'Seuls les managers et admins peuvent définir les objectifs suivants' })
      }
      if (typeof req.body.nextObjectives !== 'string' || req.body.nextObjectives.length > 5000) {
        return res.status(400).json({ error: 'nextObjectives invalide (max 5000 chars)' })
      }
      evaluation.nextObjectives = req.body.nextObjectives
    }

    // Notations des objectifs (manager/director/admin/hr)
    if (req.body.objectiveRatings !== undefined) {
      if (!['manager', 'director', 'admin', 'hr'].includes(role)) {
        return res.status(403).json({ error: 'Seuls les managers et admins peuvent noter les objectifs' })
      }
      if (typeof req.body.objectiveRatings !== 'object' || Array.isArray(req.body.objectiveRatings)) {
        return res.status(400).json({ error: 'objectiveRatings doit être un objet' })
      }
      evaluation.objectiveRatings = req.body.objectiveRatings
    }

    // Commentaire de l'évalué
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

    // Transition de statut
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
    }

    await evaluation.save()

    // Audit log (fire-and-forget)
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
    }).catch(() => {})

    // Notifications sur changement de statut (fire-and-forget)
    if (req.body.status) {
      _sendStatusNotifications(evaluation, req.body.status)
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

// POST /:id/expire — Expiration manuelle (admin/hr)
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

// ─── Notifications internes ────────────────────────────────────────────────────

async function _sendStatusNotifications(evaluation, newStatus) {
  try {
    const campaign = evaluation.campaignId
      ? await Campaign.findById(evaluation.campaignId, 'name').lean()
      : null
    const cName = campaign?.name || ''

    if (newStatus === 'submitted') {
      const evaluatee = await User.findById(evaluation.evaluateeId, 'managerId firstName').lean()
      if (evaluatee?.managerId) {
        const manager = await User.findById(evaluatee.managerId).lean()
        if (manager) await notify('evaluationSubmitted', manager, { evaluatorName: evaluatee.firstName, campaignName: cName })
      }
    } else if (newStatus === 'reviewed') {
      const evaluatee = await User.findById(evaluation.evaluateeId).lean()
      if (evaluatee) await notify('managerActionRequired', evaluatee, { campaignName: cName })
    } else if (newStatus === 'signed_evaluatee') {
      const evaluatee = await User.findById(evaluation.evaluateeId, 'managerId firstName').lean()
      if (evaluatee?.managerId) {
        const manager = await User.findById(evaluatee.managerId).lean()
        if (manager) await notify('evaluationSubmitted', manager, { evaluatorName: evaluatee.firstName, campaignName: cName })
      }
    } else if (newStatus === 'signed_manager') {
      const { notifyMany } = require('../../services/notificationService')
      const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] }, isActive: true }).lean()
      if (hrUsers.length) await notifyMany('evaluationSubmitted', hrUsers, { evaluatorName: 'Manager', campaignName: cName })
    } else if (newStatus === 'signed_hr') {
      const evaluatee = await User.findById(evaluation.evaluateeId).lean()
      if (evaluatee) await notify('managerActionRequired', evaluatee, { campaignName: cName })
      if (evaluatee?.managerId) {
        const manager = await User.findById(evaluatee.managerId).lean()
        if (manager) await notify('evaluationSubmitted', manager, { evaluatorName: evaluatee.firstName, campaignName: cName })
      }
    }
  } catch (_) { /* notification failure must never block */ }
}

module.exports = { handleCreate, handleUpdate, handleReassign, handleExpire }
