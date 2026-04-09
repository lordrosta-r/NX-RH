'use strict'

// =============================================================================
// Mail Service — Nodemailer transport
//
// Supports any SMTP-compatible provider:
//   - Corporate SMTP relay (Exchange, Postfix…)
//   - Gmail / Microsoft 365
//   - Mailgun, SendGrid, Brevo (via SMTP)
//   - Mailtrap (development — catches all outgoing mail)
//
// Required env vars (see .env.example):
//   MAIL_HOST=smtp.yourcompany.com
//   MAIL_PORT=587
//   MAIL_SECURE=false           ← true for port 465 (SMTPS), false for STARTTLS
//   MAIL_USER=notifications@nanoxplore.com
//   MAIL_PASSWORD=...
//   MAIL_FROM="NanoXplore RH <notifications@nanoxplore.com>"
//
// Usage (from any route or service):
//   const mailer = require('../services/mailer')
//   await mailer.sendMail({ to, subject, html })
// =============================================================================

const nodemailer = require('nodemailer')

// ── Transport ─────────────────────────────────────────────────────────────

/**
 * Creates and returns a nodemailer transporter configured from env vars.
 * The transporter is lazy-created (not at module load time) so missing env
 * vars don't crash the server on startup in dev without mail configured.
 */
function createTransport() {
  return nodemailer.createTransport({
    host:   process.env.MAIL_HOST,
    port:   parseInt(process.env.MAIL_PORT || '587', 10),
    secure: process.env.MAIL_SECURE === 'true',  // true = SMTPS (465), false = STARTTLS
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
    // Useful for corporate SMTP with self-signed certs:
    // tls: { rejectUnauthorized: false }
  })
}

// Singleton transport (reused across calls)
let _transport = null
function getTransport() {
  if (!_transport) _transport = createTransport()
  return _transport
}

// ── Core send function ────────────────────────────────────────────────────

/**
 * Send an email.
 *
 * @param {object} options
 * @param {string|string[]} options.to       - Recipient(s)
 * @param {string}          options.subject  - Subject line
 * @param {string}          [options.html]   - HTML body
 * @param {string}          [options.text]   - Plain-text fallback
 * @param {string}          [options.from]   - Override sender (default: MAIL_FROM env)
 * @returns {Promise<nodemailer.SentMessageInfo>}
 */
async function sendMail({ to, subject, html, text, from }) {
  const transport = getTransport()

  const info = await transport.sendMail({
    from:    from || process.env.MAIL_FROM || process.env.MAIL_USER,
    to,
    subject,
    html,
    text,
  })

  console.log(`[Mail] Sent → ${to} | ${subject} | id: ${info.messageId}`)
  return info
}

// ── Verify connectivity (called at startup) ───────────────────────────────

/**
 * Verifies SMTP connectivity. Logs result — does not throw.
 * Call this in server/index.js startup sequence.
 */
async function testMailConnection() {
  try {
    await getTransport().verify()
    console.log('[Mail] SMTP connection verified ✓')
  } catch (err) {
    console.warn('[Mail] SMTP connection failed:', err.message)
    console.warn('[Mail] Emails will not be delivered until SMTP is configured.')
  }
}

// ── Stub helpers — implement as needed ───────────────────────────────────
// These are intentional stubs. Business logic belongs in route handlers.

/**
 * TODO: Send campaign launch notification to all participants.
 * @param {object} campaign
 * @param {object[]} recipients
 */
async function sendCampaignLaunchEmail(campaign, recipients) {
  // TODO: build HTML template, loop recipients, call sendMail()
  throw new Error('sendCampaignLaunchEmail not yet implemented')
}

/**
 * TODO: Send evaluation reminder to an employee.
 * @param {object} evaluation
 * @param {object} employee
 */
async function sendEvaluationReminderEmail(evaluation, employee) {
  // TODO: build HTML template, call sendMail()
  throw new Error('sendEvaluationReminderEmail not yet implemented')
}

module.exports = {
  sendMail,
  testMailConnection,
  sendCampaignLaunchEmail,
  sendEvaluationReminderEmail,
}
