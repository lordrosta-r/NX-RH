'use strict'

// =============================================================================
// routes/hr/flags.js — Gestion des demandes RH (flags)
//
// Exploite les Evaluations dont le Form est de type REQUEST_FORM_TYPES.
//
// GET   /api/hr/flags                   → liste des demandes filtrables
// PATCH /api/hr/flags/:evalId/status    → mise à jour du statut + note RH
//
// Rôles autorisés : admin, hr (déclaré dans index.js)
// =============================================================================

const router   = require('express').Router()
const mongoose = require('mongoose')
const { User, Form, Evaluation } = require('../../models')
const { REQUEST_FORM_TYPES } = require('../../config/constants')
const { notify: notifyInApp } = require('../../services/notificationHelper')
const notificationService     = require('../../services/notificationService')
const { authGuard }           = require('../../middleware/authGuard')
const logger                  = require('../../utils/logger')

const ADMIN_HR        = authGuard(['admin', 'hr'])
const BROAD_GUARD     = authGuard(['admin', 'hr', 'manager', 'employee'])

const VALID_HR_STATUSES = ['assigned', 'in_progress', 'submitted', 'reviewed', 'validated', 'rejected']

// ─── GET /api/hr/flags/count — badge navbar polling ──────────────────────────

router.get('/count', ADMIN_HR, async (req, res) => {
  try {
    const requestForms = await Form.find({ formType: { $in: REQUEST_FORM_TYPES } }).select('_id formType').lean()
    const formIdToType = {}
    const formIds = requestForms.map(f => { formIdToType[f._id.toString()] = f.formType; return f._id })

    const evals = await Evaluation.find({
      campaignId: null,
      formId: { $in: formIds },
      status: { $in: ['assigned', 'submitted'] }
    }).select('formId').lean()

    const byType = {}
    for (const e of evals) {
      const t = formIdToType[e.formId.toString()] || 'unknown'
      byType[t] = (byType[t] || 0) + 1
    }

    return res.json({ count: evals.length, byType })
  } catch (err) {
    logger.error('[flags/count]', { error: err.message })
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ─── GET /api/hr/flags ────────────────────────────────────────────────────────

router.get('/', ADMIN_HR, async (req, res, next) => {
  try {
    const { type, status, from, to, department, sectorId } = req.query
    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20))

    // Formes de type "request"
    const formFilter = { formType: { $in: REQUEST_FORM_TYPES } }
    if (type && REQUEST_FORM_TYPES.includes(type)) formFilter.formType = type

    const forms   = await Form.find(formFilter, '_id formType title').lean()
    const formIds = forms.map(f => f._id)

    const evalFilter = { formId: { $in: formIds } }

    if (status && VALID_HR_STATUSES.includes(status)) {
      evalFilter.status = status
    }

    if (from || to) {
      evalFilter.createdAt = {}
      if (from) evalFilter.createdAt.$gte = new Date(from)
      if (to)   evalFilter.createdAt.$lte = new Date(to)
    }

    // Filtre DB-level sur les utilisateurs (department / sectorId) pour que la
    // pagination soit précise (pas de filtre post-populate).
    if (department || sectorId) {
      const userFilter = {}
      if (department) userFilter.department = department
      if (sectorId && mongoose.isValidObjectId(sectorId)) userFilter.sectorId = sectorId
      const matchingUsers = await User.find(userFilter, '_id').lean()
      evalFilter.evaluateeId = { $in: matchingUsers.map(u => u._id) }
    }

    const total = await Evaluation.countDocuments(evalFilter)
    const data  = await Evaluation.find(evalFilter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('evaluateeId', 'firstName lastName email department sectorId')
      .populate('formId',      'title formType')
      .lean()

    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/hr/flags/:id ────────────────────────────────────────────────────

router.get('/:id', ADMIN_HR, async (req, res, next) => {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const requestForms = await Form.find({ formType: { $in: REQUEST_FORM_TYPES } }).select('_id formType').lean()
    const requestFormIds = requestForms.map(f => f._id)

    const evaluation = await Evaluation.findOne({ _id: id, formId: { $in: requestFormIds } })
      .populate('evaluateeId', 'firstName lastName email department sectorId')
      .populate('formId', 'title formType')
      .lean()

    if (!evaluation) {
      return res.status(404).json({ error: 'Signal RH introuvable' })
    }

    const evaluatee = evaluation.evaluateeId
    const form = evaluation.formId

    res.json({
      id: evaluation._id.toString(),
      type: form?.formType ?? 'other',
      status: evaluation.status,
      userId: evaluatee?._id?.toString() ?? evaluation.evaluateeId?.toString(),
      userName: evaluatee ? `${evaluatee.firstName} ${evaluatee.lastName}` : undefined,
      description: evaluation.answers ? Object.values(evaluation.answers).filter(Boolean).join('\n') : undefined,
      note: evaluation.auditLog?.filter(e => e.action === 'hr_note').map(e => e.meta?.note).filter(Boolean).join('\n') || undefined,
      createdAt: evaluation.createdAt,
      updatedAt: evaluation.updatedAt,
    })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/hr/flags/:evalId/status ──────────────────────────────────────

router.patch('/:evalId/status', ADMIN_HR, async (req, res, next) => {
  try {
    const { evalId } = req.params
    if (!mongoose.isValidObjectId(evalId)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const { status, note } = req.body

    const PATCHABLE_STATUSES = ['submitted', 'reviewed', 'validated', 'rejected']
    if (!status || !PATCHABLE_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `status invalide. Valeurs autorisées : ${PATCHABLE_STATUSES.join(', ')}`,
      })
    }

    const evaluation = await Evaluation.findById(evalId)
    if (!evaluation) return res.status(404).json({ error: 'Évaluation introuvable' })

    evaluation.status = status

    if (note) {
      evaluation.auditLog.push({
        action: 'hr_note',
        by:     req.user.id,
        at:     new Date(),
        meta:   { note },
      })
    }

    await evaluation.save()

    // Populate formId pour obtenir le titre (après save pour ne pas bloquer la persistence)
    await evaluation.populate('formId', 'title')

    const evaluateeId = evaluation.evaluateeId
    const formTitle   = evaluation.formId?.title || 'votre demande'
    const evalLink    = `/evaluations/${evaluation._id}`

    // ── Notification : demande traitée (reviewed ou validated) ───────────────
    if (status === 'validated' || status === 'reviewed') {
      await notifyInApp(
        evaluateeId,
        'request_treated',
        'Votre demande a été traitée',
        `"${formTitle}" a été examinée par les RH.`,
        evalLink,
        'medium',
      )
      User.findById(evaluateeId).lean()
        .then(u => u && notificationService.notify('request_treated', u, { formTitle, evalId: evaluation._id.toString() }))
        .catch(err => logger.error('[flag-notify email]', { error: err.message }))
    }

    // ── Notification : demande refusée ou note ajoutée ────────────────────────
    if (status === 'rejected' || (note && String(note).trim())) {
      await notifyInApp(
        evaluateeId,
        'request_rejected',
        'Votre demande a été refusée',
        note ? `Motif : ${note}` : `"${formTitle}" n'a pas été retenue.`,
        evalLink,
        'high',
      )
      User.findById(evaluateeId).lean()
        .then(u => u && notificationService.notify('request_rejected', u, { formTitle, note: note || '', evalId: evaluation._id.toString() }))
        .catch(err => logger.error('[flag-reject email]', { error: err.message }))
    }

    res.json(evaluation.toObject())
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/hr/flags — Soumettre une demande RH (employee/manager/hr/admin) ─

router.post('/', BROAD_GUARD, async (req, res, next) => {
  try {
    const { formId, answers } = req.body

    if (!formId || !mongoose.isValidObjectId(formId)) {
      return res.status(400).json({ error: 'formId invalide ou manquant' })
    }

    const form = await Form.findOne({ _id: formId, formType: { $in: REQUEST_FORM_TYPES } }).lean()
    if (!form) {
      return res.status(404).json({ error: 'Formulaire de demande introuvable ou type invalide' })
    }

    const evaluation = await Evaluation.create({
      campaignId:   null,
      formId:       form._id,
      evaluateeId:  req.user.id,
      evaluatorId:  req.user.id,
      status:       'assigned',
      answers:      answers || {},
    })

    res.status(201).json(evaluation.toObject())
  } catch (err) {
    next(err)
  }
})

module.exports = router
