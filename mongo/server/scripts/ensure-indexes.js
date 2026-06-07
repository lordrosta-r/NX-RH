'use strict'

// =============================================================================
// scripts/ensure-indexes.js — Synchronise les index MongoDB avec les schémas
//
// Usage :
//   node mongo/server/scripts/ensure-indexes.js
//
// Idempotent : crée les index manquants et supprime les index obsolètes.
// Sûr à lancer sur une base de production car Mongoose utilise des index
// en arrière-plan (background: true implicite).
// =============================================================================

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') })

const mongoose = require('mongoose')
const logger   = require('../utils/logger')

// Import all models to register their schemas in Mongoose
require('../models')

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/nx-rh'

async function ensureIndexes() {
  await mongoose.connect(MONGO_URI)
  const sanitizedUri = MONGO_URI.replace(/\/\/[^@]+@/, '//***@')
  logger.info('[ensure-indexes] Connecté à MongoDB', { uri: sanitizedUri })

  const modelNames = mongoose.modelNames()
  const results    = []

  for (const name of modelNames) {
    const Model = mongoose.model(name)
    try {
      await Model.syncIndexes()
      results.push({ model: name, status: 'ok' })
      logger.info(`[ensure-indexes] ✓ ${name}`)
    } catch (err) {
      results.push({ model: name, status: 'error', error: err.message })
      logger.error(`[ensure-indexes] ✗ ${name}`, { error: err.message })
    }
  }

  await mongoose.disconnect()

  const errors = results.filter(r => r.status === 'error')
  if (errors.length) {
    logger.error('[ensure-indexes] Terminé avec erreurs', { errors })
    process.exit(1)
  } else {
    logger.info('[ensure-indexes] Tous les index sont à jour', {
      models: results.map(r => r.model),
    })
  }
}

ensureIndexes().catch(err => {
  logger.error('[ensure-indexes] Erreur fatale', { error: err.message })
  process.exit(1)
})
