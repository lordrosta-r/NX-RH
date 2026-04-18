'use strict'

// =============================================================================
// /api/evaluations — Évaluations (formulaires remplis)
//
// GET    /api/evaluations          → liste (scopée par rôle + managerVisibility)
// GET    /api/evaluations/:id      → détail (avec anonymisation si needed)
// POST   /api/evaluations          → créer (admin/hr)
// POST   /api/evaluations/bulk     → créer en masse (admin/hr)
// PATCH  /api/evaluations/:id      → sauvegarder réponses / changer statut
// =============================================================================

const router     = require('express').Router()
const mongoose   = require('mongoose')
const { Evaluation, Form, Campaign, User, VALID_TRANSITIONS, ROLE_TRANSITIONS, LOCKED_STATUSES } = require('../models')
const { getVisibleUserIds } = require('../services/managerVisibility')
const { ADMIN_ROLES }       = require('../config/constants')
const { EVALUATION_STATUSES } = require('../config/constants')
const { notify, notifyMany }  = require('../services/notificationService')
const PDFDocument = require('pdfkit')

// Enlève evaluatorId/evaluatorName si le form est anonyme
function sanitizeAnonymity(doc) {
  if (doc.formId?.isAnonymous || doc.isAnonymous) {
    return { ...doc, evaluatorId: null, evaluatorName: 'Anonyme' }
  }
  return doc
}

// ─── GET /api/evaluations ────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const filter = {}

    if (req.query.campaignId) {
      if (!mongoose.isValidObjectId(req.query.campaignId)) {
        return res.status(400).json({ error: 'campaignId invalide' })
      }
      filter.campaignId = req.query.campaignId
    }

    // Filtre status : whitelist stricte pour éviter l'injection NoSQL
    if (req.query.status !== undefined) {
      if (typeof req.query.status !== 'string' || !EVALUATION_STATUSES.includes(req.query.status)) {
        return res.status(400).json({ error: 'status invalide' })
      }
      filter.status = req.query.status
    }

    const role = req.user.role
    const uid  = new mongoose.Types.ObjectId(req.user.id)

    if (role === 'employee') {
      // Un employé voit uniquement ses propres évaluations
      filter.$or = [{ evaluatorId: uid }, { evaluateeId: uid }]
    } else if (role === 'manager' || role === 'director') {
      // Manager : ses évaluations + celles de ses subordonnés visibles
      // On a besoin de la campagne pour calculer extendedVisibility
      let visibleIds = []
      if (req.query.campaignId) {
        const campaign = await Campaign.findById(req.query.campaignId).lean()
        if (campaign) {
          visibleIds = await getVisibleUserIds(req.user.id, campaign)
        }
      } else {
        // Sans campagne : subordonnés directs seulement
        const directs = await User.find({ managerId: uid, isActive: true }, '_id').lean()
        visibleIds = directs.map(u => u._id)
      }
      filter.$or = [
        { evaluatorId: uid },
        { evaluateeId: { $in: [uid, ...visibleIds] } },
      ]
    }
    // admin/hr : pas de filtre → voit tout

    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 50)
    const skip  = (page - 1) * limit

    if (req.query.page) {
      const [items, total] = await Promise.all([
        Evaluation.find(filter)
          .populate('formId', 'title formType isAnonymous')
          .populate('evaluatorId', 'firstName lastName')
          .populate('evaluateeId', 'firstName lastName department')
          .populate('campaignId', 'name status')
          .sort({ createdAt: -1 })
          .skip(skip).limit(limit).lean(),
        Evaluation.countDocuments(filter),
      ])
      return res.json({ data: items.map(sanitizeAnonymity), total, page, limit })
    }

    // Legacy : retourne array, limité à 200
    const evals = await Evaluation.find(filter)
      .populate('formId', 'title formType isAnonymous')
      .populate('evaluatorId', 'firstName lastName')
      .populate('evaluateeId', 'firstName lastName department')
      .populate('campaignId', 'name status')
      .sort({ createdAt: -1 })
      .limit(200).lean()

    res.json(evals.map(sanitizeAnonymity))
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/evaluations/:id ────────────────────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const evaluation = await Evaluation.findById(req.params.id)
      .populate('formId', 'title formType isAnonymous questions')
      .populate('evaluatorId', 'firstName lastName')
      .populate('evaluateeId', 'firstName lastName department position')
      .populate('campaignId', 'name status extendedVisibility')
      .lean()

    if (!evaluation) return res.status(404).json({ error: 'Évaluation introuvable' })

    const uid  = req.user.id.toString()
    const role = req.user.role

    // Contrôle d'accès : employé ne voit que ses propres évaluations
    if (role === 'employee') {
      const isOwn = evaluation.evaluatorId?._id?.toString() === uid
                 || evaluation.evaluateeId?._id?.toString() === uid
      if (!isOwn) return res.status(403).json({ error: 'Accès refusé' })
    }

    // Contrôle d'accès : manager ne voit que les évaluations dans son périmètre
    if (role === 'manager') {
      const visibleIds = await getVisibleUserIds(req.user.id, evaluation.campaignId)
      const evaluateeId = evaluation.evaluateeId?._id?.toString() ?? evaluation.evaluateeId?.toString()
      const evaluatorId = evaluation.evaluatorId?._id?.toString() ?? evaluation.evaluatorId?.toString()
      if (
        !visibleIds.includes(evaluateeId) &&
        !visibleIds.includes(evaluatorId) &&
        uid !== evaluateeId &&
        uid !== evaluatorId
      ) {
        return res.status(403).json({ error: 'Accès refusé' })
      }
    }

    // Contrôle d'accès : director ne voit que les évaluations dans son périmètre
    if (role === 'director') {
      const visibleIds = await getVisibleUserIds(req.user.id)
      const evaluateeId = evaluation.evaluateeId?._id?.toString() ?? evaluation.evaluateeId?.toString()
      const evaluatorId = evaluation.evaluatorId?._id?.toString() ?? evaluation.evaluatorId?.toString()
      if (
        !visibleIds.includes(evaluateeId) &&
        !visibleIds.includes(evaluatorId) &&
        uid !== evaluateeId &&
        uid !== evaluatorId
      ) {
        return res.status(403).json({ error: 'Accès refusé' })
      }
    }

    res.json(sanitizeAnonymity(evaluation))
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/evaluations ───────────────────────────────────────────────────

