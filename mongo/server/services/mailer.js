'use strict'

// =============================================================================
// services/mailer.js — SMTP transport via Nodemailer
//
// Configuration priority: MongoDB Config model > environment variables
//   smtp.host / MAIL_HOST, smtp.port / MAIL_PORT,
//   smtp.user / MAIL_USER, smtp.password / MAIL_PASSWORD,
//   smtp.from / MAIL_FROM, smtp.secure / MAIL_SECURE
//
// Falls back to an Ethereal (ethereal.email) test account when no host is
// configured — emails are intercepted and viewable without a real SMTP
// server. Preview URL is logged per message.
// =============================================================================

const nodemailer = require('nodemailer')
const logger     = require('../utils/logger')

let _mailFrom    = process.env.MAIL_FROM || 'noreply@nanoxplore.com'
let _transporter = null
let _initPromise  = null

async function _initTransporter() {
  // Lire la config depuis MongoDB si disponible, sinon fallback env
  let host     = process.env.MAIL_HOST     || ''
  let port     = parseInt(process.env.MAIL_PORT, 10) || 587
  let user     = process.env.MAIL_USER     || ''
  let password = process.env.MAIL_PASSWORD || ''
  let secure   = process.env.MAIL_SECURE === 'true' || port === 465

  try {
    const Config = require('../models/Config')
    const cfgKeys = await Config.find({
      key: { $in: ['smtp.host', 'smtp.port', 'smtp.user', 'smtp.password', 'smtp.secure', 'smtp.from'] }
    }).lean()
    const cfg = Object.fromEntries(cfgKeys.map(c => [c.key, c.value]))
    if (cfg['smtp.host'])     host     = cfg['smtp.host']
    if (cfg['smtp.port'])     port     = parseInt(cfg['smtp.port'], 10) || port
    if (cfg['smtp.user'])     user     = cfg['smtp.user']
    if (cfg['smtp.password']) password = cfg['smtp.password']
    if (cfg['smtp.from'])     _mailFrom = cfg['smtp.from']
    if (cfg['smtp.secure'] !== undefined) secure = cfg['smtp.secure'] === true || cfg['smtp.secure'] === 'true'
  } catch (e) {
    // MongoDB pas encore connecté (ex: démarrage) — fallback env silencieux
  }

  if (host) {
    _transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass: password } : undefined,
    })
    logger.info('[Mailer] SMTP configuré', { host, port })
  } else {
    const testAccount = await nodemailer.createTestAccount()
    _transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass },
    })
    logger.info('[Mailer] Dev mode — Ethereal test account ready')
  }

  return _transporter
}

function getTransporter() {
  if (_transporter) return Promise.resolve(_transporter)
  if (!_initPromise) _initPromise = _initTransporter()
  return _initPromise
}

// Invalide le transporter en cache pour qu'il soit recréé avec la config SMTP
// à jour (appelé après une modification des réglages SMTP en base).
function resetTransporter() {
  _transporter = null
  _initPromise = null
}

/**
 * Send an email.
 * @param {{ to: string, subject: string, text?: string, html?: string }} opts
 * @returns {Promise<object|null>} nodemailer info object, or null if skipped
 */
async function sendMail({ to, subject, text, html }) {
  if (!to || !subject) return null

  const transport = await getTransporter()
  const info = await transport.sendMail({ from: _mailFrom, to, subject, text, html })

  const previewUrl = nodemailer.getTestMessageUrl(info)
  if (previewUrl) logger.debug('[Mailer] Preview URL', { url: previewUrl })

  return info
}

module.exports = { sendMail, resetTransporter }
