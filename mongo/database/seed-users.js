// =============================================================================
// database/seed-users.js — Seed utilisateurs uniquement
//
// Crée uniquement les comptes de test (admin + hr + manager + employee).
// Aucune campagne, formulaire ou évaluation n'est créé.
// L'utilisateur créera ses propres formulaires et campagnes via l'interface.
//
// Usage :
//   cd server && npm run seed:users
// =============================================================================

const path = require('path')
require(path.resolve(__dirname, '../server/node_modules/dotenv')).config({
  path: path.resolve(__dirname, '../server/.env'),
})

const bcrypt = require('bcrypt')
const { connect } = require('../server/config/db')
const { User } = require('../server/models')

const USERS = [
  {
    email:      'admin@nanoxplore.com',
    firstName:  'Admin',
    lastName:   'RH',
    role:       'admin',
    department: 'HR',
    password:   'Admin1234!',
  },
  {
    email:      'hr@nanoxplore.com',
    firstName:  'Camille',
    lastName:   'Dupont',
    role:       'hr',
    department: 'HR',
    password:   'Hr1234!',
  },
  {
    email:      'manager@nanoxplore.com',
    firstName:  'Sophie',
    lastName:   'Bernard',
    role:       'manager',
    department: 'Engineering',
    password:   'Manager1234!',
  },
  {
    email:      'employee@nanoxplore.com',
    firstName:  'Thomas',
    lastName:   'Leroy',
    role:       'employee',
    department: 'Engineering',
    password:   'Employee1234!',
  },
  {
    email:      'employee2@nanoxplore.com',
    firstName:  'Marie',
    lastName:   'Fontaine',
    role:       'employee',
    department: 'Marketing',
    password:   'Employee1234!',
  },
]

async function seed() {
  await connect()
  console.log('[seed:users] Connecté')

  for (const u of USERS) {
    const exists = await User.findOne({ email: u.email })
    if (exists) {
      console.log(`[seed:users] ${u.email} déjà présent — skip`)
      continue
    }
    const passwordHash = await bcrypt.hash(u.password, 12)
    await User.create({
      email:      u.email,
      passwordHash,
      firstName:  u.firstName,
      lastName:   u.lastName,
      role:       u.role,
      department: u.department,
      authSource: 'local',
    })
    console.log(`[seed:users] Créé : ${u.email} (${u.role})`)
  }

  // Rattacher les employés Engineering au manager
  const manager = await User.findOne({ email: 'manager@nanoxplore.com' })
  if (manager) {
    const updated = await User.updateMany(
      { department: 'Engineering', role: 'employee', managerId: { $exists: false } },
      { $set: { managerId: manager._id } }
    )
    if (updated.modifiedCount > 0) {
      console.log(`[seed:users] ${updated.modifiedCount} employé(s) Engineering rattaché(s) à Sophie Bernard`)
    }
  }

  console.log('[seed:users] Terminé ✓')
  console.log('')
  console.log('  Comptes créés :')
  // SÉCURITÉ : ne jamais journaliser le mot de passe en clair. Les identifiants
  // de test sont définis dans le tableau USERS ci-dessus (lecture du fichier).
  USERS.forEach(u => console.log(`  · ${u.email.padEnd(35)} (${u.role})`))
  process.exit(0)
}

seed().catch(err => {
  console.error('[seed:users] Erreur :', err.message)
  process.exit(1)
})
