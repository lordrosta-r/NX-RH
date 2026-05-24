'use strict'

// =============================================================================
// /api/campaigns — Campagnes d'évaluation
//
// GET    /api/campaigns                    → liste (scopée par rôle)
// GET    /api/campaigns/:id                → détail + stats
// POST   /api/campaigns                    → créer (admin/hr)
// POST   /api/campaigns/:id/clone          → dupliquer (admin/hr)
// POST   /api/campaigns/:id/forms          → lier un formulaire à la campagne (admin/hr)
// DELETE /api/campaigns/:id/forms/:formId  → délier un formulaire (admin/hr)
// PATCH  /api/campaigns/:id               → modifier / changer statut (admin/hr)
// DELETE /api/campaigns/:id               → supprimer (admin/hr — draft/archived seulement)
// GET    /api/campaigns/:id/analytics     → agrégats analytiques (admin/hr)
// =============================================================================

const router     = require('express').Router()
const mongoose   = require('mongoose')
const { Campaign, Evaluation, Form, User, AuditLog, CAMPAIGN_TRANSITIONS: VALID_TRANSITIONS } = require('../models')
const { ADMIN_ROLES, MANAGER_ROLES } = require('../config/constants')
const { notifyMany }  = require('../services/notificationService')

// Génère des évaluations pour tous les utilisateurs ciblés par campaign.targetScope.
// Appelée en fire-and-forget lors du passage en statut 'active'.
async function generateEvaluationsForCampaign(campaign) {
  let userFilter = { isActive: true }
  const { scopeType, ids } = campaign.targetScope || {}

  if (scopeType === 'department' && ids?.length) {
    userFilter.department = { $in: ids }
  } else if (scopeType === 'sector' && ids?.length) {
    userFilter.sectorId = { $in: ids }
  } else if (scopeType === 'users' && ids?.length) {
    userFilter._id = { $in: ids }
  } else if (scopeType === 'group') {
    const UserGroup = require('../models/UserGroup')
    const group = await UserGroup.findById(ids[0]).populate('members', '_id')
    if (group) {
      userFilter._id = { $in: group.members.map(m => m._id) }
    } else {
      userFilter._id = { $in: [] }
    }
  }
  // 'all' → pas de filtre supplémentaire

  const [users, forms] = await Promise.all([
    User.find(userFilter).select('_id managerId').lean(),
    Form.find({ _id: { $in: campaign.formIds || [] } }).select('_id formType').lean(),
  ])

  if (!forms.length) {
    console.warn(`[campaign-scope] Aucun formulaire pour la campagne ${campaign._id}`)
    return 0
  }

  const ops = []
  for (const user of users) {
    for (const form of forms) {
      const evaluatorId = user.managerId || user._id
      ops.push({
        updateOne: {
          filter: { campaignId: campaign._id, formId: form._id, evaluateeId: user._id },
          update: {
            $setOnInsert: {
              campaignId: campaign._id,
              formId:     form._id,
              evaluateeId: user._id,
              evaluatorId,
              status:    'assigned',
              createdAt: new Date(),
            },
          },
          upsert: true,
        },
      })
    }
  }

  if (ops.length) {
    const result = await Evaluation.bulkWrite(ops, { ordered: false })
    return result.upsertedCount || 0
  }
  return 0
}

// GET /api/campaigns — Liste des campagnes (scopée par rôle)
router.get('/', async (req, res, next) => {
  try {
    const filter = {}

    // Filtre optionnel par statut (?status=active) — whitelist anti-injection NoSQL
    const VALID_STATUSES = ['draft', 'active', 'closed', 'archived']
    if (req.query.status && VALID_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status
    }

    // Les employés ne voient que les campagnes actives
    if (!MANAGER_ROLES.includes(req.user.role)) {
      filter.status = 'active'
    }

    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 50)
    const skip  = (page - 1) * limit
    const [campaigns, total] = await Promise.all([
      Campaign.find(filter).populate('createdBy', 'firstName lastName email').sort({ startDate: -1 }).skip(skip).limit(limit).lean(),
      Campaign.countDocuments(filter),
    ])

    // Enrich with completionPct from evaluations
    if (campaigns.length > 0) {
      const COMPLETED = ['submitted', 'validated']
      const campaignIds = campaigns.map(c => c._id)
      const stats = await Evaluation.aggregate([
        { $match: { campaignId: { $in: campaignIds } } },
        {
          $group: {
            _id: '$campaignId',
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $in: ['$status', COMPLETED] }, 1, 0] } },
          },
        },
      ])
      const statsMap = {}
      for (const s of stats) {
        statsMap[s._id.toString()] = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0
      }
      for (const c of campaigns) {
        c.completionPct = statsMap[c._id.toString()] ?? 0
      }
    }

    res.json({ data: campaigns, total, page, limit })
  } catch (err) {
    next(err)
  }
})

