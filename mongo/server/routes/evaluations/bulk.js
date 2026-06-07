'use strict'

// =============================================================================
// routes/evaluations/bulk.js — Opérations en masse sur les évaluations
//
// POST  /bulk → créer des évaluations en masse (admin/hr, max 500)
// PATCH /bulk → actions en masse : archive | sign_hr | assign_reviewer (admin/hr)
// =============================================================================

const mongoose  = require('mongoose')
const { Evaluation, Form, Campaign, User, AuditLog, VALID_TRANSITIONS, ROLE_TRANSITIONS } = require('../../models')
const { ADMIN_ROLES }           = require('../../config/constants')
const { notifyMany }            = require('../../services/mailNotificationService')
const { resolveExpiry, resolvePhaseDeadline } = require('../../services/evaluationService')

// POST /bulk — Créer des évaluations en masse (max 500)
async function handleBulkCreate(req, res, next) {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }

    const { evaluations } = req.body
    if (!Array.isArray(evaluations) || evaluations.length === 0) {
      return res.status(400).json({ error: 'evaluations doit être un tableau non vide' })
    }
    if (evaluations.length > 500) {
      return res.status(400).json({ error: 'Maximum 500 évaluations par batch' })
    }

    for (const e of evaluations) {
      for (const field of ['campaignId', 'formId', 'evaluatorId', 'evaluateeId']) {
        if (!e[field]) return res.status(400).json({ error: `Champ requis manquant: ${field}` })
        if (!mongoose.isValidObjectId(e[field])) return res.status(400).json({ error: `${field} invalide` })
      }
    }

    // Geler tous les formulaires concernés
    const formIds = [...new Set(evaluations.map(e => e.formId).filter(id => id && mongoose.isValidObjectId(id)))]
    await Form.updateMany(
      { _id: { $in: formIds }, frozenAt: null },
      { $set: { frozenAt: new Date() } }
    )

    // Charger les campagnes (avec deadlines) et les types de formulaire concernés
    const uniqueCampaignIds = [...new Set(evaluations.map(e => e.campaignId?.toString()).filter(Boolean))]
    const campaigns = await Campaign.find({ _id: { $in: uniqueCampaignIds } }, 'endDate deadlineEmployee deadlineManager').lean()
    const campaignById = new Map(campaigns.map(c => [c._id.toString(), c]))
    const forms = await Form.find({ _id: { $in: formIds } }, 'formType').lean()
    const formTypeById = new Map(forms.map(f => [f._id.toString(), f.formType]))

    const sanitized = evaluations.map(e => {
      const campaign = campaignById.get(e.campaignId?.toString()) || null
      const formType = formTypeById.get(e.formId?.toString())
      return {
        ...e,
        status: 'assigned',
        lastSavedAt: null,
        expiresAt:     resolveExpiry(campaign),
        phaseDeadline: resolvePhaseDeadline(campaign, formType),
      }
    })

    const result = await Evaluation.insertMany(sanitized, { ordered: false })

    // Notifier les évalués (fire-and-forget)
    ;(async () => {
      try {
        const evaluateeIds = [...new Set(sanitized.map(e => e.evaluateeId?.toString()).filter(Boolean))]
        const campaignId = sanitized[0]?.campaignId
        const campaign = campaignId ? await Campaign.findById(campaignId, 'name').lean() : null
        const evaluatees = await User.find({ _id: { $in: evaluateeIds }, isActive: true }).lean()
        if (evaluatees.length) await notifyMany('evaluationAssigned', evaluatees, { campaignName: campaign?.name || '' })
      } catch (_) { /* notification failure must never block */ }
    })()

    res.status(201).json({ created: result.length })
  } catch (err) {
    if (err.writeErrors) {
      return res.status(207).json({
        created:  err.insertedDocs?.length || 0,
        skipped:  err.writeErrors.length,
        message:  'Certaines évaluations existaient déjà et ont été ignorées',
      })
    }
    next(err)
  }
}

