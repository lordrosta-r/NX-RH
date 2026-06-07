'use strict'

// =============================================================================
// services/mailNotificationService.js — Business email notification dispatcher
//
// Sends emails based on notification keys defined in config/constants.js.
// Checks user preferences (notificationPrefs) before sending.
//
// Usage:
//   const { notify } = require('./mailNotificationService')
//   await notify('evaluationAssigned', user, { campaignName, evaluatorName })
// =============================================================================

const { sendMail }    = require('./mailer')
const logger          = require('../utils/logger')
const { NOTIF_KEYS_BY_ROLE } = require('../config/constants')
// MailTemplate chargé dynamiquement pour éviter les dépendances circulaires au démarrage
let _MailTemplate = null
function getMailTemplate() {
  if (!_MailTemplate) _MailTemplate = require('../models').MailTemplate
  return _MailTemplate
}

// Valeurs de repli par variable de template — évite d'envoyer un champ vide
// quand une donnée manque. À étendre selon les besoins métier.
const TEMPLATE_VAR_DEFAULTS = Object.freeze({
  firstName:     'Bonjour',
  campaignName:  'votre campagne',
  evaluatorName: 'un collaborateur',
  deadline:      'la date communiquée',
  alertTitle:    'Notification',
})

// Interpole {{var}} : valeur fournie → repli déclaré → '' (jamais le littéral
// {{var}}). Loggue toute variable résolue à vide pour faciliter le diagnostic.
function interpolateTemplate(str, vars, ctx = {}) {
  if (!str) return ''
  return String(str).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => {
    const v = vars[k]
    if (v !== undefined && v !== null && v !== '') return String(v)
    if (Object.prototype.hasOwnProperty.call(TEMPLATE_VAR_DEFAULTS, k)) {
      return TEMPLATE_VAR_DEFAULTS[k]
    }
    logger.warn('[NotificationService] variable de template vide', { variable: k, ...ctx })
    return ''
  })
}

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

  bulkReminder: (data) => ({
    subject: `[NanoXplore RH] Rappel : évaluation en attente${data.campaignName ? ` — ${data.campaignName}` : ''}`,
    text: [
      `Bonjour ${data.firstName || ''},`,
      '',
      `Votre évaluation${data.campaignName ? ` dans la campagne "${data.campaignName}"` : ''} est toujours en attente de complétion.`,
      ...(data.message ? ['', data.message] : []),
      '',
      'Merci de vous connecter pour la finaliser.',
      '',
      'Cordialement,',
      'NanoXplore RH',
    ].join('\n'),
  }),

  request_treated: (data) => ({
    subject: '[NanoXplore RH] Votre demande a été traitée',
    text: `Bonjour ${data.firstName || ''},\n\nVotre demande "${data.formTitle || 'votre demande'}" a été examinée par les RH.\n\nCordialement,\nNanoXplore RH`,
  }),

  request_rejected: (data) => ({
    subject: '[NanoXplore RH] Votre demande n\'a pas été retenue',
    text: `Bonjour ${data.firstName || ''},\n\nVotre demande "${data.formTitle || 'votre demande'}" n'a pas été retenue.${data.note ? `\nMotif : ${data.note}` : ''}\n\nCordialement,\nNanoXplore RH`,
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
async function notify(key, user, data = {}, _dbTemplate = undefined) {
  if (!user?.email || !key) return false

  // Check if this notification key is relevant for the user's role
  const allowedKeys = NOTIF_KEYS_BY_ROLE[user.role] || []
  if (!allowedKeys.includes(key)) return false

  // Check user preferences (default: enabled if not explicitly disabled)
  const prefs = user.notificationPrefs || {}
  if (prefs[key] === false) return false

  const templateFn = TEMPLATES[key]
  if (!templateFn) return false

  // Tentative DB-first : charger le template depuis MongoDB (ou utiliser le pré-chargé)
  let resolvedTemplate = _dbTemplate
  if (resolvedTemplate === undefined) {
    try {
      const MailTemplate = getMailTemplate()
      resolvedTemplate = await MailTemplate.findOne({ slug: key }).lean()
    } catch (_e) {
      resolvedTemplate = null
    }
  }

  if (resolvedTemplate) {
    try {
      const interpolate = (str, v) => interpolateTemplate(str, v, { key })
      const vars = { ...data, firstName: user.firstName }
      const interpolated = {
        subject: interpolate(resolvedTemplate.subject,                           vars),
        text:    interpolate(resolvedTemplate.bodyText,                          vars),
        html:    interpolate(resolvedTemplate.bodyHtml || resolvedTemplate.bodyText, vars),
      }
      await sendMail({ to: user.email, ...interpolated })
      return true
    } catch (_e) {
      // Fallback silencieux vers le template hardcodé
    }
  }

  // Fallback : template hardcodé
  const { subject, text, html } = templateFn({ ...data, firstName: user.firstName })

  try {
    await sendMail({ to: user.email, subject, text, html })
    return true
  } catch (err) {
    logger.error('[NotificationService] Failed to send notification', { key, email: user.email, error: err.message })
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
  // Pre-fetch the template once instead of once per user
  let dbTemplate = null
  try {
    const MailTemplate = getMailTemplate()
    dbTemplate = await MailTemplate.findOne({ slug: key }).lean()
  } catch (_e) { /* fallback to hardcoded template */ }

  const results = await Promise.allSettled(
    users.map(u => notify(key, u, data, dbTemplate)),
  )
  return results.filter(r => r.status === 'fulfilled' && r.value === true).length
}

/**
 * Send a transactional email to a user by ID, bypassing role/pref checks.
 * Used for password reset, welcome emails, etc.
 *
 * @param {string|ObjectId} userId
 * @param {string}          key    Template slug (e.g. 'password_reset')
 * @param {object}          data   Template variables
 * @returns {Promise<boolean>}
 */
async function sendToUser(userId, key, data = {}) {
  const User = require('../models/User')
  const user = await User.findById(userId).select('email firstName').lean()
  if (!user?.email) return false

  const interpolate = (str, v) => interpolateTemplate(str, v, { key })
  const vars = { ...data, firstName: user.firstName }

  // DB-template first
  try {
    const MailTemplate = getMailTemplate()
    const dbTemplate   = await MailTemplate.findOne({ slug: key }).lean()
    if (dbTemplate) {
      await sendMail({
        to:      user.email,
        subject: interpolate(dbTemplate.subject, vars),
        text:    interpolate(dbTemplate.bodyText, vars),
        html:    interpolate(dbTemplate.bodyHtml || dbTemplate.bodyText, vars),
      })
      return true
    }
  } catch (_e) { /* fallback */ }

  // Fallback to hardcoded template if one exists
  const templateFn = TEMPLATES[key]
  if (!templateFn) return false
  try {
    const { subject, text, html } = templateFn(vars)
    await sendMail({ to: user.email, subject, text, html })
    return true
  } catch (err) {
    logger.error('[NotificationService] sendToUser failed', { key, email: user.email, error: err.message })
    return false
  }
}

module.exports = { notify, notifyMany, sendToUser, TEMPLATES }
