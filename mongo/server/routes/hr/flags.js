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
const { Form, Evaluation } = require('../../models')
const { REQUEST_FORM_TYPES } = require('../../config/constants')

const VALID_HR_STATUSES = ['assigned', 'in_progress', 'submitted', 'reviewed', 'validated']

// ─── GET /api/hr/flags ────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { type, status, from, to, department, sectorId } = req.query

    // Formes de type "request"
    const formFilter = { formType: { $in: REQUEST_FORM_TYPES } }
    if (type && REQUEST_FORM_TYPES.includes(type)) formFilter.formType = type

    const forms    = await Form.find(formFilter, '_id formType title').lean()
    const formIds  = forms.map(f => f._id)

    const evalFilter = { formId: { $in: formIds } }

    if (status && VALID_HR_STATUSES.includes(status)) {
      evalFilter.status = status
    }

    if (from || to) {
      evalFilter.createdAt = {}
      if (from) evalFilter.createdAt.$gte = new Date(from)
      if (to)   evalFilter.createdAt.$lte = new Date(to)
    }

    let evaluations = await Evaluation.find(evalFilter)
      .populate('evaluateeId', 'firstName lastName email department sectorId')
      .populate('formId',      'title formType')
      .lean()

    // Filtres post-populate sur l'évalué
    if (department) {
      evaluations = evaluations.filter(e => e.evaluateeId?.department === department)
    }
    if (sectorId) {
      evaluations = evaluations.filter(e => e.evaluateeId?.sectorId?.toString() === sectorId)
    }

    res.json(evaluations)
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/hr/flags/:evalId/status ──────────────────────────────────────

router.patch('/:evalId/status', async (req, res, next) => {
  try {
    const { evalId } = req.params
    if (!mongoose.isValidObjectId(evalId)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const { status, note } = req.body

    const PATCHABLE_STATUSES = ['submitted', 'reviewed', 'validated']
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
    res.json(evaluation.toObject())
  } catch (err) {
    next(err)
  }
})

module.exports = router
