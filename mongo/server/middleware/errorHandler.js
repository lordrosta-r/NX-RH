'use strict'

// =============================================================================
// middleware/errorHandler.js — Gestionnaire d'erreurs centralisé Express
//
// Intercepte toutes les erreurs passées via next(err).
// Normalise les réponses API en { success: false, error, code }.
//
// Erreurs gérées :
//  - Mongoose ValidationError  → 400 VALIDATION_ERROR
//  - Mongoose CastError         → 400 INVALID_ID
//  - MongoDB duplicate key (11000) → 409 DUPLICATE_KEY
//  - JWT TokenExpiredError     → 401 TOKEN_INVALID
//  - JWT JsonWebTokenError     → 401 TOKEN_INVALID
//  - AppError (isOperational)  → err.status + err.code
//  - Toutes les autres         → 500 INTERNAL_ERROR (stack masqué en prod)
// =============================================================================

const jwt      = require('jsonwebtoken')
const AppError = require('../utils/AppError')
const logger   = require('../utils/logger')

 
function errorHandler(err, req, res, _next) {
  // ─── Mongoose ValidationError ─────────────────────────────────────────────
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map(e => e.message)
    return res.status(400).json({
      success: false,
      error: 'Données invalides',
      code: 'VALIDATION_ERROR',
      details,
    })
  }

  // ─── Mongoose CastError ───────────────────────────────────────────────────
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Identifiant invalide',
      code: 'INVALID_ID',
    })
  }

  // ─── MongoDB duplicate key ────────────────────────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'champ'
    return res.status(409).json({
      success: false,
      error: `Cette valeur existe déjà pour le champ "${field}"`,
      code: 'DUPLICATE_KEY',
    })
  }

  // ─── JWT ──────────────────────────────────────────────────────────────────
  if (err instanceof jwt.TokenExpiredError || err instanceof jwt.JsonWebTokenError) {
    return res.status(401).json({
      success: false,
      error: 'Token invalide ou expiré',
      code: 'TOKEN_INVALID',
    })
  }

  // ─── AppError ou erreur avec statut HTTP explicite ────────────────────────
  if (err instanceof AppError || err.isOperational || err.status || err.statusCode) {
    const status = err.status || err.statusCode || 500
    if (status >= 500) logger.error(`Error ${status}`, { error: err.message, stack: err.stack, method: req.method, url: req.url })
    return res.status(status).json({
      success: false,
      error: err.message,
      code: err.code || null,
      ...(err.details && { details: err.details }),
    })
  }

  // ─── Erreur système inattendue ────────────────────────────────────────────
  logger.error('Unexpected error', { error: err.message, stack: err.stack, method: req.method, url: req.url })
  return res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Une erreur interne est survenue'
      : err.message,
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  })
}

module.exports = { errorHandler }
