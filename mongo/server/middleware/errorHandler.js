'use strict'

// =============================================================================
// middleware/errorHandler.js — Gestionnaire d'erreurs centralisé Express
//
// Intercepte toutes les erreurs passées via next(err).
// Normalise les réponses API en { error: message }.
//
// Erreurs gérées :
//  - Mongoose ValidationError → 400
//  - Mongoose CastError        → 400 (ObjectId malformé)
//  - MongoDB duplicate key (11000) → 409
//  - JWT TokenExpiredError    → 401
//  - JWT JsonWebTokenError    → 401
//  - Erreurs métier (err.status) → err.status
//  - Toutes les autres        → 500 (message masqué en prod)
// =============================================================================

const jwt = require('jsonwebtoken')

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  let status  = err.status || err.statusCode || 500
  let message = err.message || 'Internal server error'

  // ─── Mongoose ─────────────────────────────────────────────────────────────
  if (err.name === 'ValidationError') {
    status = 400
    // Extraire tous les messages de validation Mongoose
    message = Object.values(err.errors || {}).map(e => e.message).join(', ') || message
  }

  if (err.name === 'CastError') {
    status  = 400
    message = `Valeur invalide pour le champ "${err.path}"`
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    status = 409
    const field = Object.keys(err.keyValue || {}).join(', ')
    message = field ? `Doublon détecté : ${field}` : 'Ressource déjà existante'
  }

  // ─── JWT ──────────────────────────────────────────────────────────────────
  if (err instanceof jwt.TokenExpiredError) {
    status  = 401
    message = 'Session expirée'
  } else if (err instanceof jwt.JsonWebTokenError) {
    status  = 401
    message = 'Token invalide'
  }

  // ─── Masquer les détails 500 en production ────────────────────────────────
  if (status === 500 && process.env.NODE_ENV === 'production') {
    console.error('[Error 500]', err)
    message = 'Internal server error'
  } else {
    console.error(`[Error ${status}]`, err.message)
  }

  res.status(status).json({ error: message })
}

module.exports = { errorHandler }
