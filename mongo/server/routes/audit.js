'use strict'

// =============================================================================
// /api/admin/audit — Piste d'audit (admin + hr)
//
// GET /api/admin/audit
//   Query: ?page=1&limit=20&action=&targetType=&userId=&from=&to=
//   Auth: admin | hr (appliqué au montage dans index.js)
// =============================================================================

const router   = require('express').Router()
const mongoose = require('mongoose')
const { AuditLog } = require('../models')
const { paginate }  = require('../utils/paginate')

// Whitelist des valeurs acceptées — empêche tout probing arbitraire sur la piste d'audit
const VALID_ACTIONS = [
  'status_change', 'evaluation_update', 'campaign_create', 'campaign_activate',
  'campaign_update', 'campaign_delete', 'bulk_action', 'offboard', 'offboarding_create',
  'offboarding_update', 'offboarding_delete', 'gdpr_anonymize', 'reassigned',
  'login', 'login_failed',
  'impersonate_start', 'impersonate_stop', 'impersonate_write_blocked',
]
const VALID_TARGET_TYPES = ['Evaluation', 'Campaign', 'User', 'Form', 'OffboardingRequest']

// GET /api/admin/audit/export — Export CSV du journal d'audit
router.get('/export', async (req, res, next) => {
  try {
    const filter = {}
    if (req.query.userId)     filter.userId     = req.query.userId
    if (req.query.action)     filter.action     = req.query.action
    if (req.query.targetType) filter.targetType = req.query.targetType
    if (req.query.from || req.query.to) {
      filter.createdAt = {}
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from)
      if (req.query.to)   filter.createdAt.$lte = new Date(req.query.to)
    }

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(5000)
      .populate('userId', 'firstName lastName email')
      .lean()

    // Build CSV
    const lines = [
      ['Date', 'Utilisateur', 'Email', 'Action', 'Type cible', 'ID cible', 'Détails'].join(';'),
      ...logs.map(l => [
        new Date(l.createdAt).toISOString(),
        l.userId ? `${l.userId.firstName} ${l.userId.lastName}` : '',
        l.userId?.email || '',
        l.action,
        l.targetType || '',
        l.targetId   || '',
        JSON.stringify(l.details || {}),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
    ]

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="audit-export.csv"')
    res.send('\ufeff' + lines.join('\r\n'))  // BOM pour Excel
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/audit — Liste les entrées de la piste d'audit (paginé)
router.get('/', async (req, res, next) => {
  try {
    const filter = {}

    if (req.query.action) {
      if (!VALID_ACTIONS.includes(req.query.action)) {
        return res.status(400).json({ error: `action invalide. Valeurs acceptées: ${VALID_ACTIONS.join(', ')}` })
      }
      filter.action = req.query.action
    }
    if (req.query.targetType) {
      if (!VALID_TARGET_TYPES.includes(req.query.targetType)) {
        return res.status(400).json({ error: `targetType invalide. Valeurs acceptées: ${VALID_TARGET_TYPES.join(', ')}` })
      }
      filter.targetType = req.query.targetType
    }
    if (req.query.userId && mongoose.isValidObjectId(req.query.userId)) {
      filter.userId = req.query.userId
    }
    if (req.query.from || req.query.to) {
      filter.createdAt = {}
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from)
      if (req.query.to)   filter.createdAt.$lte = new Date(req.query.to)
    }

    const result = await paginate(AuditLog, filter, {
      page:  req.query.page  || 1,
      limit: req.query.limit || 20,
      sort:  { createdAt: -1 },
      populate: { path: 'userId', select: 'firstName lastName role' },
    })
    res.json(result)
  } catch (err) {
    next(err)
  }
})

module.exports = router
