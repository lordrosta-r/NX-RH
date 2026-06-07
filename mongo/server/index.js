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
const os           = require('os')
const mongoose     = require('mongoose')
const cookieParser = require('cookie-parser')
const cors         = require('cors')
const helmet       = require('helmet')
const rateLimit    = require('express-rate-limit')

const { connect }           = require('./config/db')
const { authGuard }         = require('./middleware/authGuard')
const { errorHandler }      = require('./middleware/errorHandler')
const { metricsMiddleware } = require('./middleware/metricsMiddleware')

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
const adminSslRoutes      = require('./routes/admin/sslCert')
const adminEnvCheckRoutes = require('./routes/admin/envCheck')
const userBulkRoutes          = require('./routes/users/bulk')
const evaluationBulkRoutes    = require('./routes/evaluations/bulk')
const searchRoutes        = require('./routes/search')
const mobilityRoutes      = require('./routes/mobility')
const pdiRoutes           = require('./routes/pdi')
const interviewRoutes     = require('./routes/interviews')

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
      // 'unsafe-inline' conservé pour styleSrc : Tailwind v4 et certains
      // composants/libs (transitions, styles calculés via style={{}}) injectent
      // des styles inline au runtime. Le retirer imposerait une nonce CSP
      // régénérée par requête et propagée à React — surcoût non justifié ici.
      // Risque résiduel faible : pas de scriptSrc 'unsafe-inline' (vecteur XSS
      // principal), et frameAncestors 'none' + X-Content-Type-Options limitent l'impact.
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
  // X-XSS-Protection retiré (M10) : header déprécié, absent de helmet v7 par défaut.
  // Sur IE/Edge legacy il peut introduire des vecteurs XSS ; la CSP couvre ce risque.
  xXssProtection: false,
}))
app.use((_req, res, next) => {
  // X-Frame-Options géré par Helmet (frameguard) — pas redéfini ici
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  // Helmet v7 ne pose plus Permissions-Policy : on désactive les API sensibles
  // (utile en accès direct à l'API, sans le reverse-proxy nginx).
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()')
  next()
})
app.use(express.json({ limit: '100kb' }))
const mongoSanitize = require('express-mongo-sanitize')
app.use(mongoSanitize())
app.use(express.urlencoded({ extended: false, limit: '100kb' }))
app.use(cookieParser())
app.use(metricsMiddleware)

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
// Route publique : répond uniquement { status } pour ne pas exposer de
// métadonnées système (version, mémoire, pool DB…) aux attaquants (M9).
// Le HEALTHCHECK Docker teste cette route → doit rester 200 quand DB est up.

app.get('/api/health', async (_req, res) => {
  const dbState = require('mongoose').connection.readyState
  const ok      = dbState === 1
  return res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'degraded' })
})

// Route détaillée réservée aux administrateurs (M9).
// Contient toutes les métriques internes : version, mémoire, pool MongoDB,
// locks scheduler, cache — informations utiles pour le monitoring interne
// mais trop révélatrices pour une exposition publique.
app.get('/api/health/detail', authGuard(['admin']), async (_req, res) => {
  const mongoose            = require('mongoose')
  const cache               = require('./utils/cache')
  const { getMetrics }      = require('./utils/metrics')
  const SchedulerLock       = require('./models/SchedulerLock')
  const { INSTANCE_ID }     = require('./utils/schedulerLock')

  const dbState  = mongoose.connection.readyState
  const dbStatus = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }[dbState] || 'unknown'
  const ok       = dbState === 1

  let activeLocks = []
  if (ok) {
    try {
      activeLocks = await SchedulerLock.find({ expiresAt: { $gt: new Date() } })
        .select('jobName lockedBy lockedAt expiresAt')
        .lean()
    } catch (_) { /* non-blocking */ }
  }

  let poolStats
  try {
    const admin        = mongoose.connection.db.admin()
    const serverStatus = await admin.serverStatus()
    poolStats = {
      current:   serverStatus.connections?.current,
      available: serverStatus.connections?.available,
    }
  } catch {
    poolStats = { error: 'unavailable' }
  }

  const mem = process.memoryUsage()
  res.json({
    status:      ok ? 'ok' : 'degraded',
    version:     process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    instanceId:  INSTANCE_ID,
    uptime:      Math.round(process.uptime()),
    memory: {
      heapUsed:  Math.round(mem.heapUsed  / 1024 / 1024) + 'MB',
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB',
      rss:       Math.round(mem.rss       / 1024 / 1024) + 'MB',
    },
    database: {
      status: dbStatus,
      pool:   poolStats,
    },
    scheduler: { activeLocks },
    metrics:   getMetrics(),
    cache:     { size: cache.size() },
  })
})

