'use strict'

// =============================================================================
// routes/ldap.js — API LDAP admin
//
// Toutes les routes nécessitent le rôle 'admin' (appliqué dans index.js).
//
// POST /api/admin/ldap/test    → teste la connexion LDAP
// POST /api/admin/ldap/preview → liste les utilisateurs LDAP (max 50)
// POST /api/admin/ldap/sync    → synchronise les utilisateurs LDAP → MongoDB
// GET  /api/admin/ldap/config  → récupère la config sauvegardée (sans bindPassword)
// PUT  /api/admin/ldap/config  → sauvegarde la config LDAP
// =============================================================================

const router = require('express').Router()
const { testConnection, previewUsers, syncUsers } = require('../services/ldapService')
const Config = require('../models/Config')

// Retourne le bindPassword stocké (pour test/preview/sync sans re-saisie)
async function resolveBindPassword(incoming) {
  if (incoming.bindPassword) return incoming.bindPassword
  const stored = await Config.findOne({ key: 'ldap' }).lean()
  return stored?.value?.bindPassword || ''
}

// ─── Test connexion ───────────────────────────────────────────────────────────

router.post('/test', async (req, res, next) => {
  try {
    const config = { ...(req.body.config || {}) }
    config.bindPassword = await resolveBindPassword(config)
    const result = await testConnection(config)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// ─── Prévisualisation ─────────────────────────────────────────────────────────

router.post('/preview', async (req, res, next) => {
  try {
    const config = { ...(req.body.config || {}) }
    config.bindPassword = await resolveBindPassword(config)
    const users = await previewUsers(config)
    res.json({ users })
  } catch (err) {
    next(err)
  }
})

// ─── Synchronisation ─────────────────────────────────────────────────────────

router.post('/sync', async (req, res, next) => {
  try {
    const config = { ...(req.body.config || {}) }
    config.bindPassword = await resolveBindPassword(config)
    const report = await syncUsers(config)
    res.json(report)
  } catch (err) {
    next(err)
  }
})

// ─── Lecture config ───────────────────────────────────────────────────────────

router.get('/config', async (req, res, next) => {
  try {
    const doc = await Config.findOne({ key: 'ldap' }).lean()
    const raw = doc?.value || {}
    // Ne jamais retourner le bindPassword
    const { bindPassword: _bp, ...safeConfig } = raw
    res.json({ config: safeConfig })
  } catch (err) {
    next(err)
  }
})

// ─── Sauvegarde config ────────────────────────────────────────────────────────

router.put('/config', async (req, res, next) => {
  try {
    const incoming = req.body.config || {}

    // Préserver le bindPassword existant si non fourni
    const existing    = await Config.findOne({ key: 'ldap' }).lean()
    const existingPwd = existing?.value?.bindPassword || ''
    const toSave      = {
      ...incoming,
      bindPassword: incoming.bindPassword || existingPwd,
    }

    await Config.findOneAndUpdate(
      { key: 'ldap' },
      { $set: { value: toSave } },
      { upsert: true, new: true },
    )

    const { bindPassword: _bp, ...safeConfig } = toSave
    res.json({ config: safeConfig })
  } catch (err) {
    next(err)
  }
})

module.exports = router
