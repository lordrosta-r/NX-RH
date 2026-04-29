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
const { Evaluation, Form, Campaign, User, AuditLog, VALID_TRANSITIONS, ROLE_TRANSITIONS, LOCKED_STATUSES } = require('../models')
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

// ─── GET /api/evaluations/history ────────────────────────────────────────────
// Liste les évaluations passées (toutes campagnes, statut terminal/avancé) où
// l'utilisateur courant est évalué OU évaluateur. Utilisé par la timeline
// "Historique des entretiens" sur la page employée.
router.get('/history', async (req, res, next) => {
  try {
    const uid = new mongoose.Types.ObjectId(req.user.id)
    const COMPLETED = ['submitted', 'reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated']

    const filter = {
      $or:    [{ evaluateeId: uid }, { evaluatorId: uid }],
      status: { $in: COMPLETED },
    }

    const items = await Evaluation.find(filter)
      .populate('formId', 'title formType isAnonymous')
      .populate('evaluatorId', 'firstName lastName')
      .populate('evaluateeId', 'firstName lastName department')
      .populate('campaignId', 'name startDate endDate status')
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean()

    res.json({ data: items.map(sanitizeAnonymity) })
  } catch (err) {
    next(err)
  }
})

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

// ─── GET /api/evaluations/export ─────────────────────────────────────────────
// Export CSV des évaluations (admin/hr uniquement)
// Query params : campaignId (optionnel), status (optionnel), dept (optionnel)

router.get('/export', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }

    const filter = {}

    if (req.query.campaignId) {
      if (!mongoose.isValidObjectId(req.query.campaignId)) {
        return res.status(400).json({ error: 'campaignId invalide' })
      }
      filter.campaignId = req.query.campaignId
    }

    if (req.query.status) {
      if (!EVALUATION_STATUSES.includes(req.query.status)) {
        return res.status(400).json({ error: 'status invalide' })
      }
      filter.status = req.query.status
    }

    const evals = await Evaluation.find(filter)
      .populate('evaluateeId', 'firstName lastName department')
      .populate('evaluatorId', 'firstName lastName')
      .populate('campaignId', 'name')
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean()

    function csvEscape(val) {
      const str = (val === null || val === undefined) ? '' : String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"'
      }
      return str
    }

    const deptFilter = req.query.dept && typeof req.query.dept === 'string' ? req.query.dept : null
    const rows = [['Évalué', 'Manager', 'Campagne', 'Statut', 'Score', 'Département', 'Date']]

    for (const ev of evals) {
      const evaluateeDept = ev.evaluateeId?.department || ''
      if (deptFilter && evaluateeDept !== deptFilter) continue
      const evaluateeName = ev.evaluateeId
        ? `${ev.evaluateeId.firstName || ''} ${ev.evaluateeId.lastName || ''}`.trim()
        : ''
      const evaluatorName = ev.evaluatorId
        ? `${ev.evaluatorId.firstName || ''} ${ev.evaluatorId.lastName || ''}`.trim()
        : ''
      const campaignName = ev.campaignId?.name || ''
      const date = ev.createdAt ? new Date(ev.createdAt).toISOString().slice(0, 10) : ''
      rows.push([
        evaluateeName,
        evaluatorName,
        campaignName,
        ev.status || '',
        ev.score !== null && ev.score !== undefined ? ev.score : '',
        evaluateeDept,
        date,
      ])
    }

    const csv = rows.map(r => r.map(csvEscape).join(',')).join('\r\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="evaluations.csv"')
    res.send('\uFEFF' + csv)
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

    // expiresAt = campaign.endDate + 30 jours
    const campaign = await Campaign.findById(campaignId, 'endDate').lean()
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

    // expiresAt = campaign.endDate + 30 jours — récupère les campagnes uniques
    const uniqueCampaignIds = [...new Set(sanitized.map(e => e.campaignId?.toString()).filter(Boolean))]
    const campaigns = await Campaign.find({ _id: { $in: uniqueCampaignIds } }, 'endDate').lean()
    const campaignEndDates = new Map(campaigns.map(c => [c._id.toString(), c.endDate]))
    const sanitizedWithExpiry = sanitized.map(e => {
      const endDate = campaignEndDates.get(e.campaignId?.toString())
      return {
        ...e,
        expiresAt: endDate
          ? new Date(new Date(endDate).getTime() + 30 * 24 * 60 * 60 * 1000)
          : null,
      }
    })

    const result = await Evaluation.insertMany(sanitizedWithExpiry, { ordered: false })

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

