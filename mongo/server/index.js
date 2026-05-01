'use strict'

// =============================================================================
// NanoXplore RH — Express Server (SPA Gateway + API) — MongoDB
//
// Responsibilities:
//   1. Serve compiled React SPA (static assets from /public)
//   2. SPA fallback: all non-API GET routes → index.html (React Router handles routing)
//   3. Mount API route modules under /api/*
// =============================================================================

require('dotenv').config()

const express      = require('express')
const path         = require('path')
const cookieParser = require('cookie-parser')
const cors         = require('cors')
const helmet       = require('helmet')
const rateLimit    = require('express-rate-limit')

const { connect }       = require('./config/db')
const { authGuard }     = require('./middleware/authGuard')
const { errorHandler }  = require('./middleware/errorHandler')

const authRoutes        = require('./routes/auth')
const eventRoutes       = require('./routes/events')
const resourceRoutes    = require('./routes/resources')
const userRoutes        = require('./routes/users')
const campaignRoutes    = require('./routes/campaigns')
const formRoutes        = require('./routes/forms')
const evaluationRoutes  = require('./routes/evaluations')
const analyticsRoutes   = require('./routes/analytics')
const ldapRoutes        = require('./routes/ldap')
const adminRoutes       = require('./routes/admin')
const auditRoutes       = require('./routes/audit')
const offboardingRoutes = require('./routes/offboarding')

// ─── App setup ───────────────────────────────────────────────────────────────

const app  = express()
app.set('trust proxy', 1)
const PORT = process.env.PORT || 3000

const PUBLIC_DIR = path.join(__dirname, 'public')


// ─── Global middleware ───────────────────────────────────────────────────────

const rawOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
if (rawOrigin === '*') throw new Error('CORS wildcard interdit en production')
const allowedOrigins = rawOrigin.split(',').map(o => o.trim())
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(null, false) // origine inconnue : pas de headers CORS, mais pas de 500
  },
  credentials: true,
}))
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:              ["'self'"],
      // Hashes are computed dynamically at startup from the built index.html
      scriptSrc:               ["'self'"],
      styleSrc:                ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:                 ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:                  ["'self'", 'data:', 'https://images.unsplash.com', 'https://lh3.googleusercontent.com'],
      connectSrc:              ["'self'"],
      frameAncestors:          ["'none'"],
      // Only force HTTPS upgrades in production — breaks local HTTP dev/test otherwise
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    }
  },
  // Nginx already sends X-Frame-Options: DENY — align helmet to avoid conflicting headers
  frameguard: { action: 'deny' },
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true }
    : false,
}))
app.use((_req, res, next) => {
  // X-Frame-Options géré par Helmet (frameguard) — pas redéfini ici
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
})
app.use(express.json({ limit: '100kb' }))
app.use(express.urlencoded({ extended: false, limit: '100kb' }))
app.use(cookieParser())
// Redirect /page.html → /page (strip .html extension)
app.use((req, res, next) => {
  if (req.path.endsWith('.html')) {
    const clean = req.path.slice(0, -5) || '/'
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
    return res.redirect(301, clean + qs)
  }
  next()
})

app.use(express.static(PUBLIC_DIR, { extensions: [] }))

// ─── Health check ────────────────────────────────────────────────────────────

app.get('/api/health', async (_req, res) => {
  const mongoose = require('mongoose')
  const ok = mongoose.connection.readyState === 1
  if (ok) {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  } else {
    res.status(503).json({ status: 'error', reason: 'database unreachable' })
  }
})

// ─── SPA Page Routes ─────────────────────────────────────────────────────────
// All non-API GET requests are served index.html.
// React Router (client-side) handles routing + auth redirects via ProtectedRoute.
// index.html must never be cached — its asset filenames change on every build.

app.get('/dashboard', (_req, res) => res.redirect(301, '/employee'))

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next()
  res.set('Cache-Control', 'no-store')
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'))
})

// ─── API Routes ──────────────────────────────────────────────────────────────

const authenticated = authGuard(['admin', 'director', 'manager', 'employee', 'hr'])

// Rate limiters API
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 2000, standardHeaders: true, legacyHeaders: false })
const mutationLimiter = rateLimit({ windowMs: 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false })

app.use('/api/', apiLimiter)

app.use('/api/auth',        authRoutes)
app.use('/api/users',       mutationLimiter, authenticated, userRoutes)
app.use('/api/campaigns',   mutationLimiter, authenticated, campaignRoutes)
app.use('/api/forms',       mutationLimiter, authenticated, formRoutes)
app.use('/api/evaluations/bulk', mutationLimiter)
app.use('/api/evaluations', authenticated, evaluationRoutes)
app.use('/api/analytics',   apiLimiter, authenticated, analyticsRoutes)
app.use('/api/events',      mutationLimiter, authenticated, eventRoutes)
app.use('/api/resources',   mutationLimiter, authenticated, resourceRoutes)
app.use('/api/admin/ldap',  mutationLimiter, authGuard(['admin']), ldapRoutes)
// ⚠️ /api/admin/audit MUST be declared before /api/admin to prevent
//    authGuard(['admin']) from blocking HR users on the more-specific path.
app.use('/api/admin/audit', apiLimiter, authGuard(['admin', 'hr']), auditRoutes)
app.use('/api/admin',      mutationLimiter, authGuard(['admin']), adminRoutes)
app.use('/api/offboarding', mutationLimiter, authenticated, offboardingRoutes)

// ─── 404 Fallback ────────────────────────────────────────────────────────────

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' })
  }
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'))
})

// ─── Global error handler ────────────────────────────────────────────────────

app.use(errorHandler)

// ─── Start ───────────────────────────────────────────────────────────────────

async function start() {
  const required = ['JWT_SECRET', 'MONGO_URI']
  for (const v of required) {
    if (!process.env[v]) {
      console.error(`[Startup] Variable d'environnement manquante: ${v}`)
      process.exit(1)
    }
  }
  if (process.env.JWT_SECRET.length < 32) {
    console.error('[Startup] JWT_SECRET trop courte (minimum 32 caractères)')
    process.exit(1)
  }

  await connect()
  require('./services/scheduler').start()
  app.listen(PORT, () => {
    console.log(`NanoXplore RH (MongoDB) → http://localhost:${PORT}`)
  })
}

start()
