'use strict'

// =============================================================================
// /api/forms — Formulaires (templates de questions)
//
// GET    /api/forms              → liste (filtrable par campaignId, formType, search)
// GET    /api/forms/:id          → détail
// POST   /api/forms              → créer (admin/hr/manager)
// PATCH  /api/forms/:id          → modifier (admin/hr ; manager = ses formulaires, bloqué si frozenAt)
// DELETE /api/forms/:id          → supprimer (admin/hr ; manager = ses formulaires, bloqué si frozenAt)
// POST   /api/forms/:id/freeze   → geler (admin seulement)
// POST   /api/forms/:id/unfreeze → dégeler (admin seulement)
// POST   /api/forms/:id/clone    → cloner (admin/hr/manager)
// =============================================================================

const router      = require('express').Router()
const mongoose    = require('mongoose')
const { Form, Evaluation } = require('../models')
const { ADMIN_ROLES } = require('../config/constants')
const { isValidCategory } = require('../services/formCategoriesService')

// Rôles autorisés à créer/cloner un formulaire (les managers gèrent les leurs).
const FORM_AUTHOR_ROLES = [...ADMIN_ROLES, 'manager']

// Un manager ne peut modifier/supprimer que les formulaires qu'il a créés.
// admin/hr ont tous les droits. Retourne true si l'accès est refusé.
function cannotMutateForm(user, form) {
  if (ADMIN_ROLES.includes(user.role)) return false
  return String(form.createdBy) !== String(user.id)
}

// Le frontend utilise `text` pour l'intitulé d'une question ; le modèle stocke
// `label` (requis). On traduit aux deux frontières (écriture / lecture).
function questionToDb(q) {
  if (!q || typeof q !== 'object') return q
  const { text, ...rest } = q
  return { ...rest, label: rest.label ?? text ?? '' }
}
function questionToApi(q) {
  if (!q || typeof q !== 'object') return q
  return { ...q, text: q.text ?? q.label }
}
function formToApi(form) {
  if (!form || typeof form !== 'object') return form
  const out = { ...form }
  // Expose `id` (le frontend l'attend) en plus de `_id` renvoyé par .lean().
  if (out._id !== undefined && out.id === undefined) out.id = String(out._id)
  if (Array.isArray(out.questions)) out.questions = out.questions.map(questionToApi)
  return out
}

// GET /api/forms — Liste des formulaires (filtrable par campaignId, formType, search)
// ?campaignId=X → retourne uniquement les forms liés à cette campagne
router.get('/', async (req, res, next) => {
  try {
    const filter = {}

    // SÉCURITÉ (type-confusion / NoSQL) : les paramètres de filtre doivent être
    // des chaînes. On rejette tout type non-string (tableau/objet) issu de la
    // query string avant de l'injecter dans un filtre Mongo.
    if (req.query.campaignId !== undefined) {
      if (typeof req.query.campaignId !== 'string' || !mongoose.isValidObjectId(req.query.campaignId)) {
        return res.status(400).json({ error: 'campaignId invalide' })
      }
      filter.campaignId = req.query.campaignId
    }

    if (req.query.formType !== undefined) {
      if (typeof req.query.formType !== 'string' || !Form.schema.path('formType').enumValues.includes(req.query.formType)) {
        return res.status(400).json({ error: 'formType invalide' })
      }
      filter.formType = req.query.formType
    }

    if (req.query.search !== undefined) {
      if (typeof req.query.search !== 'string') {
        return res.status(400).json({ error: 'search invalide' })
      }
      filter.$text = { $search: req.query.search.slice(0, 100) }
    }

    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 50)
    const skip  = (page - 1) * limit
    const [forms, total] = await Promise.all([
      Form.find(filter).populate('createdBy', 'firstName lastName').sort({ createdAt: 1 }).skip(skip).limit(limit).lean(),
      Form.countDocuments(filter),
    ])
    res.json({ data: forms.map(formToApi), total, page, limit })
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
    res.json(formToApi(form))
  } catch (err) {
    next(err)
  }
})

// POST /api/forms — Créer un formulaire (admin/hr/manager)
router.post('/', async (req, res, next) => {
  try {
    if (!FORM_AUTHOR_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins, RH et managers' })
    }

    const { title, description, formType, category, isAnonymous, questions, campaignId, filledBy, visibleToEvaluatee } = req.body

    if (!title || !formType) {
      return res.status(400).json({ error: 'title et formType sont requis' })
    }
    if (campaignId !== undefined && campaignId !== null && campaignId !== '' && !mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({ error: 'campaignId invalide' })
    }
    if (questions !== undefined && !Array.isArray(questions)) {
      return res.status(400).json({ error: 'questions doit être un tableau' })
    }
    if (filledBy !== undefined && !['employee', 'manager', 'hr'].includes(filledBy)) {
      return res.status(400).json({ error: 'filledBy invalide (employee|manager|hr)' })
    }
    if (category !== undefined && !(await isValidCategory(category))) {
      return res.status(400).json({ error: 'category inconnue' })
    }

    const form = await Form.create({
      title,
      description:  description || '',
      formType,
      category:     category || null,
      isAnonymous:  formType === 'upward_feedback' ? true : (isAnonymous || false),
      questions:    Array.isArray(questions) ? questions.map(questionToDb) : [],
      filledBy:     filledBy || 'employee',
      visibleToEvaluatee: visibleToEvaluatee !== undefined ? !!visibleToEvaluatee : true,
      createdBy:    req.user.id,
    })

    const created = await Form.findById(form._id).populate('createdBy', 'firstName lastName').lean()
    res.status(201).json(formToApi(created))
  } catch (err) {
    // Erreurs de validation Mongoose (pre-save, required, enum)
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message })
    }
    next(err)
  }
})