// ─── PATCH /api/evaluations/bulk ─────────────────────────────────────────────
// Actions en masse sur des évaluations existantes.
// Doit être défini AVANT /:id pour éviter le conflit de routing.
//
// Body: { ids: string[], action: 'archive'|'sign_hr'|'assign_reviewer', reviewerId?: string }
// Renvoie: { success: N, skipped: M, errors: [{id, reason}] }

router.patch('/bulk', async (req, res, next) => {
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

    if (action === 'assign_reviewer') {
      if (!reviewerId || !mongoose.isValidObjectId(reviewerId)) {
        return res.status(400).json({ error: 'reviewerId valide requis pour assign_reviewer' })
      }
    }

    const evaluations = await Evaluation.find({ _id: { $in: ids } })
    const role = req.user.role
    let success = 0
    let skipped = 0
    const errors = []

    for (const ev of evaluations) {
      try {
        if (action === 'sign_hr') {
          const HR_CAN_SIGN = ['reviewed', 'signed_evaluatee', 'signed_manager']
          if (!HR_CAN_SIGN.includes(ev.status)) {
            skipped++
            continue
          }
          ev.status = 'signed_hr'
          ev.signedByHrAt = new Date()
          await ev.save()
          success++

        } else if (action === 'archive') {
          // Admin uses full VALID_TRANSITIONS, HR uses their limited ROLE_TRANSITIONS
          const roleTransitions = role === 'admin' ? VALID_TRANSITIONS : (ROLE_TRANSITIONS[role] || {})
          const allowed = roleTransitions[ev.status] || []
          if (allowed.length > 0) {
            ev.status = allowed[0]
            if (ev.status === 'signed_hr') ev.signedByHrAt = new Date()
          }
          ev.reviewerComment = 'Archivé en masse par RH'
          await ev.save()
          success++

        } else if (action === 'assign_reviewer') {
          const ASSIGNABLE = ['assigned', 'in_progress']
          if (!ASSIGNABLE.includes(ev.status)) {
            skipped++
            continue
          }
          ev.evaluatorId = reviewerId
          await ev.save()
          success++
        }
      } catch (err) {
        errors.push({ id: ev._id.toString(), reason: err.message })
      }
    }

    // IDs non trouvés en base comptent comme skipped
    const foundIds = new Set(evaluations.map(e => e._id.toString()))
    for (const id of ids) {
      if (!foundIds.has(id)) skipped++
    }

    res.json({ success, skipped, errors })

    // Fire-and-forget audit log (après la réponse)
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
})

// ─── PATCH /api/evaluations/:id/reassign ─────────────────────────────────────
// Réaffecte l'évaluateur d'une évaluation en cours.
// Rôles requis : admin ou hr.
// Body : { newEvaluatorId: string, reason?: string }
// Statuts bloquants (terminaux) : signed_hr, validated.
// L'ancien évaluatorId et la raison sont tracés dans evaluation.auditLog.

router.patch('/:id/reassign', async (req, res, next) => {
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
})

// ─── PATCH /api/evaluations/:id ──────────────────────────────────────────────

