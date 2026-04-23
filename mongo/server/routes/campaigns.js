'use strict'

// =============================================================================
// /api/campaigns — Campagnes d'évaluation
//
// GET    /api/campaigns          → liste (scopée par rôle)
// GET    /api/campaigns/:id      → détail + stats
// POST   /api/campaigns          → créer (admin/hr)
// PATCH  /api/campaigns/:id      → modifier / changer statut (admin/hr)
// DELETE /api/campaigns/:id      → supprimer (admin/hr — draft/archived seulement)
// =============================================================================

const router     = require('express').Router()
const mongoose   = require('mongoose')
const { Campaign, Evaluation, Form, User, AuditLog, CAMPAIGN_TRANSITIONS: VALID_TRANSITIONS } = require('../models')
const { ADMIN_ROLES } = require('../config/constants')
const { notifyMany }  = require('../services/notificationService')

// ─── GET /api/campaigns ──────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const filter = {}

    // Filtre optionnel par statut (?status=active) — whitelist anti-injection NoSQL
    const VALID_STATUSES = ['draft', 'active', 'closed', 'archived']
    if (req.query.status && VALID_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status
    }

    // Les employés ne voient que les campagnes actives
    const ADMIN_ROLES_LOCAL = ['admin', 'hr', 'director', 'manager']
    if (!ADMIN_ROLES_LOCAL.includes(req.user.role)) {
      filter.status = 'active'
    }

    if (req.query.page) {
      const page  = Math.max(1, parseInt(req.query.page)  || 1)
      const limit = Math.min(100, parseInt(req.query.limit) || 50)
      const skip  = (page - 1) * limit
      const [campaigns, total] = await Promise.all([
        Campaign.find(filter).populate('createdBy', 'firstName lastName email').sort({ startDate: -1 }).skip(skip).limit(limit).lean(),
        Campaign.countDocuments(filter),
      ])
      return res.json({ data: campaigns, total, page, limit })
    }

    const campaigns = await Campaign.find(filter)
      .populate('createdBy', 'firstName lastName email')
      .sort({ startDate: -1 })
      .limit(100)
      .lean()

    res.json(campaigns)
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/campaigns/:id ──────────────────────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const campaign = await Campaign.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email')
      .lean()

    if (!campaign) return res.status(404).json({ error: 'Campagne introuvable' })

    // Stats de complétion
    const stats = await Evaluation.aggregate([
      { $match: { campaignId: campaign._id } },
      {
        $group: {
          _id: null,
          total:     { $sum: 1 },
          started:   { $sum: { $cond: [{ $ne: ['$status', 'assigned'] }, 1, 0] } },
          submitted: { $sum: { $cond: [{ $in: ['$status', ['submitted', 'reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated']] }, 1, 0] } },
          validated: { $sum: { $cond: [{ $eq: ['$status', 'validated'] }, 1, 0] } },
        },
      },
    ])

    res.json({ ...campaign, stats: stats[0] || { total: 0, started: 0, submitted: 0, validated: 0 } })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/campaigns ─────────────────────────────────────────────────────

router.post('/', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }

    const { name, description, startDate, endDate, targetDepartments, extendedVisibility,
      deadlineEmployee, deadlineManager } = req.body

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ error: 'name, startDate et endDate sont requis' })
    }
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ error: 'endDate doit être après startDate' })
    }

    const campaign = await Campaign.create({
      name,
      description:        description || '',
      startDate,
      endDate,
      targetDepartments:  targetDepartments || [],
      extendedVisibility: extendedVisibility || [],
      deadlineEmployee:   deadlineEmployee || null,
      deadlineManager:    deadlineManager  || null,
      createdBy:          req.user.id,
    })

    // Fire-and-forget audit log
    AuditLog.create({
      userId:     req.user.id,
      userRole:   req.user.role,
      action:     'campaign_create',
      targetType: 'Campaign',
      targetId:   campaign._id,
      meta:       { name: campaign.name },
    }).catch(() => {})

    res.status(201).json({ id: campaign._id })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/campaigns/:id ────────────────────────────────────────────────

