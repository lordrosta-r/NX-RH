'use strict'

// =============================================================================
// scripts/set-admin-password.js — (Ré)initialise le mot de passe d'un compte
//
// Usage (dans le conteneur app) :
//   ADMIN_EMAIL=admin@ex.fr ADMIN_PASSWORD='...' node scripts/set-admin-password.js
//
// Le mot de passe est passé EN CLAIR : le hook pre-save du modèle User le hashe.
// Sert au provisioning local (pas un seed de données).
// =============================================================================

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') })

const mongoose = require('mongoose')
const { User } = require('../models')

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI
const EMAIL     = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
const PASSWORD  = process.env.ADMIN_PASSWORD || ''

async function main() {
  if (!MONGO_URI || !EMAIL || !PASSWORD) {
    console.error('[set-admin-password] MONGO_URI, ADMIN_EMAIL et ADMIN_PASSWORD requis')
    process.exit(1)
  }
  if (PASSWORD.length < 12) {
    console.error('[set-admin-password] mot de passe trop court (≥ 12)')
    process.exit(1)
  }
  await mongoose.connect(MONGO_URI)
  const user = await User.findOne({ email: EMAIL })
  if (!user) { console.error(`[set-admin-password] utilisateur ${EMAIL} introuvable`); await mongoose.disconnect(); process.exit(2) }
  user.passwordHash = PASSWORD // hook pre-save → bcrypt
  user.mustChangePassword = false
  await user.save()
  console.log(`[set-admin-password] ✓ mot de passe mis à jour pour ${EMAIL}`)
  await mongoose.disconnect()
  process.exit(0)
}

main().catch(async (err) => {
  console.error('[set-admin-password] échec :', err.message)
  try { await mongoose.disconnect() } catch { /* ignore */ }
  process.exit(1)
})
