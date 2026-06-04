'use strict'

// =============================================================================
// /api/auth — Authentification (public — pas de authGuard)
//
// POST /api/auth/login  → vérifie email/password, émet un cookie httpOnly JWT
// POST /api/auth/logout → supprime le cookie
// GET  /api/auth/me     → retourne l'utilisateur courant (depuis le JWT)
// =============================================================================

const router    = require('express').Router()
const Joi       = require('joi')
const rateLimit    = require('express-rate-limit')
const { ipKeyGenerator } = require('express-rate-limit')
const User      = require('../models/User')
const { AuditLog } = require('../models')
const { authGuard } = require('../middleware/authGuard')
const authService = require('../services/authService')
const { filterNotifPrefsByRole } = authService
const respond = require('../utils/response')
const logger  = require('../utils/logger')

// ─── Rate limiters — POST /login ─────────────────────────────────────────────
// Deux limiters distincts : un par email (anti brute-force), un par IP (anti spray)
// E2E_MODE=true ou NODE_ENV=test → limites très élevées pour les tests automatisés

const isTestEnv = process.env.NODE_ENV === 'test' || process.env.E2E_MODE === 'true'

const loginByEmailLimiter = rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            isTestEnv ? 1000 : 5,
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
  max:            isTestEnv ? 1000 : 20,
  keyGenerator:   (req) => `ip:${ipKeyGenerator(req)}`,
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
})

// ─── POST /api/auth/login ────────────────────────────────────────────────────

const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).max(254).required().messages({
    'string.email': 'Email invalide',
    'any.required': 'Email requis',
  }),
  password: Joi.string().min(6).max(128).required().messages({
    'string.min': 'Mot de passe trop court',
    'any.required': 'Mot de passe requis',
  }),
  remember: Joi.boolean(),
})

// POST /api/auth/login — Vérifie les identifiants et émet deux cookies httpOnly JWT
router.post('/login', loginByEmailLimiter, loginByIPLimiter, async (req, res, next) => {
  try {
    const { error } = loginSchema.validate(req.body, { abortEarly: false })
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: error.details.map(d => ({ field: d.path[0], message: d.message })),
      })
    }

    const { email, password, remember } = req.body

    const result = await authService.login(email, password, remember)

    if (result.mustChangePassword) {
      return res.status(200).json({
        mustChangePassword: true,
        message: 'Vous devez changer votre mot de passe avant de continuer.',
        userId: result.userId,
      })
    }

    const { user, accessToken, refreshToken } = result
    const cookieBase = {
      httpOnly: true,
      secure:   process.env.COOKIE_SECURE !== undefined ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path:     '/',
    }

    res.cookie('accessToken', accessToken, { ...cookieBase, maxAge: 60 * 60 * 1000 })
    res.cookie('refreshToken', refreshToken, { ...cookieBase, maxAge: 7 * 24 * 60 * 60 * 1000 })

    // Mise à jour de lastLoginAt — fire-and-forget, n'échoue jamais le login.
    User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } })
      .catch(err => logger.error('[auth] lastLoginAt update failed', { error: err.message }))

    AuditLog.create({ action: 'login', userId: user._id, targetId: user._id, targetType: 'User', details: { ip: req.ip } }).catch(err => logger.error('[auth] AuditLog create failed', { error: err.message }))

    respond.item(res, {
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
      // Audit best-effort : seulement si l'échec porte sur un compte connu
      // (authService attache auditUserId). Email inconnu → uniquement dans les logs.
      if (err.auditUserId) {
        AuditLog.create({
          userId:     err.auditUserId,
          userRole:   err.auditUserRole,
          action:     'login_failed',
          targetType: 'User',
          targetId:   err.auditUserId,
          meta:       { email: req.body.email, ip: req.ip },
        }).catch(e => logger.error('[auth] AuditLog login_failed', { error: e.message }))
      }
      return res.status(401).json({ error: err.message })
    }
    next(err)
  }
})

// ─── POST /api/auth/logout ───────────────────────────────────────────────────

// POST /api/auth/logout — Révoque le refresh token (allowlist) et supprime les cookies
router.post('/logout', async (req, res) => {
  // Révocation serveur du refresh token pour qu'il ne puisse plus être rejoué
  // via /refresh. Best-effort : ne bloque jamais la déconnexion côté client.
  await authService.revokeRefreshToken(req.cookies?.refreshToken)

  const cookieBase = {
    httpOnly: true,
    secure:   process.env.COOKIE_SECURE !== undefined ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path:     '/',
  }
  res.clearCookie('accessToken', cookieBase)
  res.clearCookie('refreshToken', cookieBase)
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

    if (!user) {
      const cookieBase = { httpOnly: true, secure: process.env.COOKIE_SECURE !== undefined ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production', sameSite: 'Strict', path: '/' }
      res.clearCookie('accessToken', cookieBase)
      res.clearCookie('refreshToken', cookieBase)
      return res.status(401).json({ success: false, error: 'Session invalide', code: 'SESSION_INVALID' })
    }
    if (!user.isActive) {
      const cookieBase = { httpOnly: true, secure: process.env.COOKIE_SECURE !== undefined ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production', sameSite: 'Strict', path: '/' }
      res.clearCookie('accessToken', cookieBase)
      res.clearCookie('refreshToken', cookieBase)
      return res.status(401).json({ success: false, error: 'Compte désactivé', code: 'ACCOUNT_DISABLED' })
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

// ─── POST /api/auth/refresh ──────────────────────────────────────────────────
// Émet un nouveau couple accessToken / refreshToken à partir du refreshToken courant.

router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken
    if (!refreshToken) {
      return res.status(401).json({ success: false, error: 'Refresh token manquant' })
    }
    const { accessToken, refreshToken: newRefreshToken } = await authService.refreshAccessToken(refreshToken)
    const cookieBase = {
      httpOnly: true,
      secure:   process.env.COOKIE_SECURE !== undefined ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path:     '/',
    }
    res.cookie('accessToken', accessToken, { ...cookieBase, maxAge: 60 * 60 * 1000 })
    res.cookie('refreshToken', newRefreshToken, { ...cookieBase, maxAge: 7 * 24 * 60 * 60 * 1000 })
    res.json({ success: true, message: 'Token rafraîchi' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
