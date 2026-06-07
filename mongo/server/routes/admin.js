'use strict'

// =============================================================================
// routes/admin.js — Routes d'administration générale
//
// Toutes les routes sont protégées par authGuard(['admin']) dans index.js.
//
// Email
//   POST  /email/test       — Email de test (retourne la previewUrl Ethereal en dev)
//
// Configuration applicative (modèle Config — store clé/valeur)
//   GET   /config           — Lister toutes les clés de configuration
//   PUT   /config/batch     — Upsert de plusieurs clés en une seule requête
//   GET   /config/:key      — Lire la valeur d'une clé
//   PUT   /config/:key      — Créer ou remplacer une clé (upsert)
//   PATCH /config/:key      — Mettre à jour la valeur d'une clé existante
//   DELETE /config/:key     — Supprimer une clé
// =============================================================================

const express    = require('express')
const nodemailer = require('nodemailer')
const mongoose   = require('mongoose')
const jwt        = require('jsonwebtoken')
const { sendMail, resetTransporter } = require('../services/mailer')
const Config = require('../models/Config')
const { User, Form, AuditLog } = require('../models')
const { mailConfig: mailConfigSchema } = require('../validators/smtpValidators')

const router = express.Router()

// Options de cookie communes (httpOnly, secure selon env).
const cookieBase = () => ({
  httpOnly: true,
  secure:   process.env.COOKIE_SECURE !== undefined ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
  sameSite: 'Strict',
  path:     '/',
})

