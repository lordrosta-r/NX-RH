'use strict'

// =============================================================================
// /api/forms — Formulaires (templates de questions)
//
// GET    /api/forms              → liste (filtrable par campaignId, formType)
// GET    /api/forms/:id          → détail
// POST   /api/forms              → créer (admin/hr)
// PATCH  /api/forms/:id          → modifier (admin/hr, bloqué si frozenAt)
// DELETE /api/forms/:id          → supprimer (admin/hr, bloqué si frozenAt)
// =============================================================================

const router   = require('express').Router()
const mongoose = require('mongoose')
const { Form } = require('../models')
const { ADMIN_ROLES } = require('../config/constants')

// ─── GET /api/forms ──────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const filter = {}

    if (req.query.campaignId) {
      if (!mongoose.isValidObjectId(req.query.campaignId)) {
        return res.status(400).json({ error: 'campaignId invalide' })
      }
      filter.campaignId = req.query.campaignId
    }

    if (req.query.formType) {
      if (!Form.schema.path('formType').enumValues.includes(req.query.formType)) {
        return res.status(400).json({ error: 'formType invalide' })
      }
      filter.formType = req.query.formType
    }

    if (req.query.page) {
      const page  = Math.max(1, parseInt(req.query.page)  || 1)
      const limit = Math.min(100, parseInt(req.query.limit) || 50)
      const skip  = (page - 1) * limit
      const [forms, total] = await Promise.all([
        Form.find(filter).populate('createdBy', 'firstName lastName').sort({ createdAt: 1 }).skip(skip).limit(limit).lean(),
        Form.countDocuments(filter),
      ])
      return res.json({ data: forms, total, page, limit })
    }

    const forms = await Form.find(filter)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: 1 })
      .limit(100)
      .lean()

    res.json(forms)
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/forms/:id ──────────────────────────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const form = await Form.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .lean()

    if (!form) return res.status(404).json({ error: 'Formulaire introuvable' })
    res.json(form)
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/forms ─────────────────────────────────────────────────────────

router.post('/', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }

    const { campaignId, title, description, formType, isAnonymous, questions } = req.body

    if (!title || !formType) {
      return res.status(400).json({ error: 'title et formType sont requis' })
    }
    if (campaignId && !mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({ error: 'campaignId invalide' })
    }
    if (questions !== undefined && !Array.isArray(questions)) {
      return res.status(400).json({ error: 'questions doit être un tableau' })
    }

    const form = await Form.create({
      campaignId:   campaignId || null,
      title,
      description:  description || '',
      formType,
      isAnonymous:  formType === 'upward_feedback' ? true : (isAnonymous || false),
      questions:    Array.isArray(questions) ? questions : [],
      createdBy:    req.user.id,
    })

    res.status(201).json({ id: form._id })
  } catch (err) {
    // Erreurs de validation Mongoose (pre-save, required, enum)
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message })
    }
    next(err)
  }
})

// ─── PATCH /api/forms/:id ────────────────────────────────────────────────────

router.patch('/:id', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const form = await Form.findById(req.params.id)
    if (!form) return res.status(404).json({ error: 'Formulaire introuvable' })

    // Bloquer la modification des questions si le form est gelé (évaluations existantes)
    if (req.body.questions !== undefined && form.frozenAt) {
      return res.status(409).json({
        error: 'Les questions sont gelées — des évaluations existent déjà sur ce formulaire',
        frozenAt: form.frozenAt,
      })
    }

    // Champs modifiables librement
    const EDITABLE_FREE = ['title', 'description']
    EDITABLE_FREE.forEach(key => {
      if (req.body[key] !== undefined) form[key] = req.body[key]
    })

    // Questions : modifiables seulement si pas gelées
    if (req.body.questions !== undefined && !form.frozenAt) {
      form.questions = req.body.questions
    }

    await form.save()
    res.json({ id: form._id })
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message })
    }
    next(err)
  }
})

// ─── DELETE /api/forms/:id ───────────────────────────────────────────────────

router.delete('/:id', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const form = await Form.findById(req.params.id)
    if (!form) return res.status(404).json({ error: 'Formulaire introuvable' })

    if (form.frozenAt) {
      return res.status(409).json({
        error: 'Impossible de supprimer un formulaire lié à des évaluations existantes',
        frozenAt: form.frozenAt,
      })
    }

    await form.deleteOne()
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

module.exports = router
