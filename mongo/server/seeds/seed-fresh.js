'use strict'

// =============================================================================
// seeds/seed-fresh.js — État « install fraîche » : UN SEUL admin local.
//
// Point de départ du scénario e2e admin-first : l'admin est déjà dans l'app,
// tous les autres utilisateurs arrivent ensuite (sync LDAP + attribution des
// rôles par l'admin). Vide toutes les collections puis insère uniquement l'admin.
//
// Usage : MONGO_URI=… node seeds/seed-fresh.js   (ou npm run seed:e2e:fresh)
// =============================================================================

require('dotenv').config()

const mongoose = require('mongoose')
const bcrypt   = require('bcrypt')

const User                   = require('../models/User')
const { Campaign }           = require('../models/Campaign')
const Form                   = require('../models/Form')
const { Evaluation }         = require('../models/Evaluation')
const { OffboardingRequest } = require('../models/OffboardingRequest')
const MobilityRequest        = require('../models/MobilityRequest')
const PDI                    = require('../models/PDI')
const Event                  = require('../models/Event')
const Resource               = require('../models/Resource')
const Notification           = require('../models/Notification')
const AuditLog               = require('../models/AuditLog')

async function seedFresh() {
  const uri = process.env.MONGO_URI
  if (!uri) { console.error('❌  MONGO_URI non définie'); process.exit(1) }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 10000 })
  console.log('✅  MongoDB connecté\n🌱  Seed « install fraîche » (admin seul)…\n')

  // Vide tout
  await Promise.all([
    User.deleteMany({}), Campaign.deleteMany({}), Form.deleteMany({}),
    Evaluation.deleteMany({}), OffboardingRequest.deleteMany({}),
    MobilityRequest.deleteMany({}), PDI.deleteMany({}), Event.deleteMany({}),
    Resource.deleteMany({}), Notification.deleteMany({}), AuditLog.deleteMany({}),
  ])

  const passwordHash = await bcrypt.hash('password123', 10)
  await User.collection.insertOne({
    _id: new mongoose.Types.ObjectId(),
    email: 'alice@nxrh.local',
    passwordHash,
    firstName: 'Alice',
    lastName: 'Admin',
    role: 'admin',
    department: 'Executive',
    isActive: true,
    authSource: 'local',
    offboardingStatus: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  console.log('  ✓  1 admin local : alice@nxrh.local / password123')
  console.log('\n✅  Install fraîche prête — tout le reste se configure via l\'app.\n')

  await mongoose.disconnect()
  process.exit(0)
}

seedFresh().catch(err => {
  console.error('\n❌  Seed-fresh error :', err.message)
  mongoose.disconnect().finally(() => process.exit(1))
})
