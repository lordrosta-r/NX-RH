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

router.get('/', async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 20)
    const skip  = (page - 1) * limit

    const filter = {}

    if (req.query.action     && typeof req.query.action === 'string') {
      filter.action = req.query.action
    }
    if (req.query.targetType && typeof req.query.targetType === 'string') {
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
