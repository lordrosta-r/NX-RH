'use strict'

// =============================================================================
// /api/auth — Authentification (public — pas de authGuard)
//
// POST /api/auth/login  → vérifie email/password, émet un cookie httpOnly JWT
// POST /api/auth/logout → supprime le cookie
// GET  /api/auth/me     → retourne l'utilisateur courant (depuis le JWT)
// =============================================================================

const router    = require('express').Router()
const rateLimit    = require('express-rate-limit')
const { ipKeyGenerator } = require('express-rate-limit')
const User      = require('../models/User')
const { AuditLog } = require('../models')
const { authGuard } = require('../middleware/authGuard')
const authService = require('../services/authService')
const { filterNotifPrefsByRole } = authService

// ─── Rate limiters — POST /login ─────────────────────────────────────────────
// Deux limiters distincts : un par email (anti brute-force), un par IP (anti spray)

const loginByEmailLimiter = rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            process.env.NODE_ENV === 'test' ? 1000 : 5,
  keyGenerator:   (req) => {
    const raw = req.body?.email
    return `email:${typeof raw === 'string' ? raw.toLowerCase().trim() : 'unknown'}`
  },
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

// POST /api/auth/login — Vérifie les identifiants et émet un cookie httpOnly JWT
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

    const result = await authService.login(email, password, remember)

    if (result.mustChangePassword) {
      return res.status(200).json({
        mustChangePassword: true,
        message: 'Vous devez changer votre mot de passe avant de continuer.',
        userId: result.userId,
      })
    }

    const { user, token, maxAge } = result

    res.cookie('token', token, {
      httpOnly: true,
      secure:   process.env.COOKIE_SECURE !== undefined ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path:     '/',
      maxAge,
    })

    // Mise à jour de lastLoginAt — fire-and-forget, n'échoue jamais le login.
    User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } })
      .catch(err => console.error('[auth] lastLoginAt update failed', err.message))

    AuditLog.create({ action: 'login', userId: user._id, targetId: user._id, targetType: 'User', details: { ip: req.ip } }).catch(console.error)

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
    if (err.loginFailed) {
      AuditLog.create({ action: 'login_failed', details: { email: req.body.email, ip: req.ip } }).catch(console.error)
      return res.status(401).json({ error: err.message })
    }
    next(err)
  }
})

// ─── POST /api/auth/logout ───────────────────────────────────────────────────

// POST /api/auth/logout — Supprime le cookie de session
router.post('/logout', (_req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure:   process.env.COOKIE_SECURE !== undefined ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path:     '/',
  })
  res.json({ message: 'Déconnecté' })
})

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
// Revalide la session et retourne l'utilisateur courant.
// Utilisé par useAuthUser() pour vérifier que le cookie est encore valide.

// GET /api/auth/me — Revalide la session et retourne l'utilisateur courant
router.get('/me', authGuard(), async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('firstName lastName email role department position isActive locale theme notificationPrefs lastLoginAt authSource managerId onboarding createdAt')
      .lean()

    if (!user || !user.isActive) {
      res.clearCookie('token', {
        httpOnly: true,
        secure:   process.env.COOKIE_SECURE !== undefined ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path:     '/',
      })
      return res.status(401).json({ error: 'Session invalide' })
    }

    // Filtre les préférences de notification selon le rôle pour
    // n'envoyer au client que les clés qu'il peut effectivement gérer.
    user.notificationPrefs = filterNotifPrefsByRole(user.notificationPrefs, user.role)

    const { _id, ...rest } = user
    res.json({ id: _id, ...rest })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/auth/preferences ───────────────────────────────
// Met à jour les préférences de l'utilisateur courant (locale / theme / notificationPrefs).
// Whitelist stricte — tout champ inconnu est ignoré ou rejeté.

// PATCH /api/auth/preferences — Met à jour les préférences de l'utilisateur courant
router.patch('/preferences', authGuard(), async (req, res, next) => {
  try {
    const result = await authService.updatePreferences(req.user.id, req.user.role, req.body)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/auth/password ─────────────────────────────────────────────
// Désactivé — la modification du mot de passe est gérée par le LDAP côté SI.

// PATCH /api/auth/password — Désactivé (LDAP-only)
router.patch('/password', authGuard(), (req, res) => {
  return res.status(403).json({ message: 'La modification du mot de passe est gérée par le LDAP.' })
})

// ─── POST /api/auth/forgot-password ─────────────────────────────────────────
// Désactivé — la réinitialisation du mot de passe est gérée par le LDAP côté SI.

router.post('/forgot-password', (req, res) => {
  return res.status(403).json({ message: 'La réinitialisation du mot de passe est gérée par le LDAP.' })
})

// ─── POST /api/auth/reset-password ──────────────────────────────────────────
// Désactivé — la réinitialisation du mot de passe est gérée par le LDAP côté SI.

router.post('/reset-password', (req, res) => {
  return res.status(403).json({ message: 'La réinitialisation du mot de passe est gérée par le LDAP.' })
})

module.exports = router