// ─── Metrics (admin/hr) ──────────────────────────────────────────────────────

app.get('/api/metrics', authGuard(['admin', 'hr']), (_req, res) => {
  const { getMetrics } = require('./utils/metrics')
  res.json({
    ...getMetrics(),
    timestamp:  new Date().toISOString(),
    instanceId: process.env.HOSTNAME || os.hostname(),
  })
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

const authenticated = authGuard(['admin', 'manager', 'employee', 'hr'])

// Rate limiters API
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 2000, standardHeaders: true, legacyHeaders: false })
const mutationLimiter = rateLimit({ windowMs: 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false })

app.use('/api/', apiLimiter)

// Lecture seule sous impersonation : refuse toute écriture (sauf sortie).
const { blockImpersonatedWrites } = require('./middleware/impersonationGuard')
app.use('/api/', blockImpersonatedWrites)

// ─── v1 Router — all versioned routes ────────────────────────────────────────
// Mounted at /api/v1 (current) and /api (backward-compat alias).
// Both prefixes reach the same handlers; clients can migrate at their own pace.

const v1Router = require('express').Router()

v1Router.use('/auth', authRoutes)

// ⚠️ /users/import et /users/bulk AVANT /users (évite capture par la route paramétrée)
v1Router.use('/users/import', mutationLimiter, authGuard(['admin', 'hr']), userImportRoutes)
v1Router.use('/users/bulk',   mutationLimiter, authGuard(['admin', 'hr']), userBulkRoutes)
v1Router.use('/users',       mutationLimiter, authenticated, userRoutes)
v1Router.use('/campaigns',   mutationLimiter, authenticated, campaignRoutes)
// ⚠️ /forms/template et /forms/import AVANT /forms (routes spécifiques d'abord)
v1Router.use('/forms/template',   mutationLimiter, authGuard(['admin', 'hr']), formImportRoutes)
v1Router.use('/forms/import',     mutationLimiter, authGuard(['admin', 'hr']), formImportRoutes)
v1Router.use('/forms/:id/export', mutationLimiter, authGuard(['admin', 'hr']), formImportRoutes)
v1Router.use('/forms',       mutationLimiter, authenticated, formRoutes)
v1Router.use('/evaluations/bulk', mutationLimiter, authGuard(['admin', 'hr']), evaluationBulkRoutes)
v1Router.use('/evaluations', authenticated, evaluationRoutes)
v1Router.use('/analytics',   apiLimiter, authenticated, analyticsRoutes)
v1Router.use('/events',      mutationLimiter, authenticated, eventRoutes)
v1Router.use('/resources',   mutationLimiter, authenticated, resourceRoutes)
v1Router.use('/admin/ldap',  mutationLimiter, authGuard(['admin']), ldapRoutes)
v1Router.use('/admin/ssl',   mutationLimiter, authGuard(['admin']), adminSslRoutes)
// ⚠️ Routes /admin/* spécifiques AVANT /admin (catch-all admin-only)
//    pour éviter que authGuard(['admin']) bloque les utilisateurs HR.
v1Router.use('/admin/audit',          apiLimiter,      authGuard(['admin', 'hr']), auditRoutes)
v1Router.use('/admin/mail-templates', mutationLimiter, authGuard(['admin', 'hr']), mailTemplateRoutes)
v1Router.use('/admin/groups',     mutationLimiter, authGuard(['admin', 'hr']),  groupsRoutes)
v1Router.use('/admin/status',     apiLimiter,      authGuard(['admin']),          adminStatusRoutes)
v1Router.use('/admin/env-check',  apiLimiter,      authGuard(['admin']),          adminEnvCheckRoutes)
v1Router.use('/admin',            mutationLimiter, authGuard(['admin']),          adminRoutes)
v1Router.use('/offboarding', mutationLimiter, authenticated, offboardingRoutes)
v1Router.use('/hr/notifications', mutationLimiter, authGuard(['admin', 'hr']), hrNotifRoutes)
// hr/flags : authGuard inline par route (POST accessible aux employees/managers)
v1Router.use('/hr/flags',         mutationLimiter, hrFlagsRoutes)
v1Router.use('/hr/settings',      apiLimiter,      authGuard(['admin', 'hr']), hrSettingsRoutes)
v1Router.use('/org',              mutationLimiter, authGuard(['admin', 'hr', 'manager']), orgRoutes)
v1Router.use('/notifications',    apiLimiter, authenticated, notificationsRouter)
v1Router.use('/dashboard',        apiLimiter, authenticated, dashboardRouter)
v1Router.use('/search',           apiLimiter, authGuard(['admin', 'hr', 'manager', 'employee']), searchRoutes)
v1Router.use('/mobility',         mutationLimiter, authenticated, mobilityRoutes)
v1Router.use('/pdi',              mutationLimiter, authenticated, pdiRoutes)
v1Router.use('/interviews',       apiLimiter,      authenticated, interviewRoutes)
v1Router.use('/departments',      mutationLimiter, authenticated, require('./routes/departments'))
v1Router.use('/form-categories',  mutationLimiter, authenticated, require('./routes/formCategories'))

