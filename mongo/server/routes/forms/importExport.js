'use strict'

// =============================================================================
// routes/forms/importExport.js — Import / Export de formulaires
//
// Ce router est monté trois fois dans index.js :
//   POST   /api/forms/import         → importer un form JSON
//   GET    /api/forms/template       → télécharger un template vide
//   GET    /api/forms/:id/export     → exporter un form existant
//
// Grâce à mergeParams:true, req.params.id est disponible pour la route export.
// La route GET '/' inspecte req.params.id pour distinguer template et export.
//
// Rôles autorisés : admin, hr (déclaré dans index.js)
// =============================================================================

const router   = require('express').Router({ mergeParams: true })
const mongoose = require('mongoose')
const Form     = require('../../models/Form')
const { FORM_TYPES, QUESTION_TYPES } = require('../../config/constants')

// ─── POST / — Import d'un form JSON ──────────────────────────────────────────
// Monté à : POST /api/forms/import

router.post('/', async (req, res, next) => {
  try {
    const data   = req.body
    const errors = []

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return res.status(400).json({ errors: [{ field: 'body', message: 'Body JSON invalide : objet attendu' }] })
    }

    if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 3) {
      errors.push({ field: 'title', message: 'title requis (min 3 caractères)' })
    }

    if (!data.formType || !FORM_TYPES.includes(data.formType)) {
      errors.push({ field: 'formType', message: `formType invalide. Valeurs autorisées : ${FORM_TYPES.join(', ')}` })
    }

    if (!Array.isArray(data.questions)) {
      errors.push({ field: 'questions', message: 'questions doit être un tableau' })
    } else {
      data.questions.forEach((q, i) => {
        if (!q.type || !QUESTION_TYPES.includes(q.type)) {
          errors.push({ field: `questions[${i}].type`, message: `Type de question inconnu : ${q.type}` })
        }
        if (!q.label) {
          errors.push({ field: `questions[${i}].label`, message: 'label requis' })
        }
        if (!q.id) {
          errors.push({ field: `questions[${i}].id`, message: 'id requis' })
        }
      })
    }

    if (errors.length > 0) return res.status(400).json({ errors })

    const form = new Form({
      title:       data.title.trim(),
      description: data.description || '',
      formType:    data.formType,
      isAnonymous: data.isAnonymous || false,
      questions:   data.questions   || [],
      createdBy:   req.user.id,
      frozenAt:    null,
    })

    await form.save()
    res.status(201).json(form.toObject())
  } catch (err) {
    next(err)
  }
})

// ─── GET / — Template vide OU export d'un form existant ──────────────────────
// Monté à :
//   GET /api/forms/template      → req.params.id absent → retourne template
//   GET /api/forms/:id/export    → req.params.id présent → exporte le form

router.get('/', async (req, res, next) => {
  try {
    // Export d'un form existant
    if (req.params.id) {
      const { id } = req.params
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ error: 'ID invalide' })
      }

      const form = await Form.findById(id).lean()
      if (!form) return res.status(404).json({ error: 'Formulaire introuvable' })

      const exported = { ...form }
      delete exported._id
      delete exported.createdBy
      delete exported.frozenAt
      delete exported.__v
      delete exported.createdAt
      delete exported.updatedAt
      delete exported.campaignId

      const safeTitle = (form.title || 'form')
        .replace(/[^a-z0-9\-_]/gi, '-')
        .toLowerCase()
        .slice(0, 60)

      res.setHeader('Content-Disposition', `attachment; filename="form-${safeTitle}.json"`)
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      return res.json(exported)
    }

    // Template vide
    const template = {
      title:       'Nom du formulaire',
      formType:    'self_evaluation',
      description: '',
      questions: [
        { id: 'q1', type: 'text',           label: 'Question texte libre',   required: true,  phase: 'all'         },
        { id: 'q2', type: 'rating',          label: 'Note sur 5',             scale: 5,        phase: 'all'         },
        { id: 'q3', type: 'yes_no',          label: 'Oui ou non ?',                            phase: 'all'         },
        { id: 'q4', type: 'choice',          label: 'Choix multiple',         options: ['Option A', 'Option B', 'Option C'], phase: 'all' },
        { id: 'q5', type: 'scale',           label: 'Atteinte objectif %',                     phase: 'objectives'  },
        { id: 'q6', type: 'objective_item',  label: 'Objectif annuel',                          phase: 'objectives'  },
        { id: 'q7', type: 'weather',         label: 'Météo de la période',                      phase: 'self'        },
        { id: 'q8', type: 'mobility',        label: 'Souhait de mobilité',                      phase: 'aspirations' },
      ],
    }

    res.setHeader('Content-Disposition', 'attachment; filename="form-template.json"')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.json(template)
  } catch (err) {
    next(err)
  }
})

module.exports = router
