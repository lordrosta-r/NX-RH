'use strict'

// =============================================================================
// utils/apiResponse.js — Envelopes de réponse HTTP standardisées (v1)
//
// Format standard :
//   { success: true, data: any, message?: string, meta?: { total, page, ... } }
//
// Usage :
//   const apiResponse = require('../utils/apiResponse')
//   apiResponse.success(res, users)
//   apiResponse.paginated(res, { data, total, page, limit })
//   apiResponse.created(res, newUser, 'Utilisateur créé')
//   apiResponse.noContent(res)
// =============================================================================

/**
 * Réponse succès générique.
 * @param {import('express').Response} res
 * @param {*} data
 * @param {{ status?: number, message?: string, meta?: object }} [opts]
 */
function success(res, data, { status = 200, message, meta } = {}) {
  const body = { success: true, data }
  if (message) body.message = message
  if (meta)    body.meta    = meta
  return res.status(status).json(body)
}

/**
 * Réponse liste paginée.
 * Les métadonnées de pagination sont dans `meta`.
 * Des champs supplémentaires (ex. unreadCount) peuvent être passés en plus et sont inclus dans meta.
 *
 * @param {import('express').Response} res
 * @param {{ data: any[], total: number, page: number, limit: number, pages?: number }} opts
 */
function paginated(res, { data, total, page, limit, pages, ...extraMeta }) {
  const p  = Number(page)  || 1
  const l  = Number(limit) || 20
  const pg = pages ?? (Math.ceil(total / l) || 1)
  return success(res, data, {
    meta: { total, page: p, limit: l, pages: pg, hasNext: p < pg, hasPrev: p > 1, ...extraMeta },
  })
}

/**
 * Réponse création — toujours 201 Created.
 * @param {import('express').Response} res
 * @param {*} data
 * @param {string} [message]
 */
function created(res, data, message) {
  return success(res, data, { status: 201, message })
}

/**
 * Réponse 204 No Content (suppression, etc.).
 * @param {import('express').Response} res
 */
function noContent(res) {
  return res.status(204).end()
}

module.exports = { success, paginated, created, noContent }
