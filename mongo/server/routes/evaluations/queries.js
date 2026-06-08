'use strict'

// =============================================================================
// routes/evaluations/queries.js — Lecture des évaluations
//
// GET /history    → historique personnel (statuts avancés, max 200)
// GET /           → liste paginée (scopée par rôle + managerVisibility)
// GET /export     → export CSV (admin/hr uniquement)
// GET /:id        → détail d'une évaluation (avec RBAC + anonymisation)
// =============================================================================

const mongoose  = require('mongoose')
const { Evaluation, Campaign, User } = require('../../models')
const { getVisibleUserIds }    = require('../../services/managerVisibility')
const { ADMIN_ROLES }          = require('../../config/constants')
const { EVALUATION_STATUSES }  = require('../../config/constants')
const { COMPLETED_STATUSES, sanitizeAnonymity } = require('./helpers')
const { paginate } = require('../../utils/paginate')

// GET /history — Historique des entretiens (évaluations terminées, limité à 200)
async function handleHistory(req, res, next) {
  try {
    const uid = new mongoose.Types.ObjectId(req.user.id)

    const items = await Evaluation.find({
      $or:    [{ evaluateeId: uid }, { evaluatorId: uid }],
      status: { $in: COMPLETED_STATUSES },
    })
      .populate('formId', 'title formType isAnonymous')
      .populate('evaluatorId', 'firstName lastName')
      .populate('evaluateeId', 'firstName lastName department')
      .populate('campaignId', 'name startDate endDate status')
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean()

    res.json(items.map(sanitizeAnonymity))
  } catch (err) {
    next(err)
  }
}

// GET / — Liste paginée des évaluations (scope par rôle)
async function handleList(req, res, next) {
  try {
    const filter = {}

    if (req.query.campaignId) {
      if (!mongoose.isValidObjectId(req.query.campaignId)) {
        return res.status(400).json({ error: 'campaignId invalide' })
      }
      filter.campaignId = req.query.campaignId
    }

    if (req.query.status !== undefined) {
      // Accepte un statut unique OU une liste séparée par virgules
      // (ex: ?status=in_progress,assigned — utilisé par le dashboard employé).
      const wanted = String(req.query.status).split(',').map(s => s.trim()).filter(Boolean)
      if (!wanted.length || !wanted.every(s => EVALUATION_STATUSES.includes(s))) {
        return res.status(400).json({ error: 'status invalide' })
      }
      filter.status = wanted.length === 1 ? wanted[0] : { $in: wanted }
    }

    const role = req.user.role
    const uid  = new mongoose.Types.ObjectId(req.user.id)
    const scope = req.query.scope

    if (scope === 'mine') {
      // Espace perso « Mes évaluations » : uniquement MES propres évaluations
      // (celles dont je suis l'évalué), jamais celles que je conduis pour autrui.
      filter.evaluateeId = uid
    } else if (scope === 'my_team') {
      // Tableau de bord manager : uniquement les évaluations que JE conduis pour
      // mon équipe (j'en suis l'évaluateur), en excluant ma propre évaluation.
      filter.evaluatorId = uid
      filter.evaluateeId = { $ne: uid }
    } else if (role === 'employee') {
      filter.$or = [{ evaluatorId: uid }, { evaluateeId: uid }]
    } else if (role === 'manager') {
      let visibleIds = []
      if (req.query.campaignId) {
        const campaign = await Campaign.findById(req.query.campaignId).lean()
        if (campaign) {
          visibleIds = await getVisibleUserIds(req.user.id, campaign)
        }
      } else {
        const directs = await User.find({ managerId: uid, isActive: true }, '_id').lean()
        visibleIds = directs.map(u => u._id)
      }
      filter.$or = [
        { evaluatorId: uid },
        { evaluateeId: { $in: [uid, ...visibleIds] } },
      ]
    }
    // admin/hr : pas de filtre → voit tout

    if (req.query.evaluateeId === 'me') {
      // Alias pratique : « me » = l'utilisateur courant (espace perso).
      filter.evaluateeId = uid
    } else if (req.query.evaluateeId !== undefined) {
      if (!mongoose.isValidObjectId(req.query.evaluateeId)) {
        return res.status(400).json({ error: 'evaluateeId invalide' })
      }
      filter.evaluateeId = new mongoose.Types.ObjectId(req.query.evaluateeId)
    }

    const result = await paginate(Evaluation, filter, {
      page:  req.query.page  || 1,
      limit: req.query.limit || 50,
      sort:  { createdAt: -1 },
      populate: [
        { path: 'formId',      select: 'title formType isAnonymous' },
        { path: 'evaluatorId', select: 'firstName lastName' },
        { path: 'evaluateeId', select: 'firstName lastName department' },
        { path: 'campaignId',  select: 'name status' },
      ],
    })
    res.json({ ...result, data: result.data.map(sanitizeAnonymity) })
  } catch (err) {
    next(err)
  }
}