router.post('/', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }

    const { campaignId, formId, evaluatorId, evaluateeId } = req.body

    if (!campaignId || !formId || !evaluatorId || !evaluateeId) {
      return res.status(400).json({ error: 'campaignId, formId, evaluatorId et evaluateeId sont requis' })
    }

    const ids = { campaignId, formId, evaluatorId, evaluateeId }
    for (const [key, val] of Object.entries(ids)) {
      if (val && !mongoose.isValidObjectId(val)) {
        return res.status(400).json({ error: `${key} invalide` })
      }
    }

    // Geler le form si ce n'est pas encore fait
    await Form.findByIdAndUpdate(formId, { $set: { frozenAt: new Date() } }, { timestamps: false })
      .where({ frozenAt: null })

    const evaluation = await Evaluation.create({ campaignId, formId, evaluatorId, evaluateeId })
    res.status(201).json({ id: evaluation._id })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Cette évaluation existe déjà' })
    }
    next(err)
  }
})

// ─── POST /api/evaluations/bulk ──────────────────────────────────────────────

router.post('/bulk', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }

    const { evaluations } = req.body
    if (!Array.isArray(evaluations) || evaluations.length === 0) {
      return res.status(400).json({ error: 'evaluations doit être un tableau non vide' })
    }

    const MAX_BULK = 500
    if (evaluations.length > MAX_BULK) {
      return res.status(400).json({ error: `Maximum ${MAX_BULK} évaluations par batch` })
    }

    // Valide la structure et les ObjectIds avant insertMany
    for (const e of evaluations) {
      const required = ['campaignId', 'formId', 'evaluatorId', 'evaluateeId']
      for (const field of required) {
        if (!e[field]) return res.status(400).json({ error: `Champ requis manquant: ${field}` })
        if (!mongoose.isValidObjectId(e[field])) return res.status(400).json({ error: `${field} invalide` })
      }
    }

    // Geler tous les forms concernés
    const formIds = [...new Set(
      evaluations
        .map(e => e.formId)
        .filter(id => id && mongoose.isValidObjectId(id))
    )]
    await Form.updateMany(
      { _id: { $in: formIds }, frozenAt: null },
      { $set: { frozenAt: new Date() } }
    )

    // insertMany avec ordered:false pour continuer malgré les doublons
    const sanitized = evaluations.map(e => ({
      ...e,
      status: 'assigned',
      lastSavedAt: null,
    }))
    const result = await Evaluation.insertMany(sanitized, { ordered: false })

    // ── Fire-and-forget: notify assigned evaluatees ──────────────────────────
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
    // Certains doublons peuvent être ignorés
    if (err.writeErrors) {
      return res.status(207).json({
        created:  err.insertedDocs?.length || 0,
        skipped:  err.writeErrors.length,
        message:  'Certaines évaluations existaient déjà et ont été ignorées',
      })
    }
    next(err)
  }
})

