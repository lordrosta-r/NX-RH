'use strict'

// =============================================================================
// NanoXplore RH — Express Server (MPA Router + API Gateway) — MongoDB
//
// Responsibilities:
//   1. Serve compiled React pages (static assets from /public)
//   2. Handle MPA page routes — each route returns a specific HTML file
//   3. Mount API route modules under /api/*
//   4. Protect page routes with the auth guard middleware
// =============================================================================

require('dotenv').config()

const express      = require('express')
const path         = require('path')
const cookieParser = require('cookie-parser')
const cors         = require('cors')
const helmet       = require('helmet')
const rateLimit    = require('express-rate-limit')

const { connect }   = require('./config/db')
const { authGuard } = require('./middleware/authGuard')

const authRoutes        = require('./routes/auth')
const eventRoutes       = require('./routes/events')
const resourceRoutes    = require('./routes/resources')
const userRoutes        = require('./routes/users')
const campaignRoutes    = require('./routes/campaigns')
const formRoutes        = require('./routes/forms')
const evaluationRoutes  = require('./routes/evaluations')

// ─── App setup ───────────────────────────────────────────────────────────────

const app  = express()
app.set('trust proxy', 1)
const PORT = process.env.PORT || 3000

const PUBLIC_DIR = path.join(__dirname, 'public')

const sendPage = (pageName) => (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, `${pageName}.html`))
}

// ─── Global middleware ───────────────────────────────────────────────────────

const rawOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
if (rawOrigin === '*') throw new Error('CORS wildcard interdit en production')
const allowedOrigins = rawOrigin.split(',').map(o => o.trim())
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error('CORS: origin non autorisé'))
  },
  credentials: true,
}))
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:              ["'self'"],
      // Hash covers the anti-flash inline <script> present in every .html entry point
      scriptSrc:               ["'self'", "'sha256-41QRkuG2u/36vjTzg1hZt9WHedga1/Q/Yk59rGLjxaE='"],
      styleSrc:                ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:                 ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:                  ["'self'", 'data:', 'https://images.unsplash.com', 'https://lh3.googleusercontent.com'],
      connectSrc:              ["'self'"],
      // Only force HTTPS upgrades in production — breaks local HTTP dev/test otherwise
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    }
  },
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

// ─── MPA Page Routes ─────────────────────────────────────────────────────────

app.get('/',           sendPage('login'))
app.get('/login',      sendPage('login'))
app.get('/dashboard',  authGuard(['admin', 'director', 'manager', 'employee', 'hr']), sendPage('dashboard'))
app.get('/manager',    authGuard(['admin', 'director', 'manager']),                   sendPage('manager'))
app.get('/hr',         authGuard(['admin', 'hr']),                                    sendPage('hr'))
app.get('/formeditor', authGuard(['admin', 'hr']),                                    sendPage('formeditor'))
app.get('/evaluation', authGuard(['admin', 'director', 'manager', 'employee', 'hr']), sendPage('evaluation'))
app.get('/settings',   authGuard(['admin', 'director', 'manager', 'employee', 'hr']), sendPage('settings'))

// ─── API Routes ──────────────────────────────────────────────────────────────

const authenticated = authGuard(['admin', 'director', 'manager', 'employee', 'hr'])

// Rate limiters API
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false })
const mutationLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false })

app.use('/api/', apiLimiter)

app.use('/api/auth',        authRoutes)
app.use('/api/users',       mutationLimiter, authenticated, userRoutes)
app.use('/api/campaigns',   mutationLimiter, authenticated, campaignRoutes)
app.use('/api/forms',       mutationLimiter, authenticated, formRoutes)
app.use('/api/evaluations/bulk', mutationLimiter)
app.use('/api/evaluations', authenticated, evaluationRoutes)
app.use('/api/events',      mutationLimiter, authenticated, eventRoutes)
app.use('/api/resources',   mutationLimiter, authenticated, resourceRoutes)

// ─── 404 Fallback ────────────────────────────────────────────────────────────

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' })
  }
  res.redirect('/')
})

// ─── Global error handler ────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Error]', err.message)
  const status  = err.status || 500
  const message = (process.env.NODE_ENV === 'production' && status === 500)
    ? 'Internal server error'
    : err.message || 'Internal server error'
  res.status(status).json({ error: message })
})

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
  app.listen(PORT, () => {
    console.log(`NanoXplore RH (MongoDB) → http://localhost:${PORT}`)
  })
}

start()