// GET /api/campaigns/:id — Détail d'une campagne avec stats de complétion
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

// POST /api/campaigns — Créer une campagne (admin/hr)
router.post('/', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }

    const { name, description, startDate, endDate, targetDepartments, extendedVisibility,
      deadlineEmployee, deadlineManager, status, targetScope, objectivesFormId } = req.body

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ error: 'name, startDate et endDate sont requis' })
    }
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ error: 'endDate doit être après startDate' })
    }
    if (status && !['draft', 'active'].includes(status)) {
      return res.status(400).json({ error: 'Le statut initial doit être draft ou active' })
    }

    const campaign = await Campaign.create({
      name,
      description:        description || '',
      startDate,
      endDate,
      targetDepartments:  targetDepartments || [],
      extendedVisibility: extendedVisibility || [],
      deadlineEmployee:   deadlineEmployee   || null,
      deadlineManager:    deadlineManager    || null,
      createdBy:          req.user.id,
      ...(status           ? { status }           : {}),
      ...(targetScope      ? { targetScope }      : {}),
      ...(objectivesFormId ? { objectivesFormId } : {}),
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

    const created = await Campaign.findById(campaign._id).populate('createdBy', 'firstName lastName email').lean()
    res.status(201).json(created)
  } catch (err) {
    next(err)
  }
})

// PATCH /api/campaigns/:id — Modifier ou changer le statut d'une campagne (admin/hr)
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
      'targetDepartments', 'extendedVisibility', 'deadlineEmployee', 'deadlineManager',
      'previousCampaignId', 'enableN1Context', 'n1VisibleToEmployee', 'targetScope']
    EDITABLE.forEach(key => {
      if (req.body[key] !== undefined) campaign[key] = req.body[key]
    })

    await campaign.save()

    // Avertissement si clôture/archivage avec complétion < 100%
    let warning = null
    const closingTransitions = ['closed', 'archived']
    if (req.body.status && closingTransitions.includes(req.body.status)) {
      const COMPLETED = ['submitted', 'reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated']
      const [totalAgg, completedAgg] = await Promise.all([
        Evaluation.countDocuments({ campaignId: campaign._id }),
        Evaluation.countDocuments({ campaignId: campaign._id, status: { $in: COMPLETED } }),
      ])
      if (totalAgg > 0) {
        const pct = Math.round((completedAgg / totalAgg) * 100)
        if (pct < 100) {
          warning = `${pct}% des évaluations sont complètes (${completedAgg}/${totalAgg})`
        }
      }
    }

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

    // ── Fire-and-forget: generate evaluations from targetScope ──────────────
    if (req.body.status === 'active') {
      generateEvaluationsForCampaign(campaign).then(count => {
        console.log(`[campaign-scope] ${count} évaluation(s) créée(s) pour la campagne ${campaign._id}`)
      }).catch(err => {
        console.error('[campaign-scope] Erreur génération évaluations:', err)
      })
    }

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

    const payload = campaign.toObject()
    if (warning) payload.warning = warning
    res.json(payload)
  } catch (err) {
    next(err)
  }
})