// ─── PATCH /api/evaluations/:id ──────────────────────────────────────────────

router.patch('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const evaluation = await Evaluation.findById(req.params.id)
    if (!evaluation) return res.status(404).json({ error: 'Évaluation introuvable' })

    const uid  = req.user.id.toString()
    const role = req.user.role

    // Contrôle d'accès pour les employés
    if (role === 'employee') {
      if (evaluation.evaluatorId.toString() !== uid) {
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
      // Vérifier que le manager est bien responsable de l'évalué (pas nécessaire pour admin/hr)
      if (['manager', 'director'].includes(role)) {
        const evaluatee = await User.findById(evaluation.evaluateeId, 'managerId').lean()
        if (!evaluatee || evaluatee.managerId?.toString() !== uid) {
          return res.status(403).json({ error: 'Vous n\'êtes pas le manager de cet évalué' })
        }
      }
      evaluation.score = req.body.score
    }

    // Commentaire du reviewer (manager/director/admin/hr)
    if (req.body.reviewerComment !== undefined) {
      if (!['manager', 'director', 'admin', 'hr'].includes(role)) {
        return res.status(403).json({ error: 'Seuls les managers et admins peuvent ajouter un commentaire reviewer' })
      }
      if (typeof req.body.reviewerComment !== 'string' || req.body.reviewerComment.length > 5000) {
        return res.status(400).json({ error: 'reviewerComment invalide (max 5000 chars)' })
      }
      evaluation.reviewerComment = req.body.reviewerComment
    }

    // Commentaire de l'évalué (employee ou admin)
    if (req.body.evaluateeComment !== undefined) {
      const isEvaluatee = evaluation.evaluateeId.toString() === uid
      if (!isEvaluatee && !['admin', 'hr'].includes(role)) {
        return res.status(403).json({ error: 'Seul l\'évalué ou un admin peut ajouter un commentaire evaluatee' })
      }
      if (typeof req.body.evaluateeComment !== 'string' || req.body.evaluateeComment.length > 5000) {
        return res.status(400).json({ error: 'evaluateeComment invalide (max 5000 chars)' })
      }
      evaluation.evaluateeComment = req.body.evaluateeComment
    }

    // Transition de statut
    if (req.body.status !== undefined) {
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

    // ── Fire-and-forget notifications on status change ───────────────────────
    if (req.body.status) {
      const newStatus = req.body.status
      ;(async () => {
        try {
          const campaign = evaluation.campaignId
            ? await Campaign.findById(evaluation.campaignId, 'name').lean()
            : null
          const cName = campaign?.name || ''

          if (newStatus === 'submitted') {
            // Notify manager that evaluatee submitted
            const evaluatee = await User.findById(evaluation.evaluateeId, 'managerId firstName').lean()
            if (evaluatee?.managerId) {
              const manager = await User.findById(evaluatee.managerId).lean()
              if (manager) await notify('evaluationSubmitted', manager, { evaluatorName: evaluatee.firstName, campaignName: cName })
            }
          } else if (newStatus === 'reviewed') {
            // Notify evaluatee that their evaluation was reviewed
            const evaluatee = await User.findById(evaluation.evaluateeId).lean()
            if (evaluatee) await notify('managerActionRequired', evaluatee, { campaignName: cName })
          } else if (newStatus === 'signed_evaluatee') {
            // Notify manager that evaluatee signed
            const evaluatee = await User.findById(evaluation.evaluateeId, 'managerId firstName').lean()
            if (evaluatee?.managerId) {
              const manager = await User.findById(evaluatee.managerId).lean()
              if (manager) await notify('evaluationSubmitted', manager, { evaluatorName: evaluatee.firstName, campaignName: cName })
            }
          } else if (newStatus === 'signed_manager') {
            // Notify HR users that manager co-signed
            const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] }, isActive: true }).lean()
            if (hrUsers.length) await notifyMany('evaluationSubmitted', hrUsers, { evaluatorName: 'Manager', campaignName: cName })
          } else if (newStatus === 'signed_hr') {
            // Notify evaluatee + manager that cycle is complete
            const evaluatee = await User.findById(evaluation.evaluateeId).lean()
            if (evaluatee) await notify('managerActionRequired', evaluatee, { campaignName: cName })
            if (evaluatee?.managerId) {
              const manager = await User.findById(evaluatee.managerId).lean()
              if (manager) await notify('evaluationSubmitted', manager, { evaluatorName: evaluatee.firstName, campaignName: cName })
            }
          }
        } catch (_) { /* notification failure must never block */ }
      })()
    }

    res.json({
      id:               evaluation._id,
      status:           evaluation.status,
      lastSavedAt:      evaluation.lastSavedAt,
      reviewerComment:  evaluation.reviewerComment,
      evaluateeComment: evaluation.evaluateeComment,
    })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/evaluations/:id/pdf — Export evaluation as PDF ─────────────────