// PATCH|PUT /api/forms/:id — Modifier un formulaire (admin/hr, bloqué si frozenAt)
// PUT est un alias de PATCH (le client front utilise PUT).
async function updateForm(req, res, next) {
  try {
    if (!FORM_AUTHOR_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins, RH et managers' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const form = await Form.findById(req.params.id)
    if (!form) return res.status(404).json({ error: 'Formulaire introuvable' })

    // Un manager ne peut modifier que les formulaires qu'il a créés.
    if (cannotMutateForm(req.user, form)) {
      return res.status(403).json({ error: 'Réservé au créateur du formulaire ou à la RH' })
    }

    // Bloquer la modification des questions si le form est gelé (évaluations existantes)
    if (req.body.questions !== undefined && form.frozenAt) {
      return res.status(409).json({
        error: 'Les questions sont gelées — des évaluations existent déjà sur ce formulaire',
        frozenAt: form.frozenAt,
      })
    }

    if (req.body.filledBy !== undefined && !['employee', 'manager', 'hr'].includes(req.body.filledBy)) {
      return res.status(400).json({ error: 'filledBy invalide (employee|manager|hr)' })
    }
    if (req.body.category !== undefined && !(await isValidCategory(req.body.category))) {
      return res.status(400).json({ error: 'category inconnue' })
    }

    // Champs modifiables librement (indépendants du gel des questions)
    const EDITABLE_FREE = ['title', 'description', 'filledBy', 'category']
    EDITABLE_FREE.forEach(key => {
      if (req.body[key] !== undefined) form[key] = req.body[key]
    })
    if (req.body.visibleToEvaluatee !== undefined) {
      form.visibleToEvaluatee = !!req.body.visibleToEvaluatee
    }

    // Questions : modifiables seulement si pas gelées
    if (req.body.questions !== undefined && !form.frozenAt) {
      form.questions = req.body.questions.map(questionToDb)
    }

    await form.save()
    res.json({ id: form._id })
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message })
    }
    next(err)
  }
}
router.patch('/:id', updateForm)
router.put('/:id', updateForm)

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

    // Garde-fou : dégeler un formulaire déjà répondu permettrait de modifier ses
    // questions et d'orpheliner les answers[].questionId déjà saisies. On interdit
    // donc le dégel si au moins une évaluation a été démarrée (statut ≠ 'assigned').
    // Pour faire évoluer un formulaire en cours d'usage, cloner (POST /:id/clone).
    const startedCount = await Evaluation.countDocuments({
      formId: form._id,
      status: { $ne: 'assigned' },
    })
    if (startedCount > 0) {
      return res.status(409).json({
        error: `Dégel impossible : ${startedCount} évaluation(s) déjà démarrée(s) référencent ce formulaire. Clonez-le pour créer une nouvelle version.`,
      })
    }

    form.isFrozen = false
    form.frozenAt = null
    await form.save()

    const updated = await Form.findById(form._id).populate('createdBy', 'firstName lastName').lean()
    res.json({ success: true, form: updated })
  } catch (err) {
    next(err)
  }
})

// POST /api/forms/:id/clone — Cloner un formulaire (admin/hr/manager)
router.post('/:id/clone', async (req, res, next) => {
  try {
    if (!FORM_AUTHOR_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins, RH et managers' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const original = await Form.findById(req.params.id).lean()
    if (!original) return res.status(404).json({ error: 'Formulaire introuvable' })

    // eslint-disable-next-line no-unused-vars
    const { _id, createdAt, updatedAt, frozenAt, isFrozen, questions, ...rest } = original

    // Lignée : chaque question du clone reçoit un nouvel id et garde une
    // référence (parentQuestionId) vers la question d'origine. C'est ce qui
    // permet à l'« édition précédente » de retrouver la réponse de la campagne
    // source même après évolution du questionnaire d'une édition à l'autre.
    const clonedQuestions = (questions ?? []).map(q => ({
      ...q,
      id:               new mongoose.Types.ObjectId().toString(),
      parentQuestionId: q.id,
    }))

    const clone = await Form.create({
      ...rest,
      questions: clonedQuestions,
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

// DELETE /api/forms/:id — Supprimer un formulaire non gelé (admin/hr ; manager = ses formulaires)
router.delete('/:id', async (req, res, next) => {
  try {
    if (!FORM_AUTHOR_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins, RH et managers' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const form = await Form.findById(req.params.id)
    if (!form) return res.status(404).json({ error: 'Formulaire introuvable' })

    // Un manager ne peut supprimer que les formulaires qu'il a créés.
    if (cannotMutateForm(req.user, form)) {
      return res.status(403).json({ error: 'Réservé au créateur du formulaire ou à la RH' })
    }

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
