'use strict'

// =============================================================================
// services/notificationService.js — Business notification dispatcher
//
// Sends emails based on notification keys defined in config/constants.js.
// Checks user preferences (notificationPrefs) before sending.
//
// Usage:
//   const { notify } = require('./notificationService')
//   await notify('evaluationAssigned', user, { campaignName, evaluatorName })
// =============================================================================

const { sendMail } = require('./mailer')
const { NOTIF_KEYS_BY_ROLE } = require('../config/constants')

// ── Email templates (subject + body) per notification key ────────────────────
const TEMPLATES = {
  campaignLaunch: (data) => ({
    subject: `[NanoXplore RH] Nouvelle campagne : ${data.campaignName || 'Campagne'}`,
    text: `Bonjour ${data.firstName || ''},\n\nUne nouvelle campagne d'évaluation "${data.campaignName}" vient d'être lancée.\nConnectez-vous pour démarrer votre évaluation.\n\nCordialement,\nNanoXplore RH`,
  }),

  evaluationAssigned: (data) => ({
    subject: '[NanoXplore RH] Une évaluation vous a été attribuée',
    text: `Bonjour ${data.firstName || ''},\n\nUne évaluation vous a été attribuée${data.campaignName ? ` dans la campagne "${data.campaignName}"` : ''}.\nConnectez-vous pour la compléter.\n\nCordialement,\nNanoXplore RH`,
  }),

  evaluationSubmitted: (data) => ({
    subject: `[NanoXplore RH] Évaluation soumise par ${data.evaluatorName || 'un collaborateur'}`,
    text: `Bonjour ${data.firstName || ''},\n\n${data.evaluatorName || 'Un collaborateur'} a soumis son évaluation${data.campaignName ? ` pour la campagne "${data.campaignName}"` : ''}.\nVous pouvez la consulter depuis votre espace.\n\nCordialement,\nNanoXplore RH`,
  }),

  deadlineReminder: (data) => ({
    subject: '[NanoXplore RH] Rappel : échéance proche',
    text: `Bonjour ${data.firstName || ''},\n\nVotre évaluation${data.campaignName ? ` ("${data.campaignName}")` : ''} arrive à échéance le ${data.deadline || 'bientôt'}.\nPensez à la compléter avant la date limite.\n\nCordialement,\nNanoXplore RH`,
  }),

  managerActionRequired: (data) => ({
    subject: '[NanoXplore RH] Action requise de votre manager',
    text: `Bonjour ${data.firstName || ''},\n\nUne action de votre manager est requise pour votre évaluation${data.campaignName ? ` ("${data.campaignName}")` : ''}.\n\nCordialement,\nNanoXplore RH`,
  }),

  systemAlerts: (data) => ({
    subject: `[NanoXplore RH] Alerte système : ${data.alertTitle || 'Notification'}`,
    text: `Bonjour ${data.firstName || ''},\n\n${data.alertBody || 'Une alerte système a été déclenchée.'}\n\nCordialement,\nNanoXplore RH`,
  }),
}

/**
 * Send a notification email to a user if their role + preferences allow it.
 *
 * @param {string} key       One of NOTIF_PREF_KEYS (e.g. 'evaluationAssigned')
 * @param {object} user      Mongoose user document (or lean object) with email, role, firstName, notificationPrefs
 * @param {object} data      Template data (campaignName, evaluatorName, etc.)
 * @returns {Promise<boolean>} true if sent, false if skipped
 */
async function notify(key, user, data = {}) {
  if (!user?.email || !key) return false

  // Check if this notification key is relevant for the user's role
  const allowedKeys = NOTIF_KEYS_BY_ROLE[user.role] || []
  if (!allowedKeys.includes(key)) return false

  // Check user preferences (default: enabled if not explicitly disabled)
  const prefs = user.notificationPrefs || {}
  if (prefs[key] === false) return false

  // Build email from template
  const templateFn = TEMPLATES[key]
  if (!templateFn) return false

  const { subject, text, html } = templateFn({ ...data, firstName: user.firstName })

  try {
    await sendMail({ to: user.email, subject, text, html })
    return true
  } catch (err) {
    console.error(`[NotificationService] Failed to send "${key}" to ${user.email}:`, err.message)
    return false
  }
}

/**
 * Send a notification to multiple users at once.
 * @param {string} key
 * @param {Array} users
 * @param {object} data
 * @returns {Promise<number>} Number of emails sent
 */
async function notifyMany(key, users, data = {}) {
  const results = await Promise.allSettled(
    users.map(u => notify(key, u, data)),
  )
  return results.filter(r => r.status === 'fulfilled' && r.value === true).length
}

module.exports = { notify, notifyMany }
