'use strict'

// =============================================================================
// middleware/impersonationGuard.js — Lecture seule sous impersonation
//
// Une session d'impersonation (claim `imp: true` dans l'accessToken) est
// STRICTEMENT en lecture seule : toute méthode mutante est refusée (403),
// SAUF la sortie d'impersonation (/auth/impersonate/stop).
//
// Le middleware décode le cookie indépendamment de authGuard pour s'exécuter
// globalement, avant les routeurs.
// =============================================================================

const jwt = require('jsonwebtoken')

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function blockImpersonatedWrites(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next()
  // La sortie d'impersonation est la seule écriture autorisée.
  if (req.originalUrl.includes('/auth/impersonate/stop')) return next()

  const token = req.cookies?.accessToken
  if (!token) return next()

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
  } catch {
    return next()  // token invalide/expiré → authGuard tranchera plus loin
  }

  if (payload?.imp === true) {
    // Trace l'écriture bloquée (best-effort, jamais bloquant).
    try {
      const { AuditLog } = require('../models')
      AuditLog.create({
        userId:     payload.impersonatedBy,
        userRole:   'admin',
        action:     'impersonate_write_blocked',
        targetType: 'User',
        targetId:   payload.id,
        meta:       { method: req.method, path: req.originalUrl },
      }).catch(() => {})
    } catch { /* ignore */ }

    return res.status(403).json({
      error: "Action en écriture interdite pendant l'impersonation (lecture seule).",
    })
  }

  next()
}

module.exports = { blockImpersonatedWrites }
