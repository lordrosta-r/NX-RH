'use strict'

// =============================================================================
// services/notificationHelper.js — Création de notifications in-app
//
// Helper non-bloquant : les erreurs sont loggées mais n'interrompent pas
// le handler appelant.
//
// Usage:
//   const { notify } = require('./notificationHelper')
//   notify(userId, 'eval_assigned', 'Évaluation assignée', 'Campagne X', '/evaluations/123')
// =============================================================================

// Chargement différé pour éviter les dépendances circulaires
let _Notification = null
function getModel() {
  if (!_Notification) _Notification = require('../models/Notification')
  return _Notification
}

/**
 * Crée une notification in-app pour un utilisateur.
 * Non-bloquant : ne throw jamais, les erreurs sont loggées silencieusement.
 *
 * @param {string|ObjectId} userId
 * @param {string} type        NOTIFICATION_TYPES
 * @param {string} title       Titre affiché dans l'interface
 * @param {string} [body]      Corps optionnel
 * @param {string|null} [link] Lien de navigation optionnel
 * @param {string} [priority]  'low' | 'medium' | 'high' | 'urgent'
 */
async function notify(userId, type, title, body = '', link = null, priority = 'medium') {
  try {
    const Notification = getModel()
    await Notification.create({ userId, type, title, body, link, priority })
  } catch (err) {
    console.error('[notify] Failed to create notification:', err.message)
  }
}

module.exports = { notify }