router.patch('/:id', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const campaign = await Campaign.findById(req.params.id)
    if (!campaign) return res.status(404).json({ error: 'Campagne introuvable' })

    const originalStatus = campaign.status

    // Validation de la transition de statut
    if (req.body.status) {
      const allowed = VALID_TRANSITIONS[campaign.status] || []
      if (!allowed.includes(req.body.status)) {
        return res.status(400).json({
          error: `Transition '${campaign.status}' → '${req.body.status}' non autorisée`,
        })
      }
    }

    const EDITABLE = ['name', 'description', 'status', 'startDate', 'endDate',
      'targetDepartments', 'extendedVisibility', 'deadlineEmployee', 'deadlineManager']
    EDITABLE.forEach(key => {
      if (req.body[key] !== undefined) campaign[key] = req.body[key]
    })

    await campaign.save()

    // Fire-and-forget audit log
    AuditLog.create({
      userId:     req.user.id,
      userRole:   req.user.role,
      action:     req.body.status === 'active' ? 'campaign_activate'
                : req.body.status              ? 'campaign_update'
                :                               'campaign_update',
      targetType: 'Campaign',
      targetId:   campaign._id,
      meta: {
        from:   originalStatus,
        to:     campaign.status,
        name:   campaign.name,
        fields: Object.keys(req.body).filter(k => k !== 'status'),
      },
    }).catch(() => {})

    // ── Fire-and-forget: notify users when campaign goes active ──────────────
    if (req.body.status === 'active') {
      ;(async () => {
        try {
          const filter = { isActive: true }
          if (campaign.targetDepartments?.length) {
            filter.department = { $in: campaign.targetDepartments }
          }
          const users = await User.find(filter).lean()
          if (users.length) await notifyMany('campaignLaunch', users, { campaignName: campaign.name })
        } catch (_) { /* notification failure must never block */ }
      })()
    }

    res.json(campaign.toObject())
  } catch (err) {
    next(err)
  }
})

// ─── DELETE /api/campaigns/:id ───────────────────────────────────────────────

