'use strict'

// =============================================================================
// Tests middleware — authGuard, errorHandler
// =============================================================================

const request = require('supertest')
const express = require('express')
const cookieParser = require('cookie-parser')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { authGuard } = require('../middleware/authGuard')
const { errorHandler } = require('../middleware/errorHandler')

// Helper pour créer un token JWT
function createToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '8h' }
  )
}

// Helper pour créer un token expiré
function createExpiredToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '-1h' } // Expiré
  )
}

describe('Middleware — authGuard', () => {
  let app
  let adminUser, employeeUser
  let adminToken, employeeToken

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('password123', 12)

    adminUser = await User.create({
      email: 'admin@nanoxplore.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      authSource: 'local',
      isActive: true,
      passwordHash,
    })

    employeeUser = await User.create({
      email: 'employee@nanoxplore.com',
      firstName: 'Employee',
      lastName: 'User',
      role: 'employee',
      authSource: 'local',
      isActive: true,
      passwordHash,
    })

    adminToken = createToken(adminUser)
    employeeToken = createToken(employeeUser)

    app = express()
    app.use(express.json())
    app.use(cookieParser())
  })

  describe('authGuard() — sans restriction de rôle', () => {
    test('devrait accepter un token valide', async () => {
      app.get('/api/test', authGuard(), (req, res) => {
        res.json({ userId: req.user.id, role: req.user.role })
      })
      app.use(errorHandler)

      const response = await request(app)
        .get('/api/test')
        .set('Cookie', `token=${employeeToken}`)
        .expect(200)

      expect(response.body.userId).toBe(employeeUser._id.toString())
      expect(response.body.role).toBe('employee')
    })

    test('devrait rejeter une requête sans token (401)', async () => {
      app.get('/api/test', authGuard(), (req, res) => {
        res.json({ success: true })
      })
      app.use(errorHandler)

      const response = await request(app)
        .get('/api/test')
        .expect(401)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Authentication required')
    })

    test('devrait rejeter un token invalide (401)', async () => {
      app.get('/api/test', authGuard(), (req, res) => {
        res.json({ success: true })
      })
      app.use(errorHandler)

      const response = await request(app)
        .get('/api/test')
        .set('Cookie', 'token=invalid-token-string')
        .expect(401)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toMatch(/invalide|Token/)
    })

    test('devrait rejeter un token expiré (401)', async () => {
      const expiredToken = createExpiredToken(employeeUser)

      app.get('/api/test', authGuard(), (req, res) => {
        res.json({ success: true })
      })
      app.use(errorHandler)

      const response = await request(app)
        .get('/api/test')
        .set('Cookie', `token=${expiredToken}`)
        .expect(401)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Session expirée')
    })

    test('devrait rejeter un token si l\'utilisateur est désactivé (401)', async () => {
      // Désactiver l'utilisateur
      await User.updateOne({ _id: employeeUser._id }, { $set: { isActive: false } })

      app.get('/api/test', authGuard(), (req, res) => {
        res.json({ success: true })
      })
      app.use(errorHandler)

      const response = await request(app)
        .get('/api/test')
        .set('Cookie', `token=${employeeToken}`)
        .expect(401)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Compte désactivé')

      // Réactiver pour ne pas affecter les autres tests
      await User.updateOne({ _id: employeeUser._id }, { $set: { isActive: true } })
    })
  })

  describe('authGuard([roles]) — avec restriction de rôle', () => {
    test('devrait accepter un utilisateur avec le rôle admin', async () => {
      app.get('/api/admin-only', authGuard(['admin']), (req, res) => {
        res.json({ success: true, role: req.user.role })
      })
      app.use(errorHandler)

      const response = await request(app)
        .get('/api/admin-only')
        .set('Cookie', `token=${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.role).toBe('admin')
    })

    test('devrait rejeter un utilisateur avec le rôle employee (403)', async () => {
      app.get('/api/admin-only', authGuard(['admin']), (req, res) => {
        res.json({ success: true })
      })
      app.use(errorHandler)

      const response = await request(app)
        .get('/api/admin-only')
        .set('Cookie', `token=${employeeToken}`)
        .expect(403)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Insufficient permissions')
    })

    test('devrait accepter plusieurs rôles autorisés', async () => {
      app.get('/api/admin-or-hr', authGuard(['admin', 'hr']), (req, res) => {
        res.json({ success: true })
      })
      app.use(errorHandler)

      const response = await request(app)
        .get('/api/admin-or-hr')
        .set('Cookie', `token=${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
    })

    test('devrait rejeter un rôle non autorisé même avec plusieurs rôles (403)', async () => {
      app.get('/api/admin-or-hr', authGuard(['admin', 'hr']), (req, res) => {
        res.json({ success: true })
      })
      app.use(errorHandler)

      const response = await request(app)
        .get('/api/admin-or-hr')
        .set('Cookie', `token=${employeeToken}`)
        .expect(403)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('authGuard — attache req.user', () => {
    test('devrait attacher les informations utilisateur à req.user', async () => {
      let capturedUser = null

      app.get('/api/test', authGuard(), (req, res) => {
        capturedUser = req.user
        res.json({ success: true })
      })
      app.use(errorHandler)

      await request(app)
        .get('/api/test')
        .set('Cookie', `token=${employeeToken}`)
        .expect(200)

      expect(capturedUser).toBeTruthy()
      expect(capturedUser.id).toBe(employeeUser._id.toString())
      expect(capturedUser.email).toBe('employee@nanoxplore.com')
      expect(capturedUser.role).toBe('employee')
      expect(capturedUser._id).toBe(employeeUser._id.toString())
    })
  })
})

describe('Middleware — errorHandler', () => {
  let app

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use(cookieParser())
  })

  test('devrait formater les erreurs avec un message cohérent', async () => {
    app.get('/api/error', (req, res, next) => {
      const error = new Error('Une erreur de test')
      error.status = 500
      next(error)
    })
    app.use(errorHandler)

    const response = await request(app)
      .get('/api/error')
      .expect(500)

    expect(response.body).toHaveProperty('error')
    expect(response.body.error).toBe('Une erreur de test')
  })

  test('devrait retourner 500 par défaut si aucun statut n\'est fourni', async () => {
    app.get('/api/error', (req, res, next) => {
      const error = new Error('Erreur sans statut')
      next(error)
    })
    app.use(errorHandler)

    const response = await request(app)
      .get('/api/error')
      .expect(500)

    expect(response.body).toHaveProperty('error')
  })

  test('devrait gérer les erreurs Mongoose de validation', async () => {
    const ValidationError = require('mongoose').Error.ValidationError
    const error = new ValidationError()
    error.errors = {
      email: {
        message: 'Email est requis',
      },
    }

    app.get('/api/validation-error', (req, res, next) => {
      next(error)
    })
    app.use(errorHandler)

    const response = await request(app)
      .get('/api/validation-error')
      .expect(400)

    expect(response.body).toHaveProperty('error')
  })

  test('devrait gérer les erreurs Mongoose de cast (ID invalide)', async () => {
    const CastError = require('mongoose').Error.CastError
    const error = new CastError('ObjectId', 'invalid-id', '_id')

    app.get('/api/cast-error', (req, res, next) => {
      next(error)
    })
    app.use(errorHandler)

    const response = await request(app)
      .get('/api/cast-error')
      .expect(400)

    expect(response.body).toHaveProperty('error')
  })

  test('devrait gérer les erreurs de duplication MongoDB (code 11000)', async () => {
    const error = new Error('E11000 duplicate key error')
    error.code = 11000
    error.keyPattern = { email: 1 }

    app.get('/api/duplicate-error', (req, res, next) => {
      next(error)
    })
    app.use(errorHandler)

    const response = await request(app)
      .get('/api/duplicate-error')
      .expect(409)

    expect(response.body).toHaveProperty('error')
  })

  test('devrait masquer les détails d\'erreur en production', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    app.get('/api/error', (req, res, next) => {
      const error = new Error('Erreur interne sensible')
      next(error)
    })
    app.use(errorHandler)

    const response = await request(app)
      .get('/api/error')
      .expect(500)

    expect(response.body.error).not.toContain('sensible')
    
    process.env.NODE_ENV = originalEnv
  })
})
