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

const router          = require('express').Router()
const mongoose        = require('mongoose')
const { Campaign, Evaluation, AuditLog } = require('../models')
const { ADMIN_ROLES, MANAGER_ROLES }     = require('../config/constants')
const validate                           = require('../middleware/validate')
const {
  createCampaign: createCampaignValidator,
  updateCampaign: updateCampaignValidator,
} = require('../validators/campaignValidators')
const campaignService = require('../services/campaignService')
const respond = require('../utils/response')
const apiResponse = require('../utils/apiResponse')
const { paginate } = require('../utils/paginate')

// GET /api/campaigns — Liste des campagnes (scopée par rôle)
router.get('/', async (req, res, next) => {
  try {
    const filter = {}

    // Filtre optionnel par statut (?status=active) — whitelist anti-injection NoSQL
    const VALID_STATUSES = ['draft', 'active', 'closed', 'archived']
    if (typeof req.query.status === 'string' && VALID_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status
    }

    // Les employés ne voient que les campagnes actives
    if (!MANAGER_ROLES.includes(req.user.role)) {
      filter.status = 'active'
    }

    // ── RBAC : restriction de visibilité par rôle ───────────────────────────
    if (!ADMIN_ROLES.includes(req.user.role)) {
      const uid = req.user._id
      if (req.user.role === 'employee') {
        const evals = await Evaluation.find({ evaluateeId: uid }, 'campaignId').lean()
        filter._id = { $in: evals.map(e => e.campaignId) }
      } else {
        // manager
        const evals = await Evaluation.find({ evaluatorId: uid }, 'campaignId').lean()
        filter.$or = [
          { createdBy: uid },
          { 'extendedVisibility.managerId': uid },
          { _id: { $in: evals.map(e => e.campaignId) } },
        ]
      }
    }

    const result = await paginate(Campaign, filter, {
      page:  req.query.page  || 1,
      limit: req.query.limit || 50,
      sort:  { startDate: -1 },
      populate: { path: 'createdBy', select: 'firstName lastName email' },
    })

    // Enrich with completionPct from evaluations
    if (result.data.length > 0) {
      const COMPLETED = ['submitted', 'validated']
      const campaignIds = result.data.map(c => c._id)
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
      for (const c of result.data) {
        c.completionPct = statsMap[c._id.toString()] ?? 0
      }
    }

    apiResponse.paginated(res, result)
  } catch (err) {
    next(err)
  }
})

// GET /api/campaigns/:id — Détail d'une campagne avec stats de complétion
router.get('/:id', async (req, res, next) => {
  try {
    const result = await campaignService.getCampaignById(req.params.id, req.user)
    respond.item(res, result)
  } catch (err) {
    next(err)
  }
})

// POST /api/campaigns — Créer une campagne (admin/hr)
router.post(
  '/',
  (req, res, next) => {
    if (!ADMIN_ROLES.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }
    next()
  },
  validate(createCampaignValidator),
  async (req, res, next) => {
    try {
      const campaign = await campaignService.createCampaign(req.body, req.user.id)

      AuditLog.create({
        userId:     req.user.id,
        userRole:   req.user.role,
        action:     'campaign_create',
        targetType: 'Campaign',
        targetId:   campaign._id,
        meta:       { name: campaign.name },
      }).catch(() => {})

      respond.created(res, campaign)
    } catch (err) {
      next(err)
    }
  }
)

// PATCH /api/campaigns/:id — Modifier ou changer le statut d'une campagne (admin/hr)
router.patch('/:id', validate(updateCampaignValidator), async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }

    const { campaign, originalStatus, warning } = await campaignService.updateCampaign(req.params.id, req.body)

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

    const payload = campaign.toObject()
    if (warning) payload.warning = warning
    respond.item(res, payload)
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

    const campaign = await campaignService.deleteCampaign(req.params.id)

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

// POST /api/campaigns/:id/generate-evaluations — Générer les évaluations d'une campagne (admin/hr)
router.post('/:id/generate-evaluations', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const campaign = await Campaign.findById(req.params.id)
    if (!campaign) return res.status(404).json({ error: 'Campagne introuvable' })

    const generated = await campaignService.generateEvaluationsForCampaign(campaign)
    apiResponse.success(res, { generated })
  } catch (err) {
    next(err)
  }
})

