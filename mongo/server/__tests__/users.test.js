'use strict'

// =============================================================================
// Tests utilisateurs — GET /api/users, POST /api/users, PATCH /api/users/:id
// =============================================================================

const request = require('supertest')
const express = require('express')
const cookieParser = require('cookie-parser')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const userRoutes = require('../routes/users')
const { authGuard } = require('../middleware/authGuard')
const { errorHandler } = require('../middleware/errorHandler')

// Application Express minimale pour les tests
function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/users', authGuard(), userRoutes)
  app.use(errorHandler)
  return app
}

// Helper pour créer un token JWT
function createToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '8h' }
  )
}

describe('User Routes — /api/users', () => {
  let app
  let adminUser, hrUser, managerUser, employeeUser
  let adminToken, hrToken, managerToken, employeeToken

  beforeAll(() => {
    app = createTestApp()
  })

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('password123', 12)

    // Création de plusieurs utilisateurs avec des rôles différents
    adminUser = await User.create({
      email: 'admin@nanoxplore.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      authSource: 'local',
      isActive: true,
      passwordHash,
    })

    hrUser = await User.create({
      email: 'hr@nanoxplore.com',
      firstName: 'HR',
      lastName: 'User',
      role: 'hr',
      authSource: 'local',
      isActive: true,
      passwordHash,
    })

    managerUser = await User.create({
      email: 'manager@nanoxplore.com',
      firstName: 'Manager',
      lastName: 'User',
      role: 'manager',
      authSource: 'local',
      isActive: true,
      passwordHash,
    })

    employeeUser = await User.create({
      email: 'employee@nanoxplore.com',
      firstName: 'Employee',
      lastName: 'User',
      role: 'employee',
      managerId: managerUser._id,
      authSource: 'local',
      isActive: true,
      passwordHash,
    })

    adminToken = createToken(adminUser)
    hrToken = createToken(hrUser)
    managerToken = createToken(managerUser)
    employeeToken = createToken(employeeUser)
  })

  describe('GET /api/users', () => {
    test('devrait permettre à un admin de lister tous les utilisateurs', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Cookie', `accessToken=${adminToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('data')
      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.data.length).toBeGreaterThanOrEqual(4)
      expect(response.body).toHaveProperty('meta.total')

      // Chaque user doit exposer `id` (le frontend construit /users/:id dessus)
      response.body.data.forEach(user => {
        expect(typeof user.id).toBe('string')
        expect(user.id.length).toBeGreaterThan(0)
        expect(user).not.toHaveProperty('passwordHash')
      })
    })

    test('devrait permettre à un hr de lister tous les utilisateurs', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Cookie', `accessToken=${hrToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('data')
      expect(response.body.data.length).toBeGreaterThanOrEqual(4)
    })

    test('devrait permettre à un manager de voir ses subordonnés uniquement', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Cookie', `accessToken=${managerToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('data')
      // Le manager ne devrait voir que ses subordonnés directs
      expect(response.body.data.length).toBe(1)
      expect(response.body.data[0].managerId.toString()).toBe(managerUser._id.toString())
    })

    test('devrait refuser l\'accès à un employee (403)', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Cookie', `accessToken=${employeeToken}`)
        .expect(403)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Permissions insuffisantes')
    })

    test('devrait supporter la recherche par nom', async () => {
      const response = await request(app)
        .get('/api/users?search=Employee')
        .set('Cookie', `accessToken=${adminToken}`)
        .expect(200)

      expect(response.body.data.length).toBeGreaterThanOrEqual(1)
      expect(response.body.data.some(u => u.firstName === 'Employee')).toBe(true)
    })

    test('devrait supporter le filtre par rôle', async () => {
      const response = await request(app)
        .get('/api/users?role=admin')
        .set('Cookie', `accessToken=${adminToken}`)
        .expect(200)

      expect(response.body.data.length).toBeGreaterThanOrEqual(1)
      response.body.data.forEach(user => {
        expect(user.role).toBe('admin')
      })
    })

    test('devrait supporter le filtre isActive', async () => {
      // Désactiver un utilisateur
      await User.updateOne({ _id: employeeUser._id }, { $set: { isActive: false } })

      const response = await request(app)
        .get('/api/users?isActive=true')
        .set('Cookie', `accessToken=${adminToken}`)
        .expect(200)

      // Ne devrait pas inclure l'employé désactivé
      expect(response.body.data.every(u => u.isActive === true)).toBe(true)
    })

    test('devrait supporter la pagination', async () => {
      const response = await request(app)
        .get('/api/users?page=1&limit=2')
        .set('Cookie', `accessToken=${adminToken}`)
        .expect(200)

      expect(response.body.data.length).toBeLessThanOrEqual(2)
      expect(response.body).toHaveProperty('meta.page', 1)
      expect(response.body).toHaveProperty('meta.limit', 2)
    })
  })

  describe('GET /api/users/:id', () => {
    test('devrait permettre à un admin de voir n\'importe quel utilisateur', async () => {
      const response = await request(app)
        .get(`/api/users/${employeeUser._id}`)
        .set('Cookie', `accessToken=${adminToken}`)
        .expect(200)

      expect(response.body.data.email).toBe('employee@nanoxplore.com')
      expect(response.body.data.id).toBe(employeeUser._id.toString())
      expect(response.body.data).not.toHaveProperty('passwordHash')
    })

    test('devrait permettre à un utilisateur de voir son propre profil', async () => {
      const response = await request(app)
        .get(`/api/users/${employeeUser._id}`)
        .set('Cookie', `accessToken=${employeeToken}`)
        .expect(200)

      expect(response.body.data.email).toBe('employee@nanoxplore.com')
    })

    test('devrait refuser l\'accès à un employee qui veut voir un autre utilisateur (403)', async () => {
      const response = await request(app)
        .get(`/api/users/${adminUser._id}`)
        .set('Cookie', `accessToken=${employeeToken}`)
        .expect(403)

      expect(response.body).toHaveProperty('error')
    })

    test('devrait retourner 404 si l\'utilisateur n\'existe pas', async () => {
      const fakeId = '507f1f77bcf86cd799439011'
      const response = await request(app)
        .get(`/api/users/${fakeId}`)
        .set('Cookie', `accessToken=${adminToken}`)
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })

    test('devrait retourner 400 avec un ID invalide', async () => {
      const response = await request(app)
        .get('/api/users/invalid-id')
        .set('Cookie', `accessToken=${adminToken}`)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('POST /api/users', () => {
    test('devrait permettre à un admin de créer un utilisateur', async () => {
      const newUser = {
        firstName: 'New',
        lastName: 'User',
        email: 'new.user@nanoxplore.com',
        role: 'employee',
        department: 'Engineering',
      }

      const response = await request(app)
        .post('/api/users')
        .set('Cookie', `accessToken=${adminToken}`)
        .send(newUser)
        .expect(201)

      expect(response.body.data.email).toBe('new.user@nanoxplore.com')
      expect(response.body.data.firstName).toBe('New')
      expect(response.body.data).toHaveProperty('tempPassword') // Mot de passe temporaire
      expect(response.body.data).not.toHaveProperty('passwordHash')
      
      // Vérifier que l'utilisateur existe en DB
      const dbUser = await User.findOne({ email: 'new.user@nanoxplore.com' })
      expect(dbUser).toBeTruthy()
      expect(dbUser.authSource).toBe('local')
    })

    test('devrait permettre à un hr de créer un utilisateur', async () => {
      const newUser = {
        firstName: 'Another',
        lastName: 'User',
        email: 'another.user@nanoxplore.com',
        role: 'employee',
      }

      const response = await request(app)
        .post('/api/users')
        .set('Cookie', `accessToken=${hrToken}`)
        .send(newUser)
        .expect(201)

      expect(response.body.data.email).toBe('another.user@nanoxplore.com')
    })

    test('devrait refuser à un employee de créer un utilisateur (403)', async () => {
      const newUser = {
        firstName: 'Not',
        lastName: 'Allowed',
        email: 'not.allowed@nanoxplore.com',
        role: 'employee',
      }

      const response = await request(app)
        .post('/api/users')
        .set('Cookie', `accessToken=${employeeToken}`)
        .send(newUser)
        .expect(403)

      expect(response.body).toHaveProperty('error')
    })

    test('devrait échouer si firstName est manquant (400)', async () => {
      const newUser = {
        lastName: 'User',
        email: 'incomplete@nanoxplore.com',
      }

      const response = await request(app)
        .post('/api/users')
        .set('Cookie', `accessToken=${adminToken}`)
        .send(newUser)
        .expect(422)

      expect(response.body).toHaveProperty('error')
      expect(response.body).toHaveProperty('details')
    })

    test('devrait échouer si email existe déjà (409)', async () => {
      const duplicateUser = {
        firstName: 'Duplicate',
        lastName: 'User',
        email: 'admin@nanoxplore.com', // Email déjà utilisé
        role: 'employee',
      }

      const response = await request(app)
        .post('/api/users')
        .set('Cookie', `accessToken=${adminToken}`)
        .send(duplicateUser)
        .expect(409)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('Email déjà utilisé')
    })

    test('devrait refuser un rôle invalide (400)', async () => {
      const newUser = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@nanoxplore.com',
        role: 'super-admin', // Rôle invalide
      }

      const response = await request(app)
        .post('/api/users')
        .set('Cookie', `accessToken=${adminToken}`)
        .send(newUser)
        .expect(422)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('PATCH /api/users/:id', () => {
    test('devrait permettre à un admin de modifier le rôle d\'un utilisateur', async () => {
      const response = await request(app)
        .patch(`/api/users/${employeeUser._id}`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ role: 'manager' })
        .expect(200)

      expect(response.body.data.role).toBe('manager')

      // Vérifier en DB
      const dbUser = await User.findById(employeeUser._id)
      expect(dbUser.role).toBe('manager')
    })

    test('refuse de rétrograder le DERNIER administrateur actif (409)', async () => {
      // adminUser est le seul admin du jeu de test → démotion interdite.
      const res = await request(app)
        .patch(`/api/users/${adminUser._id}`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ role: 'manager' })
      expect(res.status).toBe(409)
      const stillAdmin = await User.findById(adminUser._id)
      expect(stillAdmin.role).toBe('admin')
    })

    test('refuse de désactiver le DERNIER administrateur actif (409)', async () => {
      const res = await request(app)
        .patch(`/api/users/${adminUser._id}`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ isActive: false })
      expect(res.status).toBe(409)
    })

    test('devrait permettre à un utilisateur de modifier ses propres informations limitées', async () => {
      const response = await request(app)
        .patch(`/api/users/${employeeUser._id}`)
        .set('Cookie', `accessToken=${employeeToken}`)
        .send({ phone: '+33612345678', avatar: 'https://example.com/avatar.jpg' })
        .expect(200)

      expect(response.body.data.phone).toBe('+33612345678')
    })

    test('devrait refuser à un employee de modifier son rôle (403)', async () => {
      const response = await request(app)
        .patch(`/api/users/${employeeUser._id}`)
        .set('Cookie', `accessToken=${employeeToken}`)
        .send({ role: 'admin' })
        .expect(403)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('protégés')
    })

    test('devrait refuser à un employee de modifier un autre utilisateur (403)', async () => {
      const response = await request(app)
        .patch(`/api/users/${adminUser._id}`)
        .set('Cookie', `accessToken=${employeeToken}`)
        .send({ firstName: 'Hacked' })
        .expect(403)

      expect(response.body).toHaveProperty('error')
    })

    test('devrait retourner 404 si l\'utilisateur n\'existe pas', async () => {
      const fakeId = '507f1f77bcf86cd799439011'
      const response = await request(app)
        .patch(`/api/users/${fakeId}`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ firstName: 'Test' })
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })

    test('ne devrait jamais exposer passwordHash dans la réponse', async () => {
      const response = await request(app)
        .patch(`/api/users/${employeeUser._id}`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ firstName: 'Updated' })
        .expect(200)

      expect(response.body).not.toHaveProperty('passwordHash')
    })
  })

  describe('DELETE /api/users/:id', () => {
    test('devrait permettre à un admin de désactiver un utilisateur', async () => {
      const response = await request(app)
        .delete(`/api/users/${employeeUser._id}`)
        .set('Cookie', `accessToken=${adminToken}`)
        .expect(204)

      // Vérifier que l'utilisateur est désactivé
      const dbUser = await User.findById(employeeUser._id)
      expect(dbUser.isActive).toBe(false)
    })

    test('devrait refuser à un admin de se supprimer lui-même (403)', async () => {
      const response = await request(app)
        .delete(`/api/users/${adminUser._id}`)
        .set('Cookie', `accessToken=${adminToken}`)
        .expect(403)

      expect(response.body).toHaveProperty('error')
    })

    test('devrait refuser à un non-admin de supprimer un utilisateur (403)', async () => {
      const response = await request(app)
        .delete(`/api/users/${employeeUser._id}`)
        .set('Cookie', `accessToken=${hrToken}`)
        .expect(403)

      expect(response.body).toHaveProperty('error')
    })
  })
})