// POST /api/admin/impersonate/:userId — Démarre une session d'impersonation.
// Émet un jeton DÉDIÉ court (30 min, sans refresh) au nom de la cible, met de
// côté la session admin (cookies adminToken/adminRefresh) pour pouvoir y
// revenir, et neutralise le refresh pendant l'impersonation. Lecture seule
// garantie par le middleware blockImpersonatedWrites.
router.post('/impersonate/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: 'ID invalide' })
    }
    if (userId === req.user.id.toString()) {
      return res.status(400).json({ error: 'Auto-impersonation interdite' })
    }

    const target = await User.findById(userId)
      .select('email firstName lastName role isActive').lean()
    if (!target || !target.isActive) {
      return res.status(404).json({ error: 'Utilisateur introuvable ou inactif' })
    }
    // Anti-escalade latérale : jamais d'impersonation d'un autre admin.
    if (target.role === 'admin') {
      return res.status(403).json({ error: "Impossible d'impersonner un administrateur" })
    }

    const currentAccess  = req.cookies?.accessToken
    const currentRefresh = req.cookies?.refreshToken
    if (!currentAccess) {
      return res.status(401).json({ error: 'Session admin introuvable' })
    }

    const impToken = jwt.sign(
      {
        id: target._id, email: target.email, role: target.role,
        firstName: target.firstName, lastName: target.lastName,
        imp: true, impersonatedBy: req.user.id,
      },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '30m' },
    )

    const base = cookieBase()
    res.cookie('adminToken', currentAccess, { ...base, maxAge: 60 * 60 * 1000 })
    if (currentRefresh) res.cookie('adminRefresh', currentRefresh, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 })
    res.clearCookie('refreshToken', base)
    res.cookie('accessToken', impToken, { ...base, maxAge: 30 * 60 * 1000 })

    AuditLog.create({
      userId: req.user.id, userRole: 'admin', action: 'impersonate_start',
      targetType: 'User', targetId: target._id, meta: { targetRole: target.role },
    }).catch(() => {})

    res.json({
      success: true,
      impersonating: { id: target._id, firstName: target.firstName, lastName: target.lastName, role: target.role },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/setup-status — Gate « State Zero » : indique si les prérequis
// minimaux d'exploitation sont réunis. Sert à afficher une bannière bloquante
// tant que la configuration initiale n'est pas faite.
router.get('/setup-status', async (req, res, next) => {
  try {
    const [hasAdmin, hasManagedUsers, formCount, smtpCfg, adminToChange] = await Promise.all([
      User.exists({ role: 'admin', isActive: true }),
      User.exists({ managerId: { $ne: null }, isActive: true }),
      Form.countDocuments({}),
      Config.findOne({ key: 'smtp.host' }).lean(),
      User.exists({ role: 'admin', isActive: true, mustChangePassword: true }),
    ])
    const smtpConfigured = Boolean(smtpCfg?.value || process.env.MAIL_HOST)

    const checks = {
      hasAdmin:             Boolean(hasAdmin),
      // Le mot de passe admin par défaut doit avoir été changé (1er lancement).
      adminPasswordChanged: !adminToChange,
      hasManagedUsers:      Boolean(hasManagedUsers),
      hasForm:              formCount > 0,
      smtpConfigured,
    }
    const ready = Object.values(checks).every(Boolean)
    res.json({ ready, checks })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/status — Vérification de l'état du système
router.get('/status', async (req, res, next) => {
  try {
    // MongoDB
    const mongoOk = mongoose.connection.readyState === 1

    // SMTP — lire config depuis Config ou process.env, vérifier avec timeout 3s
    let smtpOk = false
    let smtpError
    try {
      const cfgEntries = await Config.find({
        key: { $in: ['smtp.host', 'smtp.port', 'smtp.user', 'smtp.password', 'smtp.secure'] }
      }).lean()
      const cfg = Object.fromEntries(cfgEntries.map(c => [c.key, c.value]))
      const host     = cfg['smtp.host']     || process.env.MAIL_HOST     || ''
      const port     = parseInt(cfg['smtp.port'] || process.env.MAIL_PORT || '587', 10)
      const user     = cfg['smtp.user']     || process.env.MAIL_USER     || ''
      const password = cfg['smtp.password'] || process.env.MAIL_PASSWORD || ''
      const secure   = (cfg['smtp.secure'] !== null && cfg['smtp.secure'] !== undefined) ? Boolean(cfg['smtp.secure']) : (process.env.MAIL_SECURE === 'true' || port === 465)

      if (host) {
        const transport = nodemailer.createTransport({ host, port, secure, auth: user ? { user, pass: password } : undefined })
        await Promise.race([
          transport.verify(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
        ])
        smtpOk = true
      } else {
        smtpError = 'SMTP non configuré'
      }
    } catch (err) {
      smtpError = err.message
    }

    // LDAP — vérifier si la variable d'environnement est définie
    const ldapConfigured = !!(process.env.LDAP_URL && process.env.LDAP_URL.trim())

    res.json({
      mongo:  { ok: mongoOk },
      smtp:   smtpOk ? { ok: true } : { ok: false, error: smtpError },
      ldap:   { configured: ldapConfigured },
      uptime: process.uptime(),
    })
  } catch (err) {
    next(err)
  }
})
router.post('/email/test', async (req, res, next) => {
  const { to } = req.body
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    return res.status(400).json({ error: 'Adresse email invalide' })
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

// ─── Config clé/valeur ────────────────────────────────────────────────────────

// GET /api/admin/config — Lister toutes les clés
router.get('/config', async (req, res, next) => {
  try {
    const configs = await Config.find({}).sort('key').lean()
    res.json(configs)
  } catch (err) {
    next(err)
  }
})

// ─── Configuration SMTP dédiée (page « Configuration e-mail ») ─────────────────
// Lit/écrit les VRAIES clés smtp.* que le mailer consomme (host/port/user/
// password/secure/from), au lieu d'une clé fourre-tout. Doit être déclarée
// AVANT /config/:key pour ne pas être capturée par le param.

// GET /api/admin/config/mail — Réglages SMTP (mot de passe jamais renvoyé en clair)
router.get('/config/mail', async (req, res, next) => {
  try {
    const keys = ['smtp.host', 'smtp.port', 'smtp.user', 'smtp.secure', 'smtp.from', 'smtp.fromName', 'smtp.password']
    const docs = await Config.find({ key: { $in: keys } }).lean()
    const cfg = Object.fromEntries(docs.map(d => [d.key, d.value]))
    res.json({ data: {
      smtpHost:   cfg['smtp.host']     ?? process.env.MAIL_HOST ?? '',
      smtpPort:   Number(cfg['smtp.port'] ?? process.env.MAIL_PORT ?? 587),
      smtpSecure: cfg['smtp.secure'] !== undefined ? Boolean(cfg['smtp.secure']) : (process.env.MAIL_SECURE === 'true'),
      smtpUser:   cfg['smtp.user']     ?? process.env.MAIL_USER ?? '',
      smtpPass:   '',  // jamais exposé ; laisser vide = inchangé au prochain enregistrement
      passwordSet: Boolean(cfg['smtp.password'] || process.env.MAIL_PASSWORD),
      fromEmail:  cfg['smtp.from']     ?? process.env.MAIL_FROM ?? '',
      fromName:   cfg['smtp.fromName'] ?? '',
    } })
  } catch (err) {
    next(err)
  }
})

// PUT /api/admin/config/mail — Enregistre les réglages SMTP + invalide le transporter
router.put('/config/mail', async (req, res, next) => {
  try {
    // Validation Joi : refuse une config invalide avant toute écriture (400 + message clair).
    const { error, value: b } = mailConfigSchema.validate(req.body || {}, {
      abortEarly: false,
      stripUnknown: true,
      convert: true, // smtpPort arrive en string depuis le <input type=number>
    })
    if (error) {
      return res.status(400).json({ error: error.details.map(d => d.message).join(' ; ') })
    }

    // Mot de passe : vide autorisé seulement si une valeur est déjà stockée en base
    // (ou fournie via l'environnement). Sinon, on l'exige.
    if (!b.smtpPass) {
      const existing = await Config.findOne({ key: 'smtp.password' }).lean()
      if (!existing?.value && !process.env.MAIL_PASSWORD) {
        return res.status(400).json({ error: 'Le mot de passe SMTP est requis lors de la première configuration' })
      }
    }

    const ops = []
    const set = (key, value) => ops.push(
      Config.findOneAndUpdate({ key }, { $set: { value } }, { upsert: true })
    )
    if (b.smtpHost   !== undefined) set('smtp.host', String(b.smtpHost).trim())
    if (b.smtpPort   !== undefined) set('smtp.port', parseInt(b.smtpPort, 10) || 587)
    if (b.smtpUser   !== undefined) set('smtp.user', String(b.smtpUser).trim())
    if (b.smtpSecure !== undefined) set('smtp.secure', Boolean(b.smtpSecure))
    if (b.fromEmail  !== undefined) set('smtp.from', String(b.fromEmail).trim())
    if (b.fromName   !== undefined) set('smtp.fromName', String(b.fromName).trim())
    // Mot de passe : mis à jour uniquement s'il est fourni (laisser vide = inchangé)
    if (b.smtpPass) set('smtp.password', String(b.smtpPass))

    await Promise.all(ops)
    resetTransporter()  // les prochains envois utiliseront la nouvelle config
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// PUT /api/admin/config/batch — Upsert de plusieurs clés config en une seule requête
router.put('/config/batch', async (req, res, next) => {
  try {
    const { configs } = req.body
    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({ error: 'configs doit être un tableau non vide de { key, value }' })
    }
    if (configs.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 clés par batch' })
    }
    const invalids = configs.filter(c => !c.key || typeof c.key !== 'string' || !c.key.match(/^[a-z0-9._-]+$/i))
    if (invalids.length > 0) {
      return res.status(400).json({ error: `Clés invalides : ${invalids.map(c => c.key).join(', ')}` })
    }

    const ops = configs.map(({ key, value }) => ({
      updateOne: {
        filter:  { key },
        update:  { $set: { key, value } },
        upsert:  true,
      }
    }))
    await Config.bulkWrite(ops)

    const updated = await Config.find({ key: { $in: configs.map(c => c.key) } }).lean()
    res.json({ updated: updated.length, results: updated })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/config/:key — Lire une clé
router.get('/config/:key', async (req, res, next) => {
  try {
    const entry = await Config.findOne({ key: req.params.key }).lean()
    if (!entry) return res.status(404).json({ error: `Clé introuvable: ${req.params.key}` })
    res.json(entry)
  } catch (err) {
    next(err)
  }
})

// PUT /api/admin/config/:key — Créer ou remplacer (upsert)
router.put('/config/:key', async (req, res, next) => {
  try {
    if (!('value' in req.body)) {
      return res.status(400).json({ error: 'Champ "value" requis' })
    }
    const entry = await Config.findOneAndUpdate(
      { key: req.params.key },
      { key: req.params.key, value: req.body.value },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean()
    res.json(entry)
  } catch (err) {
    next(err)
  }
})

// PATCH /api/admin/config/:key — Mettre à jour la valeur d'une clé existante
router.patch('/config/:key', async (req, res, next) => {
  try {
    if (!('value' in req.body)) {
      return res.status(400).json({ error: 'Champ "value" requis' })
    }
    const entry = await Config.findOneAndUpdate(
      { key: req.params.key },
      { $set: { value: req.body.value } },
      { new: true }
    ).lean()
    if (!entry) return res.status(404).json({ error: `Clé introuvable: ${req.params.key}` })
    res.json(entry)
  } catch (err) {
    next(err)
  }
})

// DELETE /api/admin/config/:key — Supprimer une clé
router.delete('/config/:key', async (req, res, next) => {
  try {
    const result = await Config.deleteOne({ key: req.params.key })
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: `Clé introuvable: ${req.params.key}` })
    }
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

module.exports = router