// GET /export — Export CSV des évaluations (admin/hr)
async function handleExport(req, res, next) {
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
      const wanted = String(req.query.status).split(',').map(s => s.trim()).filter(Boolean)
      if (!wanted.length || !wanted.every(s => EVALUATION_STATUSES.includes(s))) {
        return res.status(400).json({ error: 'status invalide' })
      }
      filter.status = wanted.length === 1 ? wanted[0] : { $in: wanted }
    }

    const evals = await Evaluation.find(filter)
      .populate('evaluateeId', 'firstName lastName department')
      .populate('evaluatorId', 'firstName lastName')
      .populate('campaignId', 'name')
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean()

    function csvEscape(value) {
      const str = String(value ?? '')
      // Neutraliser les formules Excel/Sheets (CSV injection)
      if (str.length > 0 && ['=', '+', '-', '@', '\t', '\r'].includes(str[0])) {
        return `'${str.replace(/"/g, '""')}`
      }
      // Entourer de guillemets si contient virgule, point-virgule, guillemet ou saut de ligne
      if (str.includes(',') || str.includes(';') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
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
      rows.push([
        evaluateeName,
        evaluatorName,
        ev.campaignId?.name || '',
        ev.status || '',
        ev.reviewerScore !== null && ev.reviewerScore !== undefined ? ev.reviewerScore : '',
        evaluateeDept,
        ev.createdAt ? new Date(ev.createdAt).toISOString().slice(0, 10) : '',
      ])
    }

    const csv = rows.map(r => r.map(csvEscape).join(',')).join('\r\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="evaluations.csv"')
    res.send('\uFEFF' + csv)
  } catch (err) {
    next(err)
  }
}

// GET /:id — Détail d'une évaluation (avec RBAC + anonymisation)
async function handleDetail(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const evaluation = await Evaluation.findById(req.params.id)
      .populate('formId', 'title formType isAnonymous questions visibleToEvaluatee filledBy')
      .populate('evaluatorId', 'firstName lastName')
      .populate('evaluateeId', 'firstName lastName department position')
      .populate('campaignId', 'name status extendedVisibility')
      .lean()

    if (!evaluation) return res.status(404).json({ error: 'Évaluation introuvable' })

    const uid  = req.user.id.toString()
    const role = req.user.role

    if (role === 'employee') {
      const isOwn = evaluation.evaluatorId?._id?.toString() === uid
                 || evaluation.evaluateeId?._id?.toString() === uid
      if (!isOwn) return res.status(403).json({ error: 'Accès refusé' })
    }

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

    // Visibilité par formulaire : l'évalué qui n'est PAS l'évaluateur (ex. éval
    // compétences remplie par le manager) ne voit pas un formulaire marqué
    // visibleToEvaluatee=false. Admin/HR conservent un accès total.
    const eveeId = evaluation.evaluateeId?._id?.toString() ?? evaluation.evaluateeId?.toString()
    const evorId = evaluation.evaluatorId?._id?.toString() ?? evaluation.evaluatorId?.toString()
    const isEvaluateeOnly = uid === eveeId && uid !== evorId
    if (
      isEvaluateeOnly &&
      !['admin', 'hr'].includes(role) &&
      evaluation.formId?.visibleToEvaluatee === false
    ) {
      return res.status(403).json({ error: 'Ce formulaire n\'est pas visible par l\'évalué' })
    }

    res.json(sanitizeAnonymity(evaluation))
  } catch (err) {
    next(err)
  }
}

module.exports = { handleHistory, handleList, handleExport, handleDetail }
