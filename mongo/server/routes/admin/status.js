'use strict'

// =============================================================================
// routes/admin/status.js — Health check de chaque service
//
// GET /api/admin/status — vérifie MongoDB, SMTP, LDAP
//
// Rôles autorisés : admin (déclaré dans index.js)
// =============================================================================

const express    = require('express')
const router     = express.Router()
const mongoose   = require('mongoose')
const nodemailer = require('nodemailer')

// GET /api/admin/status
router.get('/', async (req, res) => {
  const result = {
    api:    { ok: true },
    mongo:  { ok: false },
    smtp:   { ok: false, error: null },
    ldap:   { configured: false },
    uptime: process.uptime(),
  }

  // Check MongoDB
  try {
    if (mongoose.connection.readyState === 1) {
      result.mongo = { ok: true }
    } else {
      result.mongo = { ok: false, error: 'Not connected (state: ' + mongoose.connection.readyState + ')' }
    }
  } catch (e) {
    result.mongo = { ok: false, error: e.message }
  }

  // Check SMTP
  try {
    if (process.env.SMTP_HOST) {
      const transport = nodemailer.createTransport({
        host:   process.env.SMTP_HOST,
        port:   parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth:   process.env.SMTP_USER ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        } : undefined,
      })
      await transport.verify()
      result.smtp = { ok: true }
    } else {
      result.smtp = { ok: false, error: 'SMTP_HOST not configured' }
    }
  } catch (e) {
    result.smtp = { ok: false, error: e.message }
  }

  // Check LDAP config
  result.ldap = {
    configured: !!(process.env.LDAP_URL && process.env.LDAP_BASE_DN),
  }

  res.json(result)
})

module.exports = router
