'use strict'
// =============================================================================
// routes/events.js — CRUD événements calendrier (admin/hr only pour écriture)
// =============================================================================

const router   = require('express').Router()
const mongoose = require('mongoose')
const { Event }      = require('../models')
const { ADMIN_ROLES, ROLES } = require('../config/constants')
const { paginate } = require('../utils/paginate')

// GET /api/events — Liste des événements calendrier (filtrée par rôle)
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
    const result = await paginate(Event, query, {
      page:  req.query.page  || 1,
      limit: req.query.limit || 50,
      sort:  { date: 1 },
    })
    res.json(result)
  } catch (err) { next(err) }
})

// GET /api/events/:id — Détail d'un événement
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

// POST /api/events/:id/respond — RSVP : l'utilisateur accepte / décline / incertain
router.post('/:id/respond', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID invalide' })
    const { status } = req.body
    if (!['accepted', 'declined', 'tentative'].includes(status)) {
      return res.status(400).json({ error: 'status doit être accepted, declined ou tentative' })
    }
    const event = await Event.findById(req.params.id)
    if (!event) return res.status(404).json({ error: 'Événement introuvable' })

    // Même contrôle d'accès que GET /:id : il faut voir l'événement pour y répondre.
    if (req.user.role !== 'admin' && req.user.role !== 'hr') {
      const hasAccess = event.targetRoles.length === 0 || event.targetRoles.includes(req.user.role)
      if (!hasAccess) return res.status(403).json({ error: 'Accès refusé' })
    }

    // Upsert : une seule réponse par utilisateur.
    const uid = String(req.user.id)
    const existing = event.responses.find(r => r.userId.toString() === uid)
    if (existing) {
      existing.status = status
      existing.respondedAt = new Date()
    } else {
      event.responses.push({ userId: uid, status, respondedAt: new Date() })
    }
    await event.save()
    res.json(event)
  } catch (err) { next(err) }
})

// POST /api/events — Créer un événement (admin/hr)
router.post('/', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Accès refusé' })
    const { title, date, type, campaignId, description, location, endDate, targetRoles } = req.body
    if (!title || !date || !type) return res.status(400).json({ error: 'title, date et type sont requis' })
    if (endDate && new Date(endDate) <= new Date(date)) {
      return res.status(400).json({ error: 'La date de fin doit être postérieure à la date de début' })
    }
    if (targetRoles !== undefined) {
      if (!Array.isArray(targetRoles) || !targetRoles.every(r => ROLES.includes(r))) {
        return res.status(400).json({ error: 'targetRoles doit être un tableau de rôles valides' })
      }
    }
    const event = await Event.create({
      title, date, type, campaignId, description, location, endDate, targetRoles,
      createdBy: req.user.id,
    })
    res.status(201).json(event)
  } catch (err) { next(err) }
})

// DELETE /api/events/:id — Supprimer un événement (admin/hr)
router.delete('/:id', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Accès refusé' })
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID invalide' })
    const deleted = await Event.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'Événement introuvable' })
    res.status(204).end()
  } catch (err) { next(err) }
})

// PATCH /api/events/:id — Modifier un événement (admin/hr)
router.patch('/:id', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Accès refusé' })
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID invalide' })
    const event = await Event.findById(req.params.id)
    if (!event) return res.status(404).json({ error: 'Événement introuvable' })
    const { title, date, type, targetRoles, description, endDate } = req.body
    if (title       !== undefined) event.title       = title
    if (date        !== undefined) event.date        = date
    if (type        !== undefined) event.type        = type
    if (targetRoles !== undefined) event.targetRoles = targetRoles
    if (description !== undefined) event.description = description
    if (endDate     !== undefined) event.endDate     = endDate || null
    const effectiveDate    = event.date
    const effectiveEndDate = event.endDate
    if (effectiveEndDate && effectiveEndDate <= effectiveDate) {
      return res.status(400).json({ error: 'La date de fin doit être postérieure à la date de début' })
    }
    await event.save()
    res.json(event)
  } catch (err) { next(err) }
})

module.exports = router
