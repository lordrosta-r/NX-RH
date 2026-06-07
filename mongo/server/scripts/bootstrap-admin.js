'use strict'

// =============================================================================
// scripts/bootstrap-admin.js — Crée le compte administrateur initial
//
// Bootstrap légitime (PAS un seed de données) : crée le PREMIER administrateur
// d'une base vierge, via le modèle User de l'application (le hook pre-save
// hashe le mot de passe en bcrypt). Une fois cet admin connecté, tout le reste
// se crée depuis l'UI.
//
// Usage :
//   ADMIN_EMAIL=admin@ex.fr ADMIN_PASSWORD='MotDePasseFort' \
//     node mongo/server/scripts/bootstrap-admin.js
//
// Idempotent : refuse de s'exécuter si un admin actif existe déjà.
// =============================================================================

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') })

const mongoose = require('mongoose')
const { User } = require('../models')

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI
const EMAIL     = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
const PASSWORD  = process.env.ADMIN_PASSWORD || ''
const FIRSTNAME = process.env.ADMIN_FIRSTNAME || 'Admin'
const LASTNAME  = process.env.ADMIN_LASTNAME || 'RH'

async function main() {
  if (!MONGO_URI) { console.error('[bootstrap-admin] MONGO_URI manquant'); process.exit(1) }
  if (!EMAIL || !PASSWORD) {
    console.error('[bootstrap-admin] ADMIN_EMAIL et ADMIN_PASSWORD sont requis')
    process.exit(1)
  }
  if (PASSWORD.length < 12) {
    console.error('[bootstrap-admin] Le mot de passe admin doit faire au moins 12 caractères')
    process.exit(1)
  }

  await mongoose.connect(MONGO_URI)

  const existingAdmin = await User.exists({ role: 'admin', isActive: true })
  if (existingAdmin) {
    console.error('[bootstrap-admin] Un administrateur actif existe déjà — abandon (idempotent).')
    await mongoose.disconnect()
    process.exit(2)
  }

  const dup = await User.findOne({ email: EMAIL }).lean()
  if (dup) {
    console.error(`[bootstrap-admin] Un utilisateur avec l'email ${EMAIL} existe déjà — abandon.`)
    await mongoose.disconnect()
    process.exit(3)
  }

  // passwordHash reçoit le mot de passe EN CLAIR : le hook pre-save du modèle
  // User le détecte (non-bcrypt) et le hashe automatiquement.
  const admin = new User({
    email:        EMAIL,
    firstName:    FIRSTNAME,
    lastName:     LASTNAME,
    role:         'admin',
    authSource:   'local',
    isActive:     true,
    passwordHash: PASSWORD,
  })
  await admin.save()

  console.log(`[bootstrap-admin] ✓ Administrateur créé : ${EMAIL} (id ${admin._id})`)
  await mongoose.disconnect()
  process.exit(0)
}

main().catch(async (err) => {
  console.error('[bootstrap-admin] Échec :', err.message)
  try { await mongoose.disconnect() } catch { /* ignore */ }
  process.exit(1)
})
