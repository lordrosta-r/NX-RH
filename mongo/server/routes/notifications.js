'use strict'

// =============================================================================
// routes/notifications.js — Notifications in-app de l'utilisateur connecté
//
// GET    /api/notifications              ?unreadOnly=true&limit=20&page=1
// GET    /api/notifications/count        { total, unreadCount } — badge navbar
// PATCH  /api/notifications/read-all     marquer toutes lues
// PATCH  /api/notifications/:id/read     marquer une notification lue
// DELETE /api/notifications/:id          supprimer une notification
// POST   /api/notifications/global-remind broadcast reminder (admin/hr)
//
// Rôles autorisés : tous les rôles connectés (déclaré dans index.js)
// =============================================================================

const router               = require('express').Router()
const User                 = require('../models/User')
const Notification         = require('../models/Notification')
const notificationsService = require('../services/notificationsService')

// ─── GET /api/notifications ───────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const result = await notificationsService.getNotifications(req.user._id, {
      page:       req.query.page,
      limit:      req.query.limit,
      unreadOnly: req.query.unreadOnly === 'true',
    })
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/notifications/count ────────────────────────────────────────────
// IMPORTANT : déclaré AVANT /:id pour éviter la capture par la route paramétrée

router.get('/count', async (req, res, next) => {
  try {
    const userId = req.user._id
    const [total, unreadCount] = await Promise.all([
      Notification.countDocuments({ userId }),
      notificationsService.getUnreadCount(userId),
    ])
    res.json({ total, unreadCount })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────
// IMPORTANT : déclaré AVANT /:id pour éviter la capture par la route paramétrée

router.patch('/read-all', async (req, res, next) => {
  try {
    const result = await notificationsService.markAllAsRead(req.user._id)
    res.json(result)
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
    const title = message || 'Rappel : une action est en attente de votre part.'
    const body  = campaignId ? `Référence campagne : ${campaignId}` : ''
    const link  = campaignId ? `/campaigns/${campaignId}` : '/evaluations'

    const activeUsers = await User.find({ isActive: true }, '_id').lean()
    if (activeUsers.length === 0) return res.json({ sent: 0 })

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

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────

router.patch('/:id/read', async (req, res, next) => {
  try {
    const result = await notificationsService.markAsRead(req.params.id, req.user._id)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// ─── DELETE /api/notifications/:id ───────────────────────────────────────────

router.delete('/:id', async (req, res, next) => {
  try {
    await notificationsService.deleteNotification(req.params.id, req.user._id)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

module.exports = router