router.patch('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const evaluation = await Evaluation.findById(req.params.id)
    if (!evaluation) return res.status(404).json({ error: 'Évaluation introuvable' })

    const originalStatus = evaluation.status

    const uid  = req.user.id.toString()
    const role = req.user.role

    // Contrôle d'accès pour les employés.
    // Un employé peut modifier UNE évaluation s'il en est l'évaluateur (auto-éval)
    // OU l'évalué (commentaire + signature après review du manager).
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
      // Managers/directors peuvent uniquement changer le statut des évaluations
      // dont ils sont l'évaluateur assigné (pas d'accès cross-équipe).
      if (['manager', 'director'].includes(role)) {
        if (evaluation.evaluatorId.toString() !== uid) {
          return res.status(403).json({ error: 'Accès refusé : vous n\'êtes pas l\'évaluateur de cette évaluation' })
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

    // Fire-and-forget audit log
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

// ─── POST /api/evaluations/:id/expire — Expiration manuelle ──────────────────
// Passe le statut à 'expired'. Rôles requis : admin ou hr.
// Endpoint de test — le scheduler le fait automatiquement chaque heure.

router.post('/:id/expire', async (req, res, next) => {
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
    evaluation.status    = 'expired'
    evaluation.nearExpiry = false
    await evaluation.save()
    res.json({ id: evaluation._id, status: evaluation.status })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/evaluations/:id/pdf — Export PDF d'une évaluation ──────────────

// Formate une valeur de réponse en fonction du type de question
function formatAnswer(value, question) {
  if (value === null || value === undefined) return '—'
  if (question.type === 'rating') {
    const scale = question.scale || 5
    return `${value}/${scale}`
  }
  if (question.type === 'yes_no') {
    return (value === true || value === 'true' || value === 1) ? 'Oui' : 'Non'
  }
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

router.get('/:id/pdf', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const evaluation = await Evaluation.findById(req.params.id)
      .populate('formId', 'title formType questions isAnonymous')
      .populate('evaluatorId', 'firstName lastName')
      .populate('evaluateeId', 'firstName lastName department')
      .populate('campaignId', 'name endDate')
      .lean()

    if (!evaluation) return res.status(404).json({ error: 'Évaluation introuvable' })

    const uid = req.user.id
    if (!ADMIN_ROLES.includes(req.user.role)) {
      const isOwn = [
        String(evaluation.evaluatorId?._id || evaluation.evaluatorId),
        String(evaluation.evaluateeId?._id || evaluation.evaluateeId),
      ].includes(uid)
      if (!isOwn) return res.status(403).json({ error: 'Accès interdit' })
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="evaluation-${req.params.id}.pdf"`)
    doc.pipe(res)

    const PRIMARY   = '#b8000b'
    const SECONDARY = '#5b00df'
    const DARK      = '#1a1a1a'
    const MUTED     = '#666666'

    const evaluatee = evaluation.evaluateeId
    const evaluator = evaluation.evaluatorId
    const campaign  = evaluation.campaignId
    const form      = evaluation.formId

    // ── En-tête ──────────────────────────────────────────────────────────────
    doc.fillColor(PRIMARY).fontSize(22).font('Helvetica-Bold')
       .text('NanoXplore RH', { align: 'center' })
    doc.fillColor(DARK).fontSize(14).font('Helvetica')
       .text('Compte rendu d\'entretien', { align: 'center' })
    doc.moveDown(0.5)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dddddd').stroke()
    doc.moveDown()

    // ── Informations ─────────────────────────────────────────────────────────
    doc.fillColor(SECONDARY).fontSize(13).font('Helvetica-Bold').text('Informations')
    doc.moveDown(0.4)
    doc.fillColor(DARK).fontSize(11).font('Helvetica')
    if (evaluatee?.firstName) {
      doc.text(`Employé : ${evaluatee.firstName} ${evaluatee.lastName}${evaluatee.department ? ` — ${evaluatee.department}` : ''}`)
    }
    if (evaluator?.firstName) {
      doc.text(`Manager : ${evaluator.firstName} ${evaluator.lastName}`)
    }
    if (campaign?.name)    doc.text(`Campagne : ${campaign.name}`)
    if (campaign?.endDate) doc.text(`Date de clôture : ${new Date(campaign.endDate).toLocaleDateString('fr-FR')}`)
    if (form?.title)       doc.text(`Formulaire : ${form.title}`)
    doc.text(`Statut : ${evaluation.status}`)
    doc.moveDown()

    // ── Sections par phase ───────────────────────────────────────────────────
    const questions = form?.questions || []
    const answers   = evaluation.answers || []
    const answerMap = new Map(answers.map(a => [a.questionId, a.value]))

    const PHASES = [
      { key: 'self',        label: 'Auto-évaluation' },
      { key: 'n-1',         label: 'Évaluation N-1' },
      { key: 'objectives',  label: 'Objectifs' },
      { key: 'aspirations', label: 'Aspirations' },
    ]

    // Questions sans phase spécifique ('all') — section générale
    const generalQuestions = questions.filter(q => q.phase === 'all')
    if (generalQuestions.length > 0) {
      doc.fillColor(SECONDARY).fontSize(13).font('Helvetica-Bold').text('Questions générales')
      doc.moveDown(0.4)
      for (const q of generalQuestions) {
        const displayVal = formatAnswer(answerMap.get(q.id), q)
        doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold').text(q.label)
        doc.fillColor(MUTED).font('Helvetica').text(`  → ${displayVal}`)
        doc.moveDown(0.25)
      }
      doc.moveDown(0.5)
    }

    // Sections par phase
    for (const phase of PHASES) {
      const phaseQuestions = questions.filter(q => q.phase === phase.key)
      if (phaseQuestions.length === 0) continue
      doc.fillColor(SECONDARY).fontSize(13).font('Helvetica-Bold').text(phase.label)
      doc.moveDown(0.4)
      for (const q of phaseQuestions) {
        const displayVal = formatAnswer(answerMap.get(q.id), q)
        doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold').text(q.label)
        doc.fillColor(MUTED).font('Helvetica').text(`  → ${displayVal}`)
        doc.moveDown(0.25)
      }
      doc.moveDown(0.5)
    }

    if (questions.length === 0) {
      doc.fillColor(MUTED).fontSize(11).font('Helvetica')
         .text('(Formulaire non disponible ou aucune question définie)')
      doc.moveDown()
    }

    // ── Commentaires ─────────────────────────────────────────────────────────
    if (evaluation.reviewerComment) {
      doc.fillColor(SECONDARY).fontSize(12).font('Helvetica-Bold').text('Commentaire du manager')
      doc.fillColor(DARK).font('Helvetica').text(evaluation.reviewerComment)
      doc.moveDown()
    }
    if (evaluation.evaluateeComment) {
      doc.fillColor(SECONDARY).fontSize(12).font('Helvetica-Bold').text('Commentaire de l\'évalué')
      doc.fillColor(DARK).font('Helvetica').text(evaluation.evaluateeComment)
      doc.moveDown()
    }

    // ── Signatures ───────────────────────────────────────────────────────────
    doc.fillColor(SECONDARY).fontSize(12).font('Helvetica-Bold').text('Signatures')
    doc.moveDown(0.4)
    doc.fontSize(10)
    if (evaluation.signedByEvaluateeAt) {
      const name = evaluatee?.firstName ? `${evaluatee.firstName} ${evaluatee.lastName}` : 'Évalué'
      doc.fillColor('#1a7a1a').font('Helvetica-Bold')
         .text(`✓ ${name} (évalué) — ${new Date(evaluation.signedByEvaluateeAt).toLocaleString('fr-FR')}`)
    } else {
      doc.fillColor(MUTED).font('Helvetica').text('○ Évalué — pas encore signé')
    }
    if (evaluation.signedByManagerAt) {
      const name = evaluator?.firstName ? `${evaluator.firstName} ${evaluator.lastName}` : 'Manager'
      doc.fillColor('#1a7a1a').font('Helvetica-Bold')
         .text(`✓ ${name} (manager) — ${new Date(evaluation.signedByManagerAt).toLocaleString('fr-FR')}`)
    } else {
      doc.fillColor(MUTED).font('Helvetica').text('○ Manager — pas encore signé')
    }
    if (evaluation.signedByHrAt) {
      doc.fillColor('#1a7a1a').font('Helvetica-Bold')
         .text(`✓ RH — ${new Date(evaluation.signedByHrAt).toLocaleString('fr-FR')}`)
    } else {
      doc.fillColor(MUTED).font('Helvetica').text('○ RH — pas encore signé')
    }
    doc.moveDown(2)

    // ── Pied de page ─────────────────────────────────────────────────────────
    doc.fillColor(MUTED).fontSize(9).font('Helvetica')
       .text(
         `Généré le ${new Date().toLocaleString('fr-FR')} — Document confidentiel`,
         { align: 'center' }
       )

    doc.end()
  } catch (err) {
    next(err)
  }
})

module.exports = router
