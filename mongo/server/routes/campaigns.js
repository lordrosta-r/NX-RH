'use strict'

// =============================================================================
// /api/campaigns — Campagnes d'évaluation
//
// GET    /api/campaigns          → liste (scopée par rôle)
// GET    /api/campaigns/:id      → détail + stats
// POST   /api/campaigns          → créer (admin/hr)
// PATCH  /api/campaigns/:id      → modifier / changer statut (admin/hr)
// =============================================================================

const router     = require('express').Router()
const mongoose   = require('mongoose')
const { Campaign, Evaluation, CAMPAIGN_TRANSITIONS: VALID_TRANSITIONS } = require('../models')
const { ADMIN_ROLES } = require('../config/constants')

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

    const { name, description, startDate, endDate, targetDepartments, extendedVisibility } = req.body

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
      createdBy:          req.user.id,
    })

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

    // Validation de la transition de statut
    if (req.body.status) {
      const allowed = VALID_TRANSITIONS[campaign.status] || []
      if (!allowed.includes(req.body.status)) {
        return res.status(400).json({
          error: `Transition '${campaign.status}' → '${req.body.status}' non autorisée`,
        })
      }
    }

    const EDITABLE = ['name', 'description', 'status', 'startDate', 'endDate', 'targetDepartments', 'extendedVisibility']
    EDITABLE.forEach(key => {
      if (req.body[key] !== undefined) campaign[key] = req.body[key]
    })

    await campaign.save()
    res.json(campaign.toObject())
  } catch (err) {
    next(err)
  }
})

module.exports = router
