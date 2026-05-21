'use strict'

// =============================================================================
// /api/forms — Formulaires (templates de questions)
//
// GET    /api/forms              → liste (filtrable par campaignId, formType, search)
// GET    /api/forms/:id          → détail
// POST   /api/forms              → créer (admin/hr)
// PATCH  /api/forms/:id          → modifier (admin/hr, bloqué si frozenAt)
// DELETE /api/forms/:id          → supprimer (admin/hr, bloqué si frozenAt)
// POST   /api/forms/:id/freeze   → geler (admin seulement)
// POST   /api/forms/:id/unfreeze → dégeler (admin seulement)
// POST   /api/forms/:id/clone    → cloner (admin/hr)
// =============================================================================

const router      = require('express').Router()
const mongoose    = require('mongoose')
const { Form } = require('../models')
const { ADMIN_ROLES } = require('../config/constants')

// GET /api/forms — Liste des formulaires (filtrable par campaignId, formType, search)
// ?campaignId=X → retourne uniquement les forms liés à cette campagne
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

    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: 'i' }
    }

    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 50)
    const skip  = (page - 1) * limit
    const [forms, total] = await Promise.all([
      Form.find(filter).populate('createdBy', 'firstName lastName').sort({ createdAt: 1 }).skip(skip).limit(limit).lean(),
      Form.countDocuments(filter),
    ])
    res.json({ data: forms, total, page, limit })
  } catch (err) {
    next(err)
  }
})

// GET /api/forms/:id — Détail d'un formulaire
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

// POST /api/forms — Créer un formulaire (admin/hr)
router.post('/', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }

    const { title, description, formType, isAnonymous, questions, campaignId } = req.body

    if (!title || !formType) {
      return res.status(400).json({ error: 'title et formType sont requis' })
    }
    if (campaignId !== undefined && !mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({ error: 'campaignId invalide' })
    }
    if (questions !== undefined && !Array.isArray(questions)) {
      return res.status(400).json({ error: 'questions doit être un tableau' })
    }

    const form = await Form.create({
      title,
      description:  description || '',
      formType,
      isAnonymous:  formType === 'upward_feedback' ? true : (isAnonymous || false),
      questions:    Array.isArray(questions) ? questions : [],
      createdBy:    req.user.id,
    })

    const created = await Form.findById(form._id).populate('createdBy', 'firstName lastName').lean()
    res.status(201).json(created)
  } catch (err) {
    // Erreurs de validation Mongoose (pre-save, required, enum)
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message })
    }
    next(err)
  }
})

// PATCH /api/forms/:id — Modifier un formulaire (admin/hr, bloqué si frozenAt)
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

// POST /api/forms/:id/freeze — Geler un formulaire (admin seulement)
router.post('/:id/freeze', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Réservé aux admins' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const form = await Form.findById(req.params.id)
    if (!form) return res.status(404).json({ error: 'Formulaire introuvable' })

    form.isFrozen = true
    form.frozenAt = form.frozenAt || new Date()
    await form.save()

    const updated = await Form.findById(form._id).populate('createdBy', 'firstName lastName').lean()
    res.json({ success: true, form: updated })
  } catch (err) {
    next(err)
  }
})

// POST /api/forms/:id/unfreeze — Dégeler un formulaire (admin seulement)
router.post('/:id/unfreeze', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Réservé aux admins' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const form = await Form.findById(req.params.id)
    if (!form) return res.status(404).json({ error: 'Formulaire introuvable' })

    form.isFrozen = false
    form.frozenAt = null
    await form.save()

    const updated = await Form.findById(form._id).populate('createdBy', 'firstName lastName').lean()
    res.json({ success: true, form: updated })
  } catch (err) {
    next(err)
  }
})

// POST /api/forms/:id/clone — Cloner un formulaire (admin/hr)
router.post('/:id/clone', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const original = await Form.findById(req.params.id).lean()
    if (!original) return res.status(404).json({ error: 'Formulaire introuvable' })

    // eslint-disable-next-line no-unused-vars
    const { _id, createdAt, updatedAt, frozenAt, isFrozen, ...rest } = original
    const clone = await Form.create({
      ...rest,
      title:    `Copie de ${original.title}`,
      isFrozen: false,
      frozenAt: null,
      createdBy: req.user.id,
    })

    const created = await Form.findById(clone._id).populate('createdBy', 'firstName lastName').lean()
    res.status(201).json({ form: created })
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message })
    }
    next(err)
  }
})

// DELETE /api/forms/:id — Supprimer un formulaire non gelé (admin/hr)
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
