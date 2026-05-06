'use strict'
// seed-full.js — Orchestrateur principal de seed pour NX-RH
// Usage: cd mongo && node database/seed-full.js
// Runs all seeds in dependency order, idempotent (upserts only)

const path = require('path')
const serverDir = path.resolve(__dirname, '../server')
const resolve = (mod) => require(path.join(serverDir, 'node_modules', mod))

resolve('dotenv').config({ path: path.join(serverDir, '.env') })

if (!process.env.MONGO_URI) {
  process.env.MONGO_URI = 'mongodb://root:changeme@localhost:27017/nanoxplore_rh?authSource=admin'
}

// db.js reads MONGO_URI at require-time; must be set before this line
const { connect } = require('../server/config/db')
const { seedUsers } = require('./seed-users-full')
const { seedCampaignsForms } = require('./seed-campaigns-forms')
const { seedEvaluationsActivities } = require('./seed-evaluations-activities')

async function seedAll() {
  console.log('\n🌱 NX-RH Full Seed\n')

  // Open one connection — each sub-seed also calls connect() internally,
  // but Mongoose 8 is idempotent: subsequent calls reuse the existing
  // connection instead of opening a new one.
  await connect()

  console.log('── Step 1/3: Users + Sectors ──')
  await seedUsers()

  console.log('\n── Step 2/3: Campaigns + Forms + Config ──')
  await seedCampaignsForms()

  console.log('\n── Step 3/3: Evaluations + Activities ──')
  await seedEvaluationsActivities()

  console.log('\n✅ Seed complet!')
  console.log('\nComptes de test (mot de passe: Test1234!):')
  console.log('  admin@nx-rh.fr       → Admin')
  console.log('  rh@nx-rh.fr          → RH')
  console.log('  direction@nx-rh.fr   → Directeur')
  console.log('  manager-it@nx-rh.fr  → Manager Engineering')
  console.log('  employee-a@nx-rh.fr  → Employé (évals en cours)')
  console.log('\nFrontend: http://localhost:5173/')
}

seedAll().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
