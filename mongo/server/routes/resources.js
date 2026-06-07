'use strict'
// =============================================================================
// routes/resources.js — CRUD ressources documentaires (admin/hr only pour écriture)
// =============================================================================

const path     = require('path')
const fs       = require('fs')
const router   = require('express').Router()
const mongoose = require('mongoose')
const { Resource }    = require('../models')
const { ADMIN_ROLES } = require('../config/constants')
const { upload }       = require('../middleware/uploadMiddleware')
const { uploadFile, deleteFile, getSignedUrl, USE_MINIO } = require('../services/storageService')

// GET /api/resources — Documents publiés visibles par les utilisateurs authentifiés
router.get('/', async (req, res, next) => {
  try {
    const filter = ADMIN_ROLES.includes(req.user.role)
      ? {}
      : { status: 'published', visibleTo: req.user.role }
    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 50)
    const skip  = (page - 1) * limit
    const [data, total] = await Promise.all([
      Resource.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Resource.countDocuments(filter),
    ])
    res.json({ data, total, page, limit })
  } catch (err) { next(err) }
})

// GET /api/resources/:id — Détail d'une ressource
router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID invalide' })
    const resource = await Resource.findById(req.params.id).lean()
    if (!resource) return res.status(404).json({ error: 'Ressource introuvable' })
    if (!ADMIN_ROLES.includes(req.user.role)) {
      if (resource.status !== 'published' || !resource.visibleTo.includes(req.user.role)) {
        return res.status(403).json({ error: 'Accès refusé' })
      }
    }
    res.json(resource)
  } catch (err) { next(err) }
})

// POST /api/resources — Créer une ressource documentaire (admin/hr)
router.post('/', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Accès refusé' })
    const { title, description, type, filename, status, visibleTo } = req.body
    if (!title || !type || !filename) return res.status(400).json({ error: 'title, type et filename requis' })
    if (!/^[a-zA-Z0-9_\-.]+$/.test(filename) || filename.includes('..')) {
      return res.status(400).json({ error: 'Nom de fichier invalide' })
    }
    const safeData = Object.fromEntries(
      Object.entries({ title, description, type, filename, status, visibleTo }).filter(([, v]) => v !== undefined)
    )
    const resource = await Resource.create({ ...safeData, createdBy: req.user.id })
    res.status(201).json(resource)
  } catch (err) { next(err) }
})

// PATCH /api/resources/:id — Modifier une ressource (admin/hr)
// Utilise save() pour déclencher le hook pre-save (publishedAt automatique)
router.patch('/:id', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Accès refusé' })
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

// GET /api/resources/:id/download — Télécharger le fichier associé à une ressource
router.get('/:id/download', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID invalide' })
    const resource = await Resource.findById(req.params.id).lean()
    if (!resource) return res.status(404).json({ error: 'Ressource introuvable' })
    if (!ADMIN_ROLES.includes(req.user.role)) {
      if (resource.status !== 'published' || !resource.visibleTo.includes(req.user.role)) {
        return res.status(403).json({ error: 'Accès refusé' })
      }
    }
    if (USE_MINIO) {
      const url = await getSignedUrl(resource.filename)
      return res.redirect(url)
    }
    const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads')
    const filePath   = path.resolve(uploadsDir, resource.filename)
    // Prevent directory traversal
    if (!filePath.startsWith(path.resolve(uploadsDir))) {
      return res.status(400).json({ error: 'Chemin invalide' })
    }
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Fichier introuvable sur le serveur' })
    res.download(filePath, resource.filename)
  } catch (err) { next(err) }
})

// POST /api/resources/:id/upload — Uploader le fichier associé à une ressource (admin/hr)
router.post('/:id/upload', async (req, res, next) => {
  if (!ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Accès refusé' })
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message })
    try {
      if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID invalide' })
      const resource = await Resource.findById(req.params.id)
      if (!resource) return res.status(404).json({ error: 'Ressource introuvable' })
      if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' })

      const safeName   = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
      const remoteName = `${req.user.id}/${Date.now()}-${safeName}`
      const result     = await uploadFile(req.file.path, remoteName, req.file.mimetype)

      resource.filename = remoteName
      await resource.save()

      res.status(201).json({ data: result })
    } catch (uploadErr) { next(uploadErr) }
  })
})

// DELETE /api/resources/:id — Supprimer une ressource (admin/hr)
router.delete('/:id', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ error: 'Accès refusé' })
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'ID invalide' })
    const deleted = await Resource.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'Ressource introuvable' })
    res.status(204).end()
  } catch (err) { next(err) }
})

module.exports = router
