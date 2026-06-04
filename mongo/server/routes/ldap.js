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
const { getSources, saveSources, stripSecrets } = require('../services/ldapSources')
const Config = require('../models/Config')

// Retourne le bindPassword stocké (pour test/preview/sync sans re-saisie)
async function resolveBindPassword(incoming) {
  if (incoming.bindPassword) return incoming.bindPassword
  const stored = await Config.findOne({ key: 'ldap' }).lean()
  return stored?.value?.bindPassword || ''
}

// Résout la config à utiliser : par sourceId (multi-source) ou config inline (legacy).
async function resolveConfig(req) {
  if (req.body.sourceId) {
    const sources = await getSources()
    const src = sources.find(s => s.id === req.body.sourceId)
    if (!src) { const e = new Error('Source LDAP introuvable'); e.status = 404; throw e }
    return src
  }
  const config = { ...(req.body.config || {}) }
  config.bindPassword = await resolveBindPassword(config)
  return config
}

// ─── Test connexion ───────────────────────────────────────────────────────────

// POST /api/admin/ldap/test — Teste la connexion LDAP (config inline ou sourceId)
router.post('/test', async (req, res, next) => {
  try {
    const config = await resolveConfig(req)
    const result = await testConnection(config)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// ─── Prévisualisation ─────────────────────────────────────────────────────────

// POST /api/admin/ldap/preview — Liste les utilisateurs LDAP (config inline ou sourceId)
router.post('/preview', async (req, res, next) => {
  try {
    const config = await resolveConfig(req)
    const users = await previewUsers(config)
    res.json({ users })
  } catch (err) {
    next(err)
  }
})

// ─── Synchronisation ─────────────────────────────────────────────────────────

// POST /api/admin/ldap/sync — Synchronise les utilisateurs LDAP (config inline ou sourceId)
router.post('/sync', async (req, res, next) => {
  try {
    const config = await resolveConfig(req)
    const report = await syncUsers(config)
    res.json(report)
  } catch (err) {
    next(err)
  }
})

// ─── Sources multi-annuaires ───────────────────────────────────────────────────

// GET /api/admin/ldap/sources — Liste les sources LDAP configurées (sans bindPassword)
router.get('/sources', async (req, res, next) => {
  try {
    const sources = await getSources()
    res.json({ sources: stripSecrets(sources) })
  } catch (err) {
    next(err)
  }
})

// PUT /api/admin/ldap/sources — Sauvegarde la liste des sources (préserve les mots de passe)
router.put('/sources', async (req, res, next) => {
  try {
    const incoming = Array.isArray(req.body.sources) ? req.body.sources : []
    const saved = await saveSources(incoming)
    res.json({ sources: saved })
  } catch (err) {
    next(err)
  }
})

// ─── Lecture config ───────────────────────────────────────────────────────────

// GET /api/admin/ldap/config — Récupère la configuration LDAP sauvegardée (sans bindPassword)
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

// PUT /api/admin/ldap/config — Sauvegarde la configuration LDAP
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