// DELETE /api/campaigns/:id — Supprimer une campagne draft ou archived (admin/hr)
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

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        await Evaluation.deleteMany({ campaignId: campaign._id }, { session })
        await Form.deleteMany({ _id: { $in: campaign.formIds || [] } }, { session })
        await campaign.deleteOne({ session })
      })
    } catch (err) {
      if (err.code === 20 || err.message?.includes('Transaction') || err.message?.includes('replica')) {
        console.warn('[delete-campaign] Transactions non disponibles, exécution séquentielle')
        await Evaluation.deleteMany({ campaignId: campaign._id })
        await Form.deleteMany({ _id: { $in: campaign.formIds || [] } })
        await campaign.deleteOne()
      } else {
        throw err
      }
    } finally {
      await session.endSession()
    }

    // Fire-and-forget audit log
    AuditLog.create({
      userId:     req.user.id,
      userRole:   req.user.role,
      action:     'campaign_delete',
      targetType: 'Campaign',
      targetId:   campaign._id,
      meta:       { name: campaign.name, status: campaign.status },
    }).catch(() => {})

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

// POST /api/campaigns/:id/clone — Dupliquer une campagne (statut → draft) avec ses formulaires
// Les dates sont décalées d'un an par défaut, surchargeables via { startDate, endDate }.
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
      formIds:            source.formIds || [],
      createdBy:          req.user.id,
      previousCampaignId:  source._id,
      enableN1Context:     source.enableN1Context  ?? true,
      n1VisibleToEmployee: source.n1VisibleToEmployee ?? true,
    })

    const sourceForms = await Form.find({ _id: { $in: source.formIds || [] } }).lean()
    if (sourceForms.length > 0) {
      const formCopies = sourceForms.map(({ _id, createdAt, updatedAt, frozenAt, isFrozen, ...rest }) => ({ // eslint-disable-line no-unused-vars
        ...rest,
        isFrozen: false,
        frozenAt: null,
        createdBy: req.user.id,
      }))
      await Form.insertMany(formCopies)
    }

    res.status(201).json({ id: cloned._id, formsCloned: sourceForms.length })
  } catch (err) {
    next(err)
  }
})

// POST /api/campaigns/:id/forms — Lier un formulaire à une campagne (admin/hr)
// Ajoute formId à campaign.formIds. Contrainte : un seul formulaire par formType.
router.post('/:id/forms', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID de campagne invalide' })
    }

    const { formId } = req.body
    if (!formId || !mongoose.isValidObjectId(formId)) {
      return res.status(400).json({ error: 'formId est requis et doit être un ObjectId valide' })
    }

    const [campaign, form] = await Promise.all([
      Campaign.findById(req.params.id).populate('formIds', 'formType'),
      Form.findById(formId).lean(),
    ])

    if (!campaign) return res.status(404).json({ error: 'Campagne introuvable' })
    if (!form) return res.status(404).json({ error: 'Formulaire introuvable' })

    const alreadyLinked = campaign.formIds.some(f => f._id.toString() === formId)
    if (alreadyLinked) {
      return res.status(409).json({ error: 'Ce formulaire est déjà lié à cette campagne' })
    }

    const duplicateType = campaign.formIds.some(f => f.formType === form.formType)
    if (duplicateType) {
      return res.status(409).json({ error: `Un formulaire de type '${form.formType}' est déjà lié à cette campagne` })
    }

    campaign.formIds.push(form._id)
    await campaign.save()

    AuditLog.create({
      userId:     req.user.id,
      userRole:   req.user.role,
      action:     'campaign_form_linked',
      targetType: 'Campaign',
      targetId:   campaign._id,
      meta:       { formId: form._id, formTitle: form.title, formType: form.formType },
    }).catch(() => {})

    res.status(201).json({ campaignId: campaign._id, formId: form._id })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/campaigns/:id/forms/:formId — Délier un formulaire d'une campagne (admin/hr)
router.delete('/:id/forms/:formId', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.formId)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const campaign = await Campaign.findById(req.params.id)
    if (!campaign) return res.status(404).json({ error: 'Campagne introuvable' })

    const idx = campaign.formIds.findIndex(f => f.toString() === req.params.formId)
    if (idx === -1) {
      return res.status(404).json({ error: 'Formulaire non lié à cette campagne' })
    }

    campaign.formIds.splice(idx, 1)
    await campaign.save()

    AuditLog.create({
      userId:     req.user.id,
      userRole:   req.user.role,
      action:     'campaign_form_unlinked',
      targetType: 'Campaign',
      targetId:   campaign._id,
      meta:       { formId: req.params.formId },
    }).catch(() => {})

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})


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
