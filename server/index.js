// =============================================================================
// NanoXplore RH — Express Server (MPA Router + API Gateway)
//
// Responsibilities:
//   1. Serve compiled React pages (static assets from /public)
//   2. Handle MPA page routes — each route returns a specific HTML file
//   3. Mount API route modules under /api/*
//   4. Protect page routes with the auth guard middleware
// =============================================================================

'use strict'

require('dotenv').config()

const express      = require('express')
const path         = require('path')
const cookieParser = require('cookie-parser')
const cors         = require('cors')

// Route modules
const authRoutes        = require('./routes/auth')
const userRoutes        = require('./routes/users')
const campaignRoutes    = require('./routes/campaigns')
const formRoutes        = require('./routes/forms')
const evaluationRoutes  = require('./routes/evaluations')

// Middleware
const { authGuard } = require('./middleware/authGuard')

// Services (connectivity checks at startup)
const { testMailConnection } = require('./services/mailer')
const { testLdapConnection  } = require('./services/ldap')

// ─── App setup ───────────────────────────────────────────────────────────────

const app  = express()
const PORT = process.env.PORT || 3000

// The compiled Vite output. `vite build` writes here.
const PUBLIC_DIR = path.join(__dirname, 'public')

// Helper: send the compiled HTML for a given page name
const sendPage = (pageName) => (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, `${pageName}.html`))
}

// ─── Global middleware ───────────────────────────────────────────────────────

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Serve all compiled JS/CSS assets produced by Vite (hashed filenames, etc.)
app.use(express.static(PUBLIC_DIR))

// ─── Health check (used by Docker HEALTHCHECK + load balancer probes) ────────
// Public — no auth. Returns 200 when the app + DB are reachable.

app.get('/api/health', async (_req, res) => {
  try {
    const db = require('./config/db')
    await db.query('SELECT 1')
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  } catch {
    res.status(503).json({ status: 'error', reason: 'database unreachable' })
  }
})

// ─── MPA Page Routes ─────────────────────────────────────────────────────────
//
// These are NOT API endpoints. Each route returns a full HTML document.
// Express acts as the page router — there is no client-side routing library.
//
// Route         │ HTML file served          │ Auth required?
// ─────────────────────────────────────────────────────────
// GET /         │ public/login.html         │ No  (public)
// GET /dashboard│ public/dashboard.html     │ Yes (any authenticated user)
// GET /manager  │ public/manager.html       │ Yes (manager or admin role)
// ─────────────────────────────────────────────────────────

app.get('/',          sendPage('login'))
app.get('/dashboard', authGuard(['admin', 'manager', 'employee']), sendPage('dashboard'))
app.get('/manager',   authGuard(['admin', 'manager']),             sendPage('manager'))
app.get('/hr',        authGuard(['admin', 'hr']),                  sendPage('hr'))
app.get('/formeditor',  authGuard(['admin', 'hr']),                             sendPage('formeditor'))
app.get('/evaluation', authGuard(['admin', 'hr', 'manager', 'employee']),     sendPage('evaluation'))

// ─── API Routes ──────────────────────────────────────────────────────────────
//
// All data endpoints live under /api. They return JSON, never HTML.

app.use('/api/auth',        authRoutes)
app.use('/api/users',       authGuard(['admin', 'manager', 'employee']), userRoutes)
app.use('/api/campaigns',   authGuard(['admin', 'manager', 'employee']), campaignRoutes)
app.use('/api/forms',       authGuard(['admin', 'manager', 'employee']), formRoutes)
app.use('/api/evaluations', authGuard(['admin', 'manager', 'employee']), evaluationRoutes)

// ─── 404 Fallback ────────────────────────────────────────────────────────────
// Any unknown route that is NOT an API call redirects to login.
// API 404s get a JSON response instead.

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
  const status = err.status || 500
  res.status(status).json({ error: err.message || 'Internal server error' })
})

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, async () => {
  console.log(`NanoXplore RH server running → http://localhost:${PORT}`)

  // Check optional services — failures are logged but don't prevent startup
  if (process.env.MAIL_HOST) await testMailConnection()
  if (process.env.AUTH_PROVIDER === 'ldap') await testLdapConnection()
})
