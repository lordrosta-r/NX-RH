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
      if (typeof req.query.status !== 'string' || !EVALUATION_STATUSES.includes(req.query.status)) {
        return res.status(400).json({ error: 'status invalide' })
      }
      filter.status = req.query.status
    }

    const role = req.user.role
    const uid  = new mongoose.Types.ObjectId(req.user.id)

    if (role === 'employee') {
      filter.$or = [{ evaluatorId: uid }, { evaluateeId: uid }]
    } else if (role === 'manager' || role === 'director') {
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

    if (req.query.evaluateeId !== undefined) {
      if (!mongoose.isValidObjectId(req.query.evaluateeId)) {
        return res.status(400).json({ error: 'evaluateeId invalide' })
      }
      filter.evaluateeId = new mongoose.Types.ObjectId(req.query.evaluateeId)
    }

    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 50)
    const skip  = (page - 1) * limit

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
    res.json({ data: items.map(sanitizeAnonymity), total, page, limit })
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
      rows.push([
        evaluateeName,
        evaluatorName,
        ev.campaignId?.name || '',
        ev.status || '',
        ev.score !== null && ev.score !== undefined ? ev.score : '',
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
      .populate('formId', 'title formType isAnonymous questions')
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

    if (role === 'manager' || role === 'director') {
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

    res.json(sanitizeAnonymity(evaluation))
  } catch (err) {
    next(err)
  }
}

module.exports = { handleHistory, handleList, handleExport, handleDetail }
