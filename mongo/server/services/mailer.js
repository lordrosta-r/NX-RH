'use strict'

// =============================================================================
// services/mailer.js — SMTP transport via Nodemailer
//
// Configuration via environment variables:
//   MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASSWORD, MAIL_FROM, MAIL_SECURE
//
// Falls back to an Ethereal (ethereal.email) test account when MAIL_HOST is
// not configured — emails are intercepted and viewable without a real SMTP
// server. Preview URL is logged per message.
// =============================================================================

const nodemailer = require('nodemailer')

const MAIL_FROM = process.env.MAIL_FROM || 'noreply@nanoxplore.com'

let _transporter = null
let _initPromise  = null

async function _initTransporter() {
  const host     = process.env.MAIL_HOST     || ''
  const port     = parseInt(process.env.MAIL_PORT, 10) || 587
  const user     = process.env.MAIL_USER     || ''
  const password = process.env.MAIL_PASSWORD || ''
  const secure   = process.env.MAIL_SECURE === 'true' || port === 465

  if (host) {
    _transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass: password } : undefined,
    })
    console.log(`[Mailer] SMTP configured → ${host}:${port}`)
  } else {
    const testAccount = await nodemailer.createTestAccount()
    _transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass },
    })
    console.log('[Mailer] Dev mode — Ethereal test account ready. Preview URLs logged per message.')
  }

  return _transporter
}

function getTransporter() {
  if (_transporter) return Promise.resolve(_transporter)
  if (!_initPromise) _initPromise = _initTransporter()
  return _initPromise
}

/**
 * Send an email.
 * @param {{ to: string, subject: string, text?: string, html?: string }} opts
 * @returns {Promise<object|null>} nodemailer info object, or null if skipped
 */
async function sendMail({ to, subject, text, html }) {
  if (!to || !subject) return null

  const transport = await getTransporter()
  const info = await transport.sendMail({ from: MAIL_FROM, to, subject, text, html })

  const previewUrl = nodemailer.getTestMessageUrl(info)
  if (previewUrl) console.log(`[Mailer] Preview: ${previewUrl}`)

  return info
}

module.exports = { sendMail }
