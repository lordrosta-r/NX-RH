// =============================================================================
// config/db.js — Connexion MongoDB via Mongoose
// Lit MONGO_URI depuis les variables d'environnement.
// Gestion du graceful shutdown pour éviter les connexions perdues.
// =============================================================================

const mongoose = require('mongoose')
const logger   = require('../utils/logger')

const MONGO_URI = process.env.MONGO_URI

if (!MONGO_URI) {
  logger.error('[DB] MONGO_URI manquante — vérifiez votre fichier .env')
  process.exit(1)
}

// Options Mongoose — on garde le minimum nécessaire
const OPTIONS = {
  serverSelectionTimeoutMS: 5000,  // échoue vite en dev si Mongo est down
  socketTimeoutMS: 45000,
}

async function connect() {
  try {
    await mongoose.connect(MONGO_URI, OPTIONS)
    logger.info('[DB] Connecté à MongoDB')
  } catch (err) {
    logger.error('[DB] Connexion échouée', { error: err.message })
    process.exit(1)
  }
}

// Libère la connexion proprement à l'arrêt du process (SIGINT = Ctrl+C, SIGTERM = Docker stop)
function gracefulShutdown(signal) {
  mongoose.connection.close()
    .then(() => {
      logger.info('[DB] Connexion fermée', { signal })
      process.exit(0)
    })
    .catch(() => process.exit(1))
}

process.on('SIGINT',  () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

module.exports = { connect }
