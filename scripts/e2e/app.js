'use strict'

// Les vars d'env DOIVENT être définies AVANT ce fichier (par run.js).
// Ce module construit l'application Express sans appeler listen() et sans dotenv.

const express      = require('express')
const cookieParser = require('cookie-parser')
const cors         = require('cors')
const helmet       = require('helmet')
const rateLimit    = require('express-rate-limit')

const { authGuard } = require('../../mongo/server/middleware/authGuard')
const authRoutes       = require('../../mongo/server/routes/auth')
const userRoutes       = require('../../mongo/server/routes/users')
const campaignRoutes   = require('../../mongo/server/routes/campaigns')
const formRoutes       = require('../../mongo/server/routes/forms')
const evaluationRoutes = require('../../mongo/server/routes/evaluations')
const eventRoutes      = require('../../mongo/server/routes/events')
const resourceRoutes   = require('../../mongo/server/routes/resources')

const app = express()

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
// CSP désactivé en test pour ne pas interférer avec les réponses JSON
app.use(helmet({ contentSecurityPolicy: false }))
app.use(express.json({ limit: '100kb' }))
app.use(express.urlencoded({ extended: false, limit: '100kb' }))
app.use(cookieParser())

// Rate limiters très souples pour les tests (sauf loginLimiter dans routes/auth.js qui est conservé)
const apiLimiter      = rateLimit({ windowMs: 1000, max: 2000, standardHeaders: false, legacyHeaders: false })
const mutationLimiter = rateLimit({ windowMs: 1000, max: 1000, standardHeaders: false, legacyHeaders: false })

const authenticated = authGuard()

app.use('/api/', apiLimiter)
app.use('/api/auth', authRoutes)
app.use('/api/users',              mutationLimiter, authenticated, userRoutes)
app.use('/api/campaigns',          authenticated, campaignRoutes)
app.use('/api/forms',              authenticated, formRoutes)
app.use('/api/evaluations/bulk',   mutationLimiter)
app.use('/api/evaluations',        authenticated, evaluationRoutes)
app.use('/api/events',             authenticated, eventRoutes)
app.use('/api/resources',          authenticated, resourceRoutes)

// Gestionnaire d'erreurs global — convertit les erreurs Mongoose en codes HTTP appropriés
app.use((err, _req, res, _next) => {
  // Mongoose ValidationError → 400
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message })
  }
  // MongoDB duplicate key (email unique, etc.) → 409
  if (err.code === 11000) {
    return res.status(409).json({ error: 'Valeur déjà existante (doublon)' })
  }
  // Mongoose CastError (ObjectId invalide) → 400
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Valeur invalide pour le champ ${err.path}` })
  }
  const status = err.status || err.statusCode || 500
  res.status(status).json({ error: err.message || 'Erreur interne' })
})

module.exports = { app }
