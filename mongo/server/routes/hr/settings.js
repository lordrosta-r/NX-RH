'use strict'

// =============================================================================
// routes/hr/settings.js — Paramètres de campagne RH
//
// GET  /api/hr/settings — Lire les 4 paramètres de campagne
// PUT  /api/hr/settings — Mettre à jour les 4 paramètres de campagne
//
// Rôles autorisés : admin, hr (déclaré dans index.js)
// =============================================================================

const router = require('express').Router()
const Config = require('../../models/Config')

const SETTINGS_KEYS = {
  allow_self_evaluation:      { key: 'campaign.allow_self_evaluation',      default: false },
  require_manager_signature:  { key: 'campaign.require_manager_signature',  default: false },
  send_completion_email:      { key: 'campaign.send_completion_email',       default: true  },
  auto_close_days:            { key: 'campaign.auto_close_days',             default: 0     },
}

// GET /api/hr/settings
router.get('/', async (req, res, next) => {
  try {
    const keys = Object.values(SETTINGS_KEYS).map(s => s.key)
    const entries = await Config.find({ key: { $in: keys } }).lean()
    const byKey = Object.fromEntries(entries.map(e => [e.key, e.value]))

    const result = {}
    for (const [field, { key, default: def }] of Object.entries(SETTINGS_KEYS)) {
      result[field] = key in byKey ? byKey[key] : def
    }

    res.json(result)
  } catch (err) {
    next(err)
  }
})

// PUT /api/hr/settings
router.put('/', async (req, res, next) => {
  try {
    const { allow_self_evaluation, require_manager_signature, send_completion_email, auto_close_days } = req.body

    const updates = [
      { field: 'allow_self_evaluation',     value: allow_self_evaluation },
      { field: 'require_manager_signature', value: require_manager_signature },
      { field: 'send_completion_email',     value: send_completion_email },
      { field: 'auto_close_days',           value: auto_close_days },
    ]

    await Promise.all(
      updates
        .filter(u => u.value !== undefined)
        .map(({ field, value }) => {
          const { key } = SETTINGS_KEYS[field]
          return Config.findOneAndUpdate(
            { key },
            { $set: { value } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          )
        })
    )

    // Return current state after update
    const keys = Object.values(SETTINGS_KEYS).map(s => s.key)
    const entries = await Config.find({ key: { $in: keys } }).lean()
    const byKey = Object.fromEntries(entries.map(e => [e.key, e.value]))

    const result = {}
    for (const [field, { key, default: def }] of Object.entries(SETTINGS_KEYS)) {
      result[field] = key in byKey ? byKey[key] : def
    }

    res.json(result)
  } catch (err) {
    next(err)
  }
})

module.exports = router