// PATCH /bulk — Actions en masse : archive | sign_hr | assign_reviewer
async function handleBulkAction(req, res, next) {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }

    const { ids, action, reviewerId } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids doit être un tableau non vide' })
    }
    if (ids.length > 200) {
      return res.status(400).json({ error: 'Maximum 200 évaluations par opération bulk' })
    }

    const VALID_BULK_ACTIONS = ['archive', 'sign_hr', 'assign_reviewer']
    if (!VALID_BULK_ACTIONS.includes(action)) {
      return res.status(400).json({ error: `action invalide — valeurs acceptées: ${VALID_BULK_ACTIONS.join(', ')}` })
    }

    for (const id of ids) {
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ error: `ID invalide: ${id}` })
      }
    }

    if (action === 'assign_reviewer' && (!reviewerId || !mongoose.isValidObjectId(reviewerId))) {
      return res.status(400).json({ error: 'reviewerId valide requis pour assign_reviewer' })
    }

    const evaluations = await Evaluation.find({ _id: { $in: ids } }).lean()
    const role = req.user.role
    let success = 0, skipped = 0
    const errors = []
    const bulkOps = []
    const now = new Date()

    for (const ev of evaluations) {
      if (action === 'sign_hr') {
        const HR_CAN_SIGN = ['reviewed', 'signed_evaluatee', 'signed_manager']
        if (!HR_CAN_SIGN.includes(ev.status)) { skipped++; continue }
        bulkOps.push({
          updateOne: {
            filter: { _id: ev._id },
            update: { $set: { status: 'signed_hr', signedByHrAt: now } },
          },
        })
        success++
      } else if (action === 'archive') {
        const roleTransitions = role === 'admin' ? VALID_TRANSITIONS : (ROLE_TRANSITIONS[role] || {})
        const allowed = roleTransitions[ev.status] || []
        const $set = { reviewerComment: 'Archivé en masse par RH' }
        if (allowed.length > 0) {
          $set.status = allowed[0]
          if ($set.status === 'signed_hr') $set.signedByHrAt = now
        }
        bulkOps.push({
          updateOne: { filter: { _id: ev._id }, update: { $set } },
        })
        success++
      } else if (action === 'assign_reviewer') {
        const ASSIGNABLE = ['assigned', 'in_progress']
        if (!ASSIGNABLE.includes(ev.status)) { skipped++; continue }
        bulkOps.push({
          updateOne: {
            filter: { _id: ev._id },
            update: { $set: { evaluatorId: reviewerId } },
          },
        })
        success++
      }
    }

    if (bulkOps.length > 0) {
      try {
        await Evaluation.bulkWrite(bulkOps, { ordered: false })
      } catch (err) {
        if (err.writeErrors) {
          for (const we of err.writeErrors) {
            const op = bulkOps[we.index]
            errors.push({ id: op?.updateOne?.filter?._id?.toString(), reason: we.errmsg })
            success--
          }
        } else {
          throw err
        }
      }
    }

    // IDs non trouvés → skipped
    const foundIds = new Set(evaluations.map(e => e._id.toString()))
    for (const id of ids) {
      if (!foundIds.has(id)) skipped++
    }

    res.json({ success, skipped, errors })

    // Audit log (fire-and-forget, après la réponse)
    if (success > 0) {
      AuditLog.create({
        userId:     req.user.id,
        userRole:   req.user.role,
        action:     'bulk_action',
        targetType: 'Evaluation',
        targetId:   ids[0],
        meta:       { action, count: ids.length, success, skipped },
      }).catch(() => {})
    }
  } catch (err) {
    next(err)
  }
}

const router = require('express').Router()
router.post('/',  handleBulkCreate)
router.patch('/', handleBulkAction)

// Named exports kept for use in routes/evaluations/index.js
router.handleBulkCreate = handleBulkCreate
router.handleBulkAction = handleBulkAction

module.exports = router
