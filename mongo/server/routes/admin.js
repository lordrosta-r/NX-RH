'use strict'

// =============================================================================
// routes/admin.js — Routes d'administration générale
//
// Toutes les routes sont protégées par authGuard(['admin']) dans index.js.
//
// Email
//   POST  /email/test       — Email de test (retourne la previewUrl Ethereal en dev)
//
// Configuration applicative (modèle Config — store clé/valeur)
//   GET   /config           — Lister toutes les clés de configuration
//   PUT   /config/batch     — Upsert de plusieurs clés en une seule requête
//   GET   /config/:key      — Lire la valeur d'une clé
//   PUT   /config/:key      — Créer ou remplacer une clé (upsert)
//   PATCH /config/:key      — Mettre à jour la valeur d'une clé existante
//   DELETE /config/:key     — Supprimer une clé
// =============================================================================

const express    = require('express')
const nodemailer = require('nodemailer')
const { sendMail } = require('../services/mailer')
const Config = require('../models/Config')

const router = express.Router()

// POST /api/admin/email/test — Envoie un email de test
router.post('/email/test', async (req, res, next) => {
  const { to } = req.body
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    return res.status(400).json({ error: 'Adresse email invalide' })
  }

  try {
    const info = await sendMail({
      to,
      subject: '[NX-RH] Email de test',
      html: '<p>Ceci est un email de test envoyé depuis l\'interface d\'administration de NanoXplore RH.</p>',
    })
    const previewUrl = info ? (nodemailer.getTestMessageUrl(info) || null) : null
    res.json({ sent: true, previewUrl })
  } catch (err) {
    next(err)
  }
})

// ─── Config clé/valeur ────────────────────────────────────────────────────────

// GET /api/admin/config — Lister toutes les clés
router.get('/config', async (req, res, next) => {
  try {
    const configs = await Config.find({}).sort('key').lean()
    res.json(configs)
  } catch (err) {
    next(err)
  }
})

// PUT /api/admin/config/batch — Upsert de plusieurs clés config en une seule requête
router.put('/config/batch', async (req, res, next) => {
  try {
    const { configs } = req.body
    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({ error: 'configs doit être un tableau non vide de { key, value }' })
    }
    if (configs.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 clés par batch' })
    }
    const invalids = configs.filter(c => !c.key || typeof c.key !== 'string' || !c.key.match(/^[a-z0-9._-]+$/i))
    if (invalids.length > 0) {
      return res.status(400).json({ error: `Clés invalides : ${invalids.map(c => c.key).join(', ')}` })
    }

    const ops = configs.map(({ key, value }) => ({
      updateOne: {
        filter:  { key },
        update:  { $set: { key, value } },
        upsert:  true,
      }
    }))
    await Config.bulkWrite(ops)

    const updated = await Config.find({ key: { $in: configs.map(c => c.key) } }).lean()
    res.json({ updated: updated.length, results: updated })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/config/:key — Lire une clé
router.get('/config/:key', async (req, res, next) => {
  try {
    const entry = await Config.findOne({ key: req.params.key }).lean()
    if (!entry) return res.status(404).json({ error: `Clé introuvable: ${req.params.key}` })
    res.json(entry)
  } catch (err) {
    next(err)
  }
})

// PUT /api/admin/config/:key — Créer ou remplacer (upsert)
router.put('/config/:key', async (req, res, next) => {
  try {
    if (!('value' in req.body)) {
      return res.status(400).json({ error: 'Champ "value" requis' })
    }
    const entry = await Config.findOneAndUpdate(
      { key: req.params.key },
      { key: req.params.key, value: req.body.value },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean()
    res.json(entry)
  } catch (err) {
    next(err)
  }
})

// PATCH /api/admin/config/:key — Mettre à jour la valeur d'une clé existante
router.patch('/config/:key', async (req, res, next) => {
  try {
    if (!('value' in req.body)) {
      return res.status(400).json({ error: 'Champ "value" requis' })
    }
    const entry = await Config.findOneAndUpdate(
      { key: req.params.key },
      { $set: { value: req.body.value } },
      { new: true }
    ).lean()
    if (!entry) return res.status(404).json({ error: `Clé introuvable: ${req.params.key}` })
    res.json(entry)
  } catch (err) {
    next(err)
  }
})

// DELETE /api/admin/config/:key — Supprimer une clé
router.delete('/config/:key', async (req, res, next) => {
  try {
    const result = await Config.deleteOne({ key: req.params.key })
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: `Clé introuvable: ${req.params.key}` })
    }
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

module.exports = router