// Mount v1 at versioned path + legacy /api/ alias (backward compat)
app.use('/api/v1', v1Router)
app.use('/api',    v1Router)

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

let server

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

  // ── Garde-fous PRODUCTION : refuser de démarrer avec une config dangereuse ──
  if (process.env.NODE_ENV === 'production') {
    const fatal = []
    const secret = process.env.JWT_SECRET
    if (/dev|changeme|secret_key|not_for_production|example|placeholder/i.test(secret)) {
      fatal.push('JWT_SECRET ressemble à une valeur par défaut/dev — générez un secret aléatoire (≥64 car.)')
    }
    if (process.env.E2E_MODE === 'true') {
      fatal.push('E2E_MODE=true désactive le rate-limit de login — interdit en production')
    }
    if (/:changeme@|password=changeme/i.test(process.env.MONGO_URI || '')) {
      fatal.push('MONGO_URI utilise le mot de passe par défaut « changeme »')
    }
    // C3 — le secret de refresh doit être indépendant (pas dérivé de JWT_SECRET)
    const refresh = process.env.JWT_REFRESH_SECRET
    if (!refresh || refresh.length < 32) {
      fatal.push('JWT_REFRESH_SECRET manquant ou trop court — définissez un secret aléatoire distinct (≥32 car.)')
    } else if (refresh === secret || refresh === `${secret}_refresh`) {
      fatal.push('JWT_REFRESH_SECRET ne doit pas être dérivé de JWT_SECRET — utilisez un secret indépendant')
    }
    // M6 — la vérification du certificat LDAP ne doit jamais être désactivée en prod
    if (process.env.LDAP_TLS_REJECT_UNAUTHORIZED === 'false') {
      fatal.push('LDAP_TLS_REJECT_UNAUTHORIZED=false désactive la vérification TLS du LDAP — interdit en production')
    }
    if (fatal.length) {
      for (const m of fatal) logger.error(`[boot] Config production dangereuse : ${m}`)
      process.exit(1)
    }
  }

  await connect()
  require('./services/scheduler').start()
  server = app.listen(PORT, () => {
    logger.info('NanoXplore RH démarré', { port: PORT, url: `http://localhost:${PORT}` })
  })
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

process.on('SIGTERM', async () => {
  logger.info('[Server] SIGTERM received — graceful shutdown...')
  if (server) {
    server.close(async () => {
      await mongoose.connection.close()
      logger.info('[Server] MongoDB connection closed')
      process.exit(0)
    })
  }
  setTimeout(() => process.exit(1), 10000)
})

process.on('SIGINT', async () => {
  logger.info('[Server] SIGINT received — shutting down...')
  await mongoose.connection.close()
  process.exit(0)
})

start()
