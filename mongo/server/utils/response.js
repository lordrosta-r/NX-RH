'use strict'

// =============================================================================
// Helpers de réponse HTTP normalisés
//
// Toutes les réponses de succès suivent l'enveloppe :
//   - liste paginée : { data: T[], total, page, limit, pages }
//   - item unique   : { data: T }
//   - suppression   : { message }
//   - erreur        : { error, [details] }
// =============================================================================

/**
 * Réponse liste paginée.
 * @example respond.paginated(res, { data: users, total, page, limit })
 */
function paginated(res, { data, total, page = 1, limit = 20 }) {
  return res.json({ data, total, page, limit, pages: Math.ceil(total / limit) })
}

/**
 * Réponse item unique (GET /:id, PATCH /:id, etc.)
 * @example respond.item(res, user)
 */
function item(res, data, statusCode = 200) {
  return res.status(statusCode).json({ data })
}

/**
 * Réponse création — toujours 201 Created.
 * @example respond.created(res, newUser)
 */
function created(res, data) {
  return res.status(201).json({ data })
}

/**
 * Réponse suppression (soft-delete ou hard-delete).
 * @example respond.deleted(res)
 */
function deleted(res, message = 'Deleted successfully') {
  return res.json({ message })
}

/**
 * Réponse erreur normalisée.
 * @example respond.error(res, 404, 'Not found')
 */
function error(res, statusCode, message, details = null) {
  const body = { error: message }
  if (details) body.details = details
  return res.status(statusCode).json(body)
}

module.exports = { paginated, item, created, deleted, error }
