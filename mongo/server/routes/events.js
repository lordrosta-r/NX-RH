// =============================================================================
// routes/events.js — CRUD événements calendrier (admin/hr only pour écriture)
// =============================================================================

const router   = require('express').Router()
const mongoose = require('mongoose')
const { Event }      = require('../models')
const { ADMIN_ROLES } = require('../config/constants')

// GET /api/events — visible par tous les authentifiés, filtré par targetRoles
router.get('/', async (req, res, next) => {
  try {
    const query = {}
    // admin et hr voient tous les événements ; les autres ne voient que les leurs
    if (req.user.role !== 'admin' && req.user.role !== 'hr') {
      query.$or = [
        { targetRoles: { $size: 0 } },     // accessible à tous (aucun rôle ciblé)
        { targetRoles: req.user.role },     // ciblé ce rôle spécifiquement
      ]
    }
    const events = await Event.find(query).sort({ date: 1 }).limit(100).lean()
    res.json(events)
  } catch (err) { next(err) }
})

// GET /api/events/:id — détail d'un événement
router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID invalide' })
    const event = await Event.findById(req.params.id).lean()
    if (!event) return res.status(404).json({ error: 'Événement introuvable' })

    // Contrôle d'accès : vérifier que le rôle de l'utilisateur est dans targetRoles
    if (req.user.role !== 'admin' && req.user.role !== 'hr') {
      const hasAccess = event.targetRoles.length === 0 || event.targetRoles.includes(req.user.role)
      if (!hasAccess) return res.status(403).json({ error: 'Accès refusé' })
    }

    res.json(event)
  } catch (err) { next(err) }
})

// POST /api/events — admin/hr uniquement
router.post('/', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' })
    const { title, date, type, campaignId } = req.body
    if (!title || !date) return res.status(400).json({ error: 'title et date requis' })
    const event = await Event.create({ title, date, type, campaignId, createdBy: req.user.id })
    res.status(201).json(event)
  } catch (err) { next(err) }
})

// DELETE /api/events/:id — admin/hr uniquement
router.delete('/:id', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' })
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID invalide' })
    await Event.findByIdAndDelete(req.params.id)
    res.json({ deleted: true })
  } catch (err) { next(err) }
})

module.exports = router
