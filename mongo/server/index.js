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

const logger       = require('./utils/logger')
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
const hrNotifRoutes     = require('./routes/hr/notifications')
const orgRoutes         = require('./routes/org')
const userImportRoutes  = require('./routes/users/import')
const formImportRoutes  = require('./routes/forms/importExport')
const hrFlagsRoutes     = require('./routes/hr/flags')
const mailTemplateRoutes = require('./routes/admin/mailTemplates')
const notificationsRouter = require('./routes/notifications')
const dashboardRouter     = require('./routes/dashboard')
const hrSettingsRoutes    = require('./routes/hr/settings')
const groupsRoutes        = require('./routes/admin/groups')
const adminStatusRoutes   = require('./routes/admin/status')
const adminEnvCheckRoutes = require('./routes/admin/envCheck')
const userBulkRoutes          = require('./routes/users/bulk')
const evaluationBulkRoutes    = require('./routes/evaluations/bulk')
const searchRoutes        = require('./routes/search')
const mobilityRoutes      = require('./routes/mobility')

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
const mongoSanitize = require('express-mongo-sanitize')
app.use(mongoSanitize())
app.use(express.urlencoded({ extended: false, limit: '100kb' }))
app.use(cookieParser())

// ─── HTTP request logging ─────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info('HTTP', {
      method:   req.method,
      path:     req.path,
      status:   res.statusCode,
      duration: `${duration}ms`,
      ip:       req.ip,
    })
  })
  next()
})
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

// ⚠️ /api/users/import et /api/users/bulk AVANT /api/users (évite capture par la route paramétrée)
app.use('/api/users/import', mutationLimiter, authGuard(['admin', 'hr']), userImportRoutes)
app.use('/api/users/bulk',   mutationLimiter, authGuard(['admin', 'hr']), userBulkRoutes)
app.use('/api/users',       mutationLimiter, authenticated, userRoutes)
app.use('/api/campaigns',   mutationLimiter, authenticated, campaignRoutes)
// ⚠️ /api/forms/template et /api/forms/import AVANT /api/forms (routes spécifiques d'abord)
app.use('/api/forms/template',   mutationLimiter, authGuard(['admin', 'hr']), formImportRoutes)
app.use('/api/forms/import',     mutationLimiter, authGuard(['admin', 'hr']), formImportRoutes)
app.use('/api/forms/:id/export', mutationLimiter, authGuard(['admin', 'hr']), formImportRoutes)
app.use('/api/forms',       mutationLimiter, authenticated, formRoutes)
app.use('/api/evaluations/bulk', mutationLimiter, authGuard(['admin', 'hr']), evaluationBulkRoutes)
app.use('/api/evaluations', authenticated, evaluationRoutes)
app.use('/api/analytics',   apiLimiter, authenticated, analyticsRoutes)
app.use('/api/events',      mutationLimiter, authenticated, eventRoutes)
app.use('/api/resources',   mutationLimiter, authenticated, resourceRoutes)
app.use('/api/admin/ldap',  mutationLimiter, authGuard(['admin']), ldapRoutes)
// ⚠️ Routes /api/admin/* spécifiques AVANT /api/admin (catch-all admin-only)
//    pour éviter que authGuard(['admin']) bloque les utilisateurs HR.
app.use('/api/admin/audit',          apiLimiter,      authGuard(['admin', 'hr']), auditRoutes)
app.use('/api/admin/mail-templates', mutationLimiter, authGuard(['admin', 'hr']), mailTemplateRoutes)
app.use('/api/admin/groups',     mutationLimiter, authGuard(['admin', 'hr']),  groupsRoutes)
app.use('/api/admin/status',     apiLimiter,      authGuard(['admin']),          adminStatusRoutes)
app.use('/api/admin/env-check',  apiLimiter,      authGuard(['admin']),          adminEnvCheckRoutes)
app.use('/api/admin',            mutationLimiter, authGuard(['admin']),          adminRoutes)
app.use('/api/offboarding', mutationLimiter, authenticated, offboardingRoutes)
app.use('/api/hr/notifications', mutationLimiter, authGuard(['admin', 'hr']), hrNotifRoutes)
// hr/flags : authGuard inline par route (POST accessible aux employees/managers)
app.use('/api/hr/flags',         mutationLimiter, hrFlagsRoutes)
app.use('/api/hr/settings',      apiLimiter,      authGuard(['admin', 'hr']), hrSettingsRoutes)
app.use('/api/org',              mutationLimiter, authGuard(['admin', 'hr', 'manager', 'director']), orgRoutes)
app.use('/api/notifications',    apiLimiter, authenticated, notificationsRouter)
app.use('/api/dashboard',        apiLimiter, authenticated, dashboardRouter)
app.use('/api/search',           apiLimiter, authGuard(['admin', 'hr', 'manager', 'employee']), searchRoutes)
app.use('/api/mobility',         mutationLimiter, authenticated, mobilityRoutes)

// ─── 404 Fallback ────────────────────────────────────────────────────────────

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' })
  }
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'))
})

// ─── Global error handler ────────────────────────────────────────────────────

app.use(errorHandler)

// ─── Process-level error handlers ────────────────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  logger.error('UnhandledRejection — Promesse non gérée', { reason: String(reason) })
})

process.on('uncaughtException', (err) => {
  logger.error('UncaughtException — Erreur fatale', { error: err.message, stack: err.stack })
  process.exit(1)
})

// ─── Start ───────────────────────────────────────────────────────────────────

async function start() {
  const required = ['JWT_SECRET', 'MONGO_URI']
  for (const v of required) {
    if (!process.env[v]) {
      logger.error(`Variable d'environnement manquante: ${v}`)
      process.exit(1)
    }
  }
  if (process.env.JWT_SECRET.length < 32) {
    logger.error('JWT_SECRET trop courte (minimum 32 caractères)')
    process.exit(1)
  }

  await connect()
  require('./services/scheduler').start()
  app.listen(PORT, () => {
    logger.info('NanoXplore RH démarré', { port: PORT, url: `http://localhost:${PORT}` })
  })
}

start()
