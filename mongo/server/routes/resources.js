// =============================================================================
// routes/resources.js — CRUD ressources documentaires (admin/hr only pour écriture)
// =============================================================================

const router   = require('express').Router()
const mongoose = require('mongoose')
const { Resource }    = require('../models')
const { ADMIN_ROLES } = require('../config/constants')

// GET /api/resources — documents publiés visibles par tous les authentifiés
router.get('/', async (req, res, next) => {
  try {
    const filter = ADMIN_ROLES.includes(req.user.role)
      ? {}
      : { status: 'published', visibleTo: req.user.role }
    const resources = await Resource.find(filter).sort({ createdAt: -1 }).limit(200).lean()
    res.json(resources)
  } catch (err) { next(err) }
})

// GET /api/resources/:id
router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID invalide' })
    const resource = await Resource.findById(req.params.id).lean()
    if (!resource) return res.status(404).json({ error: 'Ressource introuvable' })
    if (!ADMIN_ROLES.includes(req.user.role)) {
      if (resource.status !== 'published' || !resource.visibleTo.includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    }
    res.json(resource)
  } catch (err) { next(err) }
})

// POST /api/resources — admin/hr uniquement
router.post('/', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' })
    const { title, description, type, filename, status, visibleTo } = req.body
    if (!title || !type || !filename) return res.status(400).json({ error: 'title, type et filename requis' })
    if (!/^[a-zA-Z0-9_\-.]+$/.test(filename) || filename.includes('..')) {
      return res.status(400).json({ error: 'Nom de fichier invalide' })
    }
    const resource = await Resource.create({
      title, description, type, filename, status, visibleTo, createdBy: req.user.id,
    })
    res.status(201).json(resource)
  } catch (err) { next(err) }
})

// PATCH /api/resources/:id — admin/hr uniquement
// Utilise save() pour déclencher le hook pre-save (publishedAt automatique)
router.patch('/:id', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' })
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID invalide' })
    const resource = await Resource.findById(req.params.id)
    if (!resource) return res.status(404).json({ error: 'Ressource introuvable' })
    const allowed = ['title', 'description', 'status', 'visibleTo']
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)))
    Object.assign(resource, updates)
    await resource.save()
    res.json(resource)
  } catch (err) { next(err) }
})

// DELETE /api/resources/:id — admin/hr uniquement
router.delete('/:id', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' })
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID invalide' })
    await Resource.findByIdAndDelete(req.params.id)
    res.json({ deleted: true })
  } catch (err) { next(err) }
})

module.exports = router