router.delete('/:id', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const campaign = await Campaign.findById(req.params.id)
    if (!campaign) return res.status(404).json({ error: 'Campagne introuvable' })

    if (campaign.status === 'active') {
      return res.status(400).json({ error: "Impossible de supprimer une campagne active. Clôturez-la d'abord." })
    }
    if (!['draft', 'archived'].includes(campaign.status)) {
      return res.status(400).json({ error: 'Seules les campagnes en brouillon ou archivées peuvent être supprimées.' })
    }

    await Promise.all([
      Evaluation.deleteMany({ campaignId: campaign._id }),
      Form.deleteMany({ campaignId: campaign._id }),
    ])
    await campaign.deleteOne()

    // Fire-and-forget audit log
    AuditLog.create({
      userId:     req.user.id,
      userRole:   req.user.role,
      action:     'campaign_delete',
      targetType: 'Campaign',
      targetId:   campaign._id,
      meta:       { name: campaign.name, status: campaign.status },
    }).catch(() => {})

    res.json({ deleted: true })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/campaigns/:id/clone ───────────────────────────────────────────
// Duplique une campagne (statut → draft) ainsi que tous ses formulaires
// (sans frozenAt). Les évaluations ne sont pas clonées : la nouvelle campagne
// repart vierge. Les dates sont décalées d'un an par défaut, surchargeables
// via { startDate, endDate } dans le body.
router.post('/:id/clone', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const source = await Campaign.findById(req.params.id).lean()
    if (!source) return res.status(404).json({ error: 'Campagne introuvable' })

    const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000
    const startDate = req.body.startDate
      ? new Date(req.body.startDate)
      : new Date(new Date(source.startDate).getTime() + ONE_YEAR_MS)
    const endDate = req.body.endDate
      ? new Date(req.body.endDate)
      : new Date(new Date(source.endDate).getTime() + ONE_YEAR_MS)
    if (endDate < startDate) {
      return res.status(400).json({ error: 'endDate doit être après startDate' })
    }

    const newName = (req.body.name && String(req.body.name).trim())
      || `${source.name} (copie)`

    const cloned = await Campaign.create({
      name:               newName.slice(0, 200),
      description:        source.description || '',
      startDate,
      endDate,
      status:             'draft',
      targetDepartments:  source.targetDepartments || [],
      extendedVisibility: source.extendedVisibility || [],
      createdBy:          req.user.id,
    })

    // Clone tous les formulaires associés (sans frozenAt → modifiables)
    const sourceForms = await Form.find({ campaignId: source._id }).lean()
    if (sourceForms.length) {
      const cloneDocs = sourceForms.map(f => ({
        campaignId:  cloned._id,
        title:       f.title,
        description: f.description || '',
        formType:    f.formType,
        isAnonymous: f.isAnonymous,
        questions:   f.questions,
        frozenAt:    null,
        createdBy:   req.user.id,
      }))
      await Form.insertMany(cloneDocs)
    }

    res.status(201).json({ id: cloned._id, formsCloned: sourceForms.length })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/campaigns/:id/analytics ────────────────────────────────────────
// Retourne des agrégats pour les rapports analytiques RH :
//   - statusDistribution : nb d'évaluations par statut
//   - scoreDistribution  : histogramme par tranche de 10 (0-9, 10-19, … 90-100)
//   - byDepartment       : { dept, total, completed, completionPct, avgScore }
//   - completionPct      : pourcentage global de complétion
//   - avgScore           : moyenne des scores non null
router.get('/:id/analytics', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }
    const campaignId = new mongoose.Types.ObjectId(req.params.id)
    const campaign = await Campaign.findById(campaignId).lean()
    if (!campaign) return res.status(404).json({ error: 'Campagne introuvable' })

    const COMPLETED = ['submitted', 'reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated']

    const [statusAgg, scoreAgg, deptAgg] = await Promise.all([
      Evaluation.aggregate([
        { $match: { campaignId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Evaluation.aggregate([
        { $match: { campaignId, score: { $ne: null } } },
        {
          $bucket: {
            groupBy: '$score',
            boundaries: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 101],
            default: 'other',
            output:  { count: { $sum: 1 }, avg: { $avg: '$score' } },
          },
        },
      ]),
      Evaluation.aggregate([
        { $match: { campaignId } },
        { $lookup: { from: 'users', localField: 'evaluateeId', foreignField: '_id', as: 'evaluatee' } },
        { $unwind: '$evaluatee' },
        {
          $group: {
            _id:       '$evaluatee.department',
            total:     { $sum: 1 },
            completed: { $sum: { $cond: [{ $in: ['$status', COMPLETED] }, 1, 0] } },
            scoreSum:  { $sum: { $ifNull: ['$score', 0] } },
            scoreCount: { $sum: { $cond: [{ $ne: ['$score', null] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ])

    const statusDistribution = statusAgg.reduce((acc, x) => {
      acc[x._id] = x.count
      return acc
    }, {})

    const totalEvals = statusAgg.reduce((s, x) => s + x.count, 0)
    const completedEvals = statusAgg
      .filter(x => COMPLETED.includes(x._id))
      .reduce((s, x) => s + x.count, 0)
    const completionPct = totalEvals > 0 ? Math.round((completedEvals / totalEvals) * 100) : 0

    const scoreDistribution = scoreAgg
      .filter(b => b._id !== 'other')
      .map(b => ({
        from:  b._id,
        to:    b._id + 9,
        count: b.count,
      }))

    const allScores = await Evaluation.aggregate([
      { $match: { campaignId, score: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$score' }, count: { $sum: 1 } } },
    ])
    const avgScore = allScores[0]?.avg !== undefined && allScores[0]?.avg !== null
      ? Math.round(allScores[0].avg * 10) / 10
      : null

    const byDepartment = deptAgg.map(d => ({
      department:    d._id || '—',
      total:         d.total,
      completed:     d.completed,
      completionPct: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
      avgScore:      d.scoreCount > 0 ? Math.round((d.scoreSum / d.scoreCount) * 10) / 10 : null,
    }))

    res.json({
      campaignId:         campaign._id,
      campaignName:       campaign.name,
      totalEvaluations:   totalEvals,
      completedEvaluations: completedEvals,
      completionPct,
      avgScore,
      statusDistribution,
      scoreDistribution,
      byDepartment,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
