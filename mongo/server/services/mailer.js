'use strict'

// =============================================================================
// services/mailer.js — SMTP transport via Nodemailer
//
// Configuration via environment variables:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
//
// Falls back to a no-op transport when SMTP_HOST is not configured,
// so the app works without a mail server in dev.
// =============================================================================

const nodemailer = require('nodemailer')

const SMTP_HOST = process.env.SMTP_HOST || ''
const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10) || 587
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@nanoxplore.com'

let transporter = null

if (SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  })
  console.log(`[Mailer] SMTP configured → ${SMTP_HOST}:${SMTP_PORT}`)
} else {
  console.log('[Mailer] No SMTP_HOST configured — emails will be logged to console')
}

/**
 * Send an email. Falls back to console.log when no SMTP is configured.
 * @param {{ to: string, subject: string, text?: string, html?: string }} opts
 * @returns {Promise<void>}
 */
async function sendMail({ to, subject, text, html }) {
  if (!to || !subject) return

  if (transporter) {
    await transporter.sendMail({ from: SMTP_FROM, to, subject, text, html })
  } else {
    console.log(`[Mailer] (no-op) To: ${to} | Subject: ${subject}`)
  }
}

module.exports = { sendMail }
