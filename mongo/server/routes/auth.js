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

// ─── Rate limiter — POST /login ──────────────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            process.env.NODE_ENV === 'test' ? 1000 : 10,
  keyGenerator:   (req) => req.body?.email?.toLowerCase() || ipKeyGenerator(req),
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
})

// ─── POST /api/auth/login ────────────────────────────────────────────────────

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password, remember } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' })
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email) || email.length > 254) {
      return res.status(400).json({ error: 'Email invalide' })
    }

    // select: false sur passwordHash — on le force ici
    const user = await User.findOne({ email: email.toLowerCase().trim(), isActive: true })
      .select('+passwordHash')
      .lean()

    if (!user || user.authSource !== 'local' || !user.passwordHash) {
      return res.status(401).json({ error: 'Identifiants invalides' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
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
  res.clearCookie('token', { path: '/' })
  res.json({ message: 'Déconnecté' })
})

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
// Revalide la session et retourne l'utilisateur courant.
// Utilisé par useAuthUser() pour vérifier que le cookie est encore valide.

router.get('/me', authGuard(), async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('firstName lastName email role department position isActive')
      .lean()

    if (!user || !user.isActive) {
      res.clearCookie('token', { path: '/' })
      return res.status(401).json({ error: 'Session invalide' })
    }

    res.json({ id: user._id, ...user })
  } catch (err) {
    next(err)
  }
})

module.exports = router
