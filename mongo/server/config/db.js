// =============================================================================
// config/db.js — Connexion MongoDB via Mongoose
// Lit MONGO_URI depuis les variables d'environnement.
// Pool configurable via env, événements de reconnexion, timeouts robustes.
// Le graceful shutdown est géré dans index.js (ferme d'abord le serveur HTTP).
// =============================================================================

const mongoose = require('mongoose')
const logger   = require('../utils/logger')

const MONGO_URI = process.env.MONGO_URI

if (!MONGO_URI) {
  logger.error('[DB] MONGO_URI manquante — vérifiez votre fichier .env')
  process.exit(1)
}

const OPTIONS = {
  maxPoolSize:              parseInt(process.env.MONGODB_MAX_POOL || '10'),
  minPoolSize:              parseInt(process.env.MONGODB_MIN_POOL || '2'),
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS:          45000,
  connectTimeoutMS:         10000,
  heartbeatFrequencyMS:     10000,
}

async function connect() {
  try {
    await mongoose.connect(MONGO_URI, OPTIONS)
    logger.info('[DB] MongoDB connected', { pool: OPTIONS.maxPoolSize })

    mongoose.connection.on('error', (err) => {
      logger.error('[DB] Connection error:', { message: err.message })
    })

    mongoose.connection.on('disconnected', () => {
      logger.warn('[DB] MongoDB disconnected — retrying...')
    })
  } catch (err) {
    logger.error('[DB] Failed to connect', { error: err.message })
    process.exit(1)
  }
}

module.exports = { connect }
