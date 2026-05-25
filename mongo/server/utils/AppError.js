'use strict'

/**
 * Erreur applicative structurée.
 * Permet de distinguer les erreurs "métier" des erreurs système.
 */
class AppError extends Error {
  constructor(message, status = 500, code = null) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code // ex: 'EMAIL_TAKEN', 'NOT_FOUND', 'UNAUTHORIZED'
    this.isOperational = true // distingue des erreurs système inattendues
    Error.captureStackTrace(this, this.constructor)
  }

  static badRequest(message, code = 'BAD_REQUEST') {
    return new AppError(message, 400, code)
  }

  static unauthorized(message = 'Non autorisé', code = 'UNAUTHORIZED') {
    return new AppError(message, 401, code)
  }

  static forbidden(message = 'Accès refusé', code = 'FORBIDDEN') {
    return new AppError(message, 403, code)
  }

  static notFound(message = 'Ressource introuvable', code = 'NOT_FOUND') {
    return new AppError(message, 404, code)
  }

  static conflict(message, code = 'CONFLICT') {
    return new AppError(message, 409, code)
  }

  static internal(message = 'Erreur serveur', code = 'INTERNAL_ERROR') {
    return new AppError(message, 500, code)
  }
}

module.exports = AppError