router.get('/:id/pdf', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const evaluation = await Evaluation.findById(req.params.id)
      .populate('formId', 'title formType sections')
      .populate('evaluatorId', 'firstName lastName')
      .populate('evaluateeId', 'firstName lastName department')
      .populate('campaignId', 'name')
      .lean()

    if (!evaluation) return res.status(404).json({ error: 'Évaluation introuvable' })

    // Access check: admin/hr can export any, others can only export their own
    const uid = req.user.id
    if (!ADMIN_ROLES.includes(req.user.role)) {
      const isOwn = [
        String(evaluation.evaluatorId?._id || evaluation.evaluatorId),
        String(evaluation.evaluateeId?._id || evaluation.evaluateeId),
      ].includes(uid)
      if (!isOwn) return res.status(403).json({ error: 'Accès interdit' })
    }

    // Build PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="evaluation-${req.params.id}.pdf"`,
    )
    doc.pipe(res)

    // Title
    doc.fontSize(20).font('Helvetica-Bold')
       .text('NanoXplore RH — Évaluation', { align: 'center' })
    doc.moveDown()

    // Meta
    doc.fontSize(12).font('Helvetica')
    if (evaluation.campaignId?.name) {
      doc.text(`Campagne : ${evaluation.campaignId.name}`)
    }
    if (evaluation.formId?.title) {
      doc.text(`Formulaire : ${evaluation.formId.title}`)
    }
    const evaluatee = evaluation.evaluateeId
    if (evaluatee?.firstName) {
      doc.text(`Évalué : ${evaluatee.firstName} ${evaluatee.lastName}${evaluatee.department ? ` (${evaluatee.department})` : ''}`)
    }
    const evaluator = evaluation.evaluatorId
    if (evaluator?.firstName) {
      doc.text(`Évaluateur : ${evaluator.firstName} ${evaluator.lastName}`)
    }
    doc.text(`Statut : ${evaluation.status}`)
    doc.moveDown()

    // Answers
    const answers = evaluation.answers || []
    if (answers.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Réponses')
      doc.moveDown(0.5)
      doc.fontSize(11).font('Helvetica')
      answers.forEach((a, i) => {
        const label = a.questionLabel || a.questionId || `Question ${i + 1}`
        const value = a.value != null ? String(a.value) : '—'
        doc.font('Helvetica-Bold').text(`${i + 1}. ${label}`, { continued: false })
        doc.font('Helvetica').text(`   ${value}`)
        doc.moveDown(0.3)
      })
    }

    // Comments
    if (evaluation.reviewerComment) {
      doc.moveDown()
      doc.fontSize(12).font('Helvetica-Bold').text('Commentaire du manager')
      doc.font('Helvetica').text(evaluation.reviewerComment)
    }
    if (evaluation.evaluateeComment) {
      doc.moveDown()
      doc.fontSize(12).font('Helvetica-Bold').text('Commentaire de l\'évalué')
      doc.font('Helvetica').text(evaluation.evaluateeComment)
    }

    doc.end()
  } catch (err) {
    next(err)
  }
})

module.exports = router
