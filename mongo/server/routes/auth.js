'use strict'

// =============================================================================
// /api/auth — Authentification (public — pas de authGuard)
//
// POST /api/auth/login  → vérifie email/password, émet un cookie httpOnly JWT
// POST /api/auth/logout → supprime le cookie
// GET  /api/auth/me     → retourne l'utilisateur courant (depuis le JWT)
// =============================================================================

const router    = require('express').Router()
const bcrypt    = require('bcrypt')
const jwt       = require('jsonwebtoken')
const rateLimit    = require('express-rate-limit')
const { ipKeyGenerator } = require('express-rate-limit')
const User      = require('../models/User')
const { authGuard } = require('../middleware/authGuard')
const { LOCALES, THEMES, NOTIF_PREF_KEYS, NOTIF_KEYS_BY_ROLE } = require('../config/constants')

// Renvoie les clés de notifications autorisées pour un rôle.
// Source de vérité unique : NOTIF_KEYS_BY_ROLE dans config/constants.js.
function allowedNotifKeysFor(role) {
  return NOTIF_KEYS_BY_ROLE[role] || NOTIF_KEYS_BY_ROLE.employee
}

// Filtre un objet notificationPrefs pour ne conserver que les clés
// autorisées pour le rôle donné.
function filterNotifPrefsByRole(prefs, role) {
  const allowed = allowedNotifKeysFor(role)
  const out = {}
  for (const k of allowed) {
    if (prefs && Object.prototype.hasOwnProperty.call(prefs, k)) out[k] = !!prefs[k]
  }
  return out
}

// ─── Rate limiters — POST /login ─────────────────────────────────────────────
// Deux limiters distincts : un par email (anti brute-force), un par IP (anti spray)

const loginByEmailLimiter = rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            process.env.NODE_ENV === 'test' ? 1000 : 5,
  keyGenerator:   (req) => `email:${req.body?.email?.toLowerCase() || 'unknown'}`,
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
})

const loginByIPLimiter = rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            process.env.NODE_ENV === 'test' ? 1000 : 20,
  keyGenerator:   (req) => `ip:${ipKeyGenerator(req)}`,
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
})

// ─── POST /api/auth/login ────────────────────────────────────────────────────

router.post('/login', loginByEmailLimiter, loginByIPLimiter, async (req, res, next) => {
  try {
    const { email, password, remember } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' })
    }

    // Vérification de longueur AVANT la regex pour éviter un ReDoS
    if (email.length > 254 || password.length > 128) {
      return res.status(400).json({ error: 'Email invalide' })
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email invalide' })
    }

    // select: false sur passwordHash — on le force ici
    const user = await User.findOne({ email: email.toLowerCase().trim(), isActive: true })
      .select('+passwordHash')
      .lean()

    if (!user || user.authSource !== 'local' || !user.passwordHash) {
      console.warn('[auth] Login failed — user not found or wrong authSource:', email.toLowerCase())
      return res.status(401).json({ error: 'Identifiants invalides' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      console.warn('[auth] Login failed — wrong password for:', email.toLowerCase())
      return res.status(401).json({ error: 'Identifiants invalides' })
    }

    const jwtExpiry = remember ? '30d' : (process.env.JWT_EXPIRES_IN || '8h')
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: jwtExpiry }
    )

    res.cookie('token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path:     '/',
      maxAge:   remember ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000,
    })

    // Mise à jour de lastLoginAt — fire-and-forget, n'échoue jamais le login.
    User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } })
      .catch(err => console.error('[auth] lastLoginAt update failed', err.message))

    res.json({
      user: {
        id:        user._id,
        email:     user.email,
        firstName: user.firstName,
        lastName:  user.lastName,
        role:      user.role,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/auth/logout ───────────────────────────────────────────────────

router.post('/logout', (_req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path:     '/',
  })
  res.json({ message: 'Déconnecté' })
})

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
// Revalide la session et retourne l'utilisateur courant.
// Utilisé par useAuthUser() pour vérifier que le cookie est encore valide.

router.get('/me', authGuard(), async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('firstName lastName email role department position isActive locale theme notificationPrefs lastLoginAt authSource managerId onboarding createdAt')
      .lean()

    if (!user || !user.isActive) {
      res.clearCookie('token', {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path:     '/',
      })
      return res.status(401).json({ error: 'Session invalide' })
    }

    // Filtre les préférences de notification selon le rôle pour
    // n'envoyer au client que les clés qu'il peut effectivement gérer.
    user.notificationPrefs = filterNotifPrefsByRole(user.notificationPrefs, user.role)

    res.json({ id: user._id, ...user })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/auth/preferences ───────────────────────────────
// Met à jour les préférences de l'utilisateur courant (locale / theme / notificationPrefs).
// Whitelist stricte — tout champ inconnu est ignoré ou rejeté.

router.patch('/preferences', authGuard(), async (req, res, next) => {
  try {
    const { locale, theme, notificationPrefs } = req.body || {}
    const updates = {}

    if (locale !== undefined) {
      if (!LOCALES.includes(locale)) {
        return res.status(400).json({ error: `Locale invalide. Valeurs autorisées : ${LOCALES.join(', ')}` })
      }
      updates.locale = locale
    }

    if (theme !== undefined) {
      if (!THEMES.includes(theme)) {
        return res.status(400).json({ error: `Thème invalide. Valeurs autorisées : ${THEMES.join(', ')}` })
      }
      updates.theme = theme
    }

    if (notificationPrefs !== undefined) {
      if (!notificationPrefs || typeof notificationPrefs !== 'object' || Array.isArray(notificationPrefs)) {
        return res.status(400).json({ error: 'notificationPrefs doit être un objet' })
      }
      const allowedForRole = allowedNotifKeysFor(req.user.role)
      const cleaned = {}
      for (const [key, val] of Object.entries(notificationPrefs)) {
        if (!NOTIF_PREF_KEYS.includes(key)) {
          return res.status(400).json({ error: `Clé de notification inconnue : ${key}` })
        }
        if (!allowedForRole.includes(key)) {
          return res.status(403).json({ error: `Clé de notification non autorisée pour votre rôle : ${key}` })
        }
        if (typeof val !== 'boolean') {
          return res.status(400).json({ error: `notificationPrefs.${key} doit être booléen` })
        }
        cleaned[key] = val
      }
      // Merge avec l'existant (ne pas écraser les autres clés)
      const current = await User.findById(req.user.id).select('notificationPrefs').lean()
      updates.notificationPrefs = { ...(current?.notificationPrefs || {}), ...cleaned }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Aucune préférence à mettre à jour' })
    }

    await User.updateOne({ _id: req.user.id }, { $set: updates })
    const fresh = await User.findById(req.user.id)
      .select('locale theme notificationPrefs')
      .lean()
    // Ne renvoyer que les clés autorisées pour le rôle
    fresh.notificationPrefs = filterNotifPrefsByRole(fresh.notificationPrefs, req.user.role)
    res.json(fresh)
  } catch (err) {
    next(err)
  }
})

module.exports = router