// POST /api/campaigns/:id/clone — Dupliquer une campagne (statut → draft) avec ses formulaires
router.post('/:id/clone', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }

    const result = await campaignService.cloneCampaign(req.params.id, req.body, req.user.id)
    apiResponse.created(res, result)
  } catch (err) {
    next(err)
  }
})

// POST /api/campaigns/:id/forms — Lier un formulaire à une campagne (admin/hr)
router.post('/:id/forms', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }

    const { campaignId, formId, form } = await campaignService.linkForm(req.params.id, req.body.formId)

    AuditLog.create({
      userId:     req.user.id,
      userRole:   req.user.role,
      action:     'campaign_form_linked',
      targetType: 'Campaign',
      targetId:   campaignId,
      meta:       { formId, formTitle: form.title, formType: form.formType },
    }).catch(() => {})

    apiResponse.created(res, { campaignId, formId })
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

    const { campaignId, formId } = await campaignService.unlinkForm(req.params.id, req.params.formId)

    AuditLog.create({
      userId:     req.user.id,
      userRole:   req.user.role,
      action:     'campaign_form_unlinked',
      targetType: 'Campaign',
      targetId:   campaignId,
      meta:       { formId },
    }).catch(() => {})

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

// ── Collecte des formulaires des managers ───────────────────────────────────────

// GET /api/campaigns/mine/form-requests — Demandes de formulaire ciblant le manager
// connecté. Doit être déclaré AVANT /:id pour ne pas être capté par celui-ci.
router.get('/mine/form-requests', async (req, res, next) => {
  try {
    const list = await campaignService.getMyFormRequests(req.user.id)
    apiResponse.success(res, list)
  } catch (err) {
    next(err)
  }
})

// GET /api/campaigns/form-requests/overview — Aperçu RH/Admin des collectes en cours
router.get('/form-requests/overview', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }
    const data = await campaignService.getFormRequestsOverview()
    apiResponse.success(res, data)
  } catch (err) {
    next(err)
  }
})

// POST /api/campaigns/:id/form-requests — RH demande des formulaires à des managers
router.post('/:id/form-requests', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }
    const result = await campaignService.requestForms(req.params.id, req.body.managerIds)
    AuditLog.create({
      userId: req.user.id, userRole: req.user.role,
      action: 'campaign_forms_requested', targetType: 'Campaign', targetId: result.campaignId,
      meta: { managerIds: result.requested },
    }).catch(() => {})
    apiResponse.created(res, result)
  } catch (err) {
    next(err)
  }
})

// DELETE /api/campaigns/:id/form-requests/:managerId — RH annule une demande
router.delete('/:id/form-requests/:managerId', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }
    const result = await campaignService.cancelFormRequest(req.params.id, req.params.managerId)
    res.status(204).end()
    void result
  } catch (err) {
    next(err)
  }
})

// POST /api/campaigns/:id/form-requests/submit — Le manager attache un de ses formulaires
router.post('/:id/form-requests/submit', async (req, res, next) => {
  try {
    if (!MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux managers' })
    }
    const result = await campaignService.submitFormRequest(req.params.id, req.body.formId, req.user.id)
    AuditLog.create({
      userId: req.user.id, userRole: req.user.role,
      action: 'campaign_form_submitted', targetType: 'Campaign', targetId: result.campaignId,
      meta: { formId: result.formId },
    }).catch(() => {})
    apiResponse.success(res, result)
  } catch (err) {
    next(err)
  }
})

// PATCH /api/campaigns/:id/form-requests/:managerId/decision — RH accepte/refuse
router.patch('/:id/form-requests/:managerId/decision', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }
    const result = await campaignService.decideFormRequest(
      req.params.id, req.params.managerId, req.body.decision,
    )
    AuditLog.create({
      userId: req.user.id, userRole: req.user.role,
      action: 'campaign_form_decision', targetType: 'Campaign', targetId: result.campaignId,
      meta: { managerId: req.params.managerId, decision: result.status },
    }).catch(() => {})
    apiResponse.success(res, result)
  } catch (err) {
    next(err)
  }
})

// GET /api/campaigns/:id/analytics — Agrégats analytiques (admin/hr)
router.get('/:id/analytics', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const campaign = await Campaign.findById(req.params.id).lean()
    if (!campaign) return res.status(404).json({ error: 'Campagne introuvable' })

    const analytics = await campaignService.getCampaignAnalytics(campaign, req.user)
    apiResponse.success(res, analytics)
  } catch (err) {
    next(err)
  }
})

module.exports = router
