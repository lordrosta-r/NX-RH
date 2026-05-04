'use strict'

// =============================================================================
// routes/notifications.js — Notifications in-app de l'utilisateur connecté
//
// GET   /api/notifications              ?unreadOnly=true&limit=20&page=1
// PATCH /api/notifications/read-all     marquer toutes lues
// PATCH /api/notifications/:id/read     marquer une notification lue
// GET   /api/notifications/count        { total, unreadCount } — badge navbar
// POST  /api/notifications/global-remind broadcast reminder (admin/hr)
//
// Rôles autorisés : tous les rôles connectés (déclaré dans index.js)
// =============================================================================

const router   = require('express').Router()
const mongoose = require('mongoose')
const Notification = require('../models/Notification')
const User         = require('../models/User')

// ─── GET /api/notifications ───────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const userId     = req.user._id
    const unreadOnly = req.query.unreadOnly === 'true'
    const limit      = Math.min(parseInt(req.query.limit, 10) || 20, 100)
    const page       = Math.max(parseInt(req.query.page,  10) || 1, 1)
    const skip       = (page - 1) * limit

    const filter = { userId }
    if (unreadOnly) filter.read = false

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId, read: false }),
    ])

    res.json({ data: notifications, total, page, limit, unreadCount })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────
// IMPORTANT : déclaré AVANT /:id pour éviter la capture par la route paramétrée

router.patch('/read-all', async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true },
    )
    res.json({ modifiedCount: result.modifiedCount })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────

router.patch('/:id/read', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const notification = await Notification.findById(req.params.id)
    if (!notification) return res.status(404).json({ error: 'Notification introuvable' })

    if (!notification.userId.equals(req.user._id)) {
      return res.status(403).json({ error: 'Accès refusé' })
    }

    notification.read = true
    await notification.save()
    res.json({ id: notification._id, read: notification.read })
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/notifications/count ────────────────────────────────────────────

router.get('/count', async (req, res, next) => {
  try {
    const userId = req.user._id
    const [total, unreadCount] = await Promise.all([
      Notification.countDocuments({ userId }),
      Notification.countDocuments({ userId, read: false }),
    ])
    res.json({ total, unreadCount })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/notifications/global-remind ───────────────────────────────────
// Envoie une notification in-app "reminder" à TOUS les utilisateurs actifs.
// Rôles : admin, hr uniquement.

router.post('/global-remind', async (req, res, next) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' })
    }

    const { campaignId, message } = req.body
    const title  = message || 'Rappel : une action est en attente de votre part.'
    const body   = campaignId ? `Référence campagne : ${campaignId}` : ''
    const link   = campaignId ? `/campaigns/${campaignId}` : '/evaluations'

    const activeUsers = await User.find({ isActive: true }, '_id').lean()

    if (activeUsers.length === 0) {
      return res.json({ sent: 0 })
    }

    const docs = activeUsers.map(u => ({
      userId:   u._id,
      type:     'reminder',
      title,
      body,
      link,
      priority: 'medium',
    }))

    const result = await Notification.insertMany(docs, { ordered: false })
    return res.json({ sent: result.length })
  } catch (err) {
    next(err)
  }
})

module.exports = router
