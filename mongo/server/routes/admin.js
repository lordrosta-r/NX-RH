'use strict'

// =============================================================================
// routes/admin.js — Routes d'administration générale
//
// Toutes les routes sont protégées par authGuard(['admin']) dans index.js.
//
// POST /email/test  — Envoie un email de test et retourne la previewUrl
//                     (Ethereal en dev, null en prod)
// =============================================================================

const express    = require('express')
const nodemailer = require('nodemailer')
const { sendMail } = require('../services/mailer')

const router = express.Router()

// POST /api/admin/email/test
router.post('/email/test', async (req, res, next) => {
  const { to } = req.body
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    return res.status(400).json({ sent: false, error: 'Adresse email invalide' })
  }

  try {
    const info = await sendMail({
      to,
      subject: '[NX-RH] Email de test',
      html: '<p>Ceci est un email de test envoyé depuis l\'interface d\'administration de NanoXplore RH.</p>',
    })
    const previewUrl = info ? (nodemailer.getTestMessageUrl(info) || null) : null
    res.json({ sent: true, previewUrl })
  } catch (err) {
    next(err)
  }
})

module.exports = router
