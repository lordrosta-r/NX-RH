'use strict'

// =============================================================================
// Tests d'authentification — POST /api/auth/login, GET /api/auth/me, POST /api/auth/logout
// =============================================================================

const request = require('supertest')
const express = require('express')
const cookieParser = require('cookie-parser')
const bcrypt = require('bcrypt')
const User = require('../models/User')
const authRoutes = require('../routes/auth')
const { authGuard } = require('../middleware/authGuard')
const { errorHandler } = require('../middleware/errorHandler')

// Application Express minimale pour les tests
function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/auth', authRoutes)
  app.use(errorHandler)
  return app
}

describe('Auth Routes — /api/auth', () => {
  let app
  let testUser

  beforeAll(() => {
    app = createTestApp()
  })

  beforeEach(async () => {
    // Création d'un utilisateur de test
    const passwordHash = await bcrypt.hash('password123', 12)
    testUser = await User.create({
      email: 'john.doe@nanoxplore.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'employee',
      authSource: 'local',
      isActive: true,
      passwordHash,
    })
  })

  describe('POST /api/auth/login', () => {
    test('devrait réussir avec des identifiants valides et retourner un cookie', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john.doe@nanoxplore.com', password: 'password123' })
        .expect(200)

      expect(response.body).toHaveProperty('user')
      expect(response.body.user.email).toBe('john.doe@nanoxplore.com')
      expect(response.body.user.firstName).toBe('John')
      expect(response.body.user.role).toBe('employee')
      expect(response.body.user).not.toHaveProperty('passwordHash')
      
      // Vérifier la présence du cookie
      const cookies = response.headers['set-cookie']
      expect(cookies).toBeDefined()
      expect(cookies.some(c => c.startsWith('token='))).toBe(true)
    })

    test('devrait échouer avec un mauvais mot de passe (401)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john.doe@nanoxplore.com', password: 'wrongpassword' })
        .expect(401)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Identifiants invalides')
    })

    test('devrait échouer avec un utilisateur inexistant (401)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@nanoxplore.com', password: 'password123' })
        .expect(401)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Identifiants invalides')
    })

    test('devrait échouer sans email (400)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' })
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Email et mot de passe requis')
    })

    test('devrait échouer sans mot de passe (400)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john.doe@nanoxplore.com' })
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    test('devrait échouer avec un email invalide (400)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid-email', password: 'password123' })
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Email invalide')
    })

    test('devrait échouer si l\'utilisateur est inactif (401)', async () => {
      await User.updateOne({ _id: testUser._id }, { $set: { isActive: false } })

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john.doe@nanoxplore.com', password: 'password123' })
        .expect(401)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Identifiants invalides')
    })

    test('devrait échouer si authSource n\'est pas local (401)', async () => {
      await User.updateOne({ _id: testUser._id }, { $set: { authSource: 'ldap' } })

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john.doe@nanoxplore.com', password: 'password123' })
        .expect(401)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('GET /api/auth/me', () => {
    test('devrait retourner l\'utilisateur courant avec un token valide', async () => {
      // D'abord se connecter pour obtenir un cookie
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john.doe@nanoxplore.com', password: 'password123' })

      const cookies = loginResponse.headers['set-cookie']

      // Ensuite accéder à /me avec le cookie
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookies)
        .expect(200)

      expect(response.body).toHaveProperty('id')
      expect(response.body.email).toBe('john.doe@nanoxplore.com')
      expect(response.body.firstName).toBe('John')
      expect(response.body.role).toBe('employee')
      expect(response.body).not.toHaveProperty('passwordHash')
    })

    test('devrait échouer sans token (401)', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Authentication required')
    })

    test('devrait échouer avec un token invalide (401)', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', 'token=invalid-token')
        .expect(401)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toMatch(/invalide|Token/)
    })

    test('devrait échouer si l\'utilisateur est désactivé (401)', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john.doe@nanoxplore.com', password: 'password123' })

      const cookies = loginResponse.headers['set-cookie']

      // Désactiver l'utilisateur après connexion
      await User.updateOne({ _id: testUser._id }, { $set: { isActive: false } })

      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookies)
        .expect(401)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Session invalide')
    })
  })

  describe('POST /api/auth/logout', () => {
    test('devrait supprimer le cookie et retourner un message de succès', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toBe('Déconnecté')
      
      // Vérifier que le cookie est supprimé
      const cookies = response.headers['set-cookie']
      expect(cookies).toBeDefined()
      expect(cookies.some(c => c.includes('token=;'))).toBe(true)
    })
  })

  describe('PATCH /api/auth/preferences', () => {
    test('devrait mettre à jour la locale de l\'utilisateur', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john.doe@nanoxplore.com', password: 'password123' })

      const cookies = loginResponse.headers['set-cookie']

      const response = await request(app)
        .patch('/api/auth/preferences')
        .set('Cookie', cookies)
        .send({ locale: 'en' })
        .expect(200)

      expect(response.body.locale).toBe('en')
    })

    test('devrait refuser une locale invalide (400)', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john.doe@nanoxplore.com', password: 'password123' })

      const cookies = loginResponse.headers['set-cookie']

      const response = await request(app)
        .patch('/api/auth/preferences')
        .set('Cookie', cookies)
        .send({ locale: 'invalid' })
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })
})
