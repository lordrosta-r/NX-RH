'use strict'

// =============================================================================
// /api/auth — Authentication routes (public — no authGuard)
// =============================================================================

const router  = require('express').Router()
const bcrypt  = require('bcrypt')
const jwt     = require('jsonwebtoken')
const db      = require('../config/db')

// ─── POST /api/auth/login ────────────────────────────────────────────────────

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Fetch user
    const [rows] = await db.query(
      'SELECT id, email, password_hash, first_name, last_name, role, is_active FROM users WHERE email = ?',
      [email]
    )

    const user = rows[0]
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    )

    // Set cookie for browser navigation + return token for fetch calls
    res.cookie('token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   8 * 60 * 60 * 1000, // 8 hours in ms
    })

    res.json({
      token,
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role },
    })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/auth/logout ───────────────────────────────────────────────────

router.post('/logout', (_req, res) => {
  res.clearCookie('token')
  res.json({ message: 'Logged out' })
})

module.exports = router
