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

// Whitelist des valeurs acceptées — empêche tout probing arbitraire sur la piste d'audit
const VALID_ACTIONS = [
  'status_change', 'evaluation_update', 'campaign_create', 'campaign_activate',
  'campaign_update', 'campaign_delete', 'bulk_action', 'offboard', 'offboarding_create',
  'offboarding_update', 'offboarding_delete', 'gdpr_anonymize', 'reassigned',
  'login', 'login_failed',
]
const VALID_TARGET_TYPES = ['Evaluation', 'Campaign', 'User', 'Form', 'OffboardingRequest']

router.get('/', async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 20)
    const skip  = (page - 1) * limit

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

    const [data, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('userId', 'firstName lastName role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ])

    res.json({ data, total, page, limit })
  } catch (err) {
    next(err)
  }
})

module.exports = router
