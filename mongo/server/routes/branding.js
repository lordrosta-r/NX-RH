'use strict'

// =============================================================================
// routes/branding.js — Logo de l'entreprise (personnalisable par l'admin)
//   GET  /api/branding   → { logo } (tous les rôles, pour l'afficher en nav)
//   PUT  /api/branding   → définir le logo (admin uniquement)
// Le logo est stocké en Config (data URL base64), pas de fichier statique à servir.
// =============================================================================

const router = require('express').Router()
const Config = require('../models/Config')

const KEY = 'branding.logo'
const MAX_LEN = 700 * 1024 // ~500 Ko d'image (base64 ≈ +33 %)
const DATA_URL = /^data:image\/(png|jpe?g|svg\+xml|webp|gif);base64,[A-Za-z0-9+/=]+$/

router.get('/', async (req, res, next) => {
  try {
    const c = await Config.findOne({ key: KEY }).lean()
    res.json({ logo: c?.value || null })
  } catch (err) { next(err) }
})

router.put('/', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Réservé aux administrateurs' })
    }
    const { logo } = req.body
    if (logo === null) {
      await Config.findOneAndUpdate({ key: KEY }, { $set: { value: null } }, { upsert: true })
      return res.json({ logo: null })
    }
    if (typeof logo !== 'string' || !DATA_URL.test(logo)) {
      return res.status(400).json({ error: 'Logo invalide (image en data URL base64 attendue)' })
    }
    if (logo.length > MAX_LEN) {
      return res.status(400).json({ error: 'Logo trop volumineux (max ~500 Ko)' })
    }
    await Config.findOneAndUpdate({ key: KEY }, { $set: { value: logo } }, { upsert: true })
    res.json({ logo })
  } catch (err) { next(err) }
})

module.exports = router
