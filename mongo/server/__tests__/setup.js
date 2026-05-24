'use strict'

// =============================================================================
// Configuration Jest — MongoDB en mémoire pour isolation des tests
// =============================================================================

const { MongoMemoryServer } = require('mongodb-memory-server')
const mongoose = require('mongoose')

let mongoServer

// Démarrage de MongoDB en mémoire avant tous les tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  const uri = mongoServer.getUri()
  
  await mongoose.connect(uri)
})

// Nettoyage entre chaque test pour isolation
afterEach(async () => {
  const collections = mongoose.connection.collections
  for (const key in collections) {
    await collections[key].deleteMany({})
  }
})

// Arrêt de MongoDB et fermeture de la connexion après tous les tests
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close()
  }
  if (mongoServer) {
    await mongoServer.stop()
  }
})

// Mock pour nodemailer (éviter l'envoi réel d'emails)
jest.mock('../services/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue(true),
}))

// Mock pour notificationService
jest.mock('../services/notificationService', () => ({
  sendNotification: jest.fn().mockResolvedValue(true),
  notifyMany: jest.fn().mockResolvedValue([]),
}))

// Mock pour ldapService
jest.mock('../services/ldapService', () => ({
  authenticate: jest.fn().mockResolvedValue(true),
  searchUser: jest.fn().mockResolvedValue(null),
}))

// Variables d'environnement pour les tests
process.env.JWT_SECRET = 'test-secret-key-for-jwt'
process.env.NODE_ENV = 'test'
process.env.COOKIE_SECURE = 'false'
