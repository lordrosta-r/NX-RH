'use strict'
// =============================================================================
// database/seed-users-full.js — Seed complet des utilisateurs NX-RH
//
// Upsert uniquement (pas de deleteMany) — préserve les données existantes.
// Usage : cd /path/to/NX-RH/mongo && node database/seed-users-full.js
// =============================================================================

const path = require('path')
const serverDir = path.resolve(__dirname, '../server')
const resolve = (mod) => require(path.join(serverDir, 'node_modules', mod))

resolve('dotenv').config({ path: path.join(serverDir, '.env') })

if (!process.env.MONGO_URI) {
  process.env.MONGO_URI = 'mongodb://root:changeme@localhost:27017/nanoxplore_rh?authSource=admin'
}

const bcrypt = resolve('bcrypt')
const { connect } = require('../server/config/db')
const { User, Sector } = require('../server/models')

async function seedUsers() {
  await connect()
  console.log('[seed-users-full] Connecté à MongoDB')

  // ── Hash partagé (calculé une seule fois) ────────────────────────────────
  const hash = await bcrypt.hash('Test1234!', 12)

  // ── Pass 1 : Upsert des utilisateurs SANS managerId ───────────────────────
  const upsert = (email, data) =>
    User.findOneAndUpdate(
      { email },
      { $set: data },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

  const adminDoc = await upsert('admin@nx-rh.fr', {
    firstName: 'Alice',
    lastName: 'Moreau',
    role: 'admin',
    department: 'HR',
    authSource: 'local',
    passwordHash: hash,
    isActive: true,
  })
  console.log(`  ✓ admin         : admin@nx-rh.fr (${adminDoc._id})`)

  const rhDoc = await upsert('rh@nx-rh.fr', {
    firstName: 'Hugo',
    lastName: 'Lambert',
    role: 'hr',
    department: 'HR',
    authSource: 'local',
    passwordHash: hash,
    isActive: true,
  })
  console.log(`  ✓ hr            : rh@nx-rh.fr (${rhDoc._id})`)

  const directionDoc = await upsert('direction@nx-rh.fr', {
    firstName: 'Claire',
    lastName: 'Bernard',
    role: 'director',
    department: 'Executive',
    authSource: 'local',
    passwordHash: hash,
    isActive: true,
  })
  console.log(`  ✓ director      : direction@nx-rh.fr (${directionDoc._id})`)

  const managerItDoc = await upsert('manager-it@nx-rh.fr', {
    firstName: 'Julien',
    lastName: 'Robert',
    role: 'manager',
    department: 'Engineering',
    authSource: 'local',
    passwordHash: hash,
    isActive: true,
  })
  console.log(`  ✓ manager-it    : manager-it@nx-rh.fr (${managerItDoc._id})`)

  const managerMktDoc = await upsert('manager-marketing@nx-rh.fr', {
    firstName: 'Marie',
    lastName: 'Dubois',
    role: 'manager',
    department: 'Marketing',
    authSource: 'ldap',
    ldapDn: 'CN=Marie.Dubois,OU=Users,DC=nx-rh,DC=fr',
    isActive: true,
  })
  console.log(`  ✓ manager-mkt   : manager-marketing@nx-rh.fr (${managerMktDoc._id})`)

  const empADoc = await upsert('employee-a@nx-rh.fr', {
    firstName: 'Élodie',
    lastName: 'Martin',
    role: 'employee',
    department: 'Engineering',
    authSource: 'local',
    passwordHash: hash,
    position: 'Développeuse backend',
    isActive: true,
  })
  console.log(`  ✓ employee-a    : employee-a@nx-rh.fr (${empADoc._id})`)

  const empBDoc = await upsert('employee-b@nx-rh.fr', {
    firstName: 'Thomas',
    lastName: 'Petit',
    role: 'employee',
    department: 'Engineering',
    authSource: 'local',
    passwordHash: hash,
    position: 'Développeur frontend',
    isActive: true,
  })
  console.log(`  ✓ employee-b    : employee-b@nx-rh.fr (${empBDoc._id})`)

  const empCDoc = await upsert('employee-c@nx-rh.fr', {
    firstName: 'Sarah',
    lastName: 'Leroy',
    role: 'employee',
    department: 'Marketing',
    authSource: 'local',
    passwordHash: hash,
    position: 'Chargée de communication',
    isActive: true,
  })
  console.log(`  ✓ employee-c    : employee-c@nx-rh.fr (${empCDoc._id})`)

  const empDDoc = await upsert('employee-d@nx-rh.fr', {
    firstName: 'Antoine',
    lastName: 'Faure',
    role: 'employee',
    department: 'Finance',
    authSource: 'local',
    passwordHash: hash,
    position: 'Analyste financier',
    isActive: false,
  })
  console.log(`  ✓ employee-d    : employee-d@nx-rh.fr (${empDDoc._id}) [inactif]`)

  const empEDoc = await upsert('employee-e@nx-rh.fr', {
    firstName: 'Camille',
    lastName: 'Girard',
    role: 'employee',
    department: 'Engineering',
    authSource: 'ldap',
    ldapDn: 'CN=Camille.Girard,OU=Users,DC=nx-rh,DC=fr',
    position: 'DevOps engineer',
    isActive: true,
  })
  console.log(`  ✓ employee-e    : employee-e@nx-rh.fr (${empEDoc._id}) [ldap]`)

  const empOffDoc = await upsert('employee-offboarding@nx-rh.fr', {
    firstName: 'Nicolas',
    lastName: 'Rousseau',
    role: 'employee',
    department: 'Sales',
    authSource: 'local',
    passwordHash: hash,
    position: 'Commercial',
    isActive: true,
    offboardingStatus: 'offboarding',
  })
  console.log(`  ✓ offboarding   : employee-offboarding@nx-rh.fr (${empOffDoc._id})`)

  console.log('[seed-users-full] 11 utilisateurs upsertés')

  // ── Pass 2 : Mise à jour des managerId ───────────────────────────────────
  await Promise.all([
    User.findOneAndUpdate({ email: 'rh@nx-rh.fr' },                    { $set: { managerId: adminDoc._id } }),
    User.findOneAndUpdate({ email: 'direction@nx-rh.fr' },             { $set: { managerId: adminDoc._id } }),
    User.findOneAndUpdate({ email: 'manager-it@nx-rh.fr' },            { $set: { managerId: directionDoc._id } }),
    User.findOneAndUpdate({ email: 'manager-marketing@nx-rh.fr' },     { $set: { managerId: directionDoc._id } }),
    User.findOneAndUpdate({ email: 'employee-a@nx-rh.fr' },            { $set: { managerId: managerItDoc._id } }),
    User.findOneAndUpdate({ email: 'employee-b@nx-rh.fr' },            { $set: { managerId: managerItDoc._id } }),
    User.findOneAndUpdate({ email: 'employee-c@nx-rh.fr' },            { $set: { managerId: managerMktDoc._id } }),
    User.findOneAndUpdate({ email: 'employee-d@nx-rh.fr' },            { $set: { managerId: rhDoc._id } }),
    User.findOneAndUpdate({ email: 'employee-e@nx-rh.fr' },            { $set: { managerId: managerItDoc._id } }),
    User.findOneAndUpdate({ email: 'employee-offboarding@nx-rh.fr' },  { $set: { managerId: managerMktDoc._id } }),
  ])
  console.log('[seed-users-full] managerId définis')

  // ── Secteurs ──────────────────────────────────────────────────────────────
  const upsertSector = (name, data) =>
    Sector.findOneAndUpdate(
      { name },
      { $set: { ...data, createdBy: adminDoc._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

  const sectors = await Promise.all([
    upsertSector('Innovation', {
      color: '#17A8D4',
      description: 'Équipes produit, ingénierie et plateforme.',
    }),
    upsertSector('Fonctions Support', {
      color: '#7C3AED',
      description: 'RH, finance, juridique et opérations.',
    }),
    upsertSector('Commercial & Client', {
      color: '#F97316',
      description: 'Sales, marketing et customer success.',
    }),
  ])
  sectors.forEach(s => console.log(`  ✓ secteur : ${s.name} (${s._id})`))
  console.log('[seed-users-full] 3 secteurs upsertés')

  // ── Résumé ────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════')
  console.log('  SEED USERS FULL TERMINÉ ✓')
  console.log('══════════════════════════════════════════════════════════════')
  console.log('  Comptes disponibles (mot de passe : Test1234!) :')
  console.log('    admin@nx-rh.fr                  → Admin (Alice Moreau)')
  console.log('    rh@nx-rh.fr                     → RH (Hugo Lambert)')
  console.log('    direction@nx-rh.fr              → Directrice (Claire Bernard)')
  console.log('    manager-it@nx-rh.fr             → Manager IT (Julien Robert)')
  console.log('    manager-marketing@nx-rh.fr      → Manager Mkt (Marie Dubois) [ldap]')
  console.log('    employee-a@nx-rh.fr             → Élodie Martin — Dév. backend')
  console.log('    employee-b@nx-rh.fr             → Thomas Petit — Dév. frontend')
  console.log('    employee-c@nx-rh.fr             → Sarah Leroy — Chargée de comm.')
  console.log('    employee-d@nx-rh.fr             → Antoine Faure — Analyste [inactif]')
  console.log('    employee-e@nx-rh.fr             → Camille Girard — DevOps [ldap]')
  console.log('    employee-offboarding@nx-rh.fr   → Nicolas Rousseau — Commercial [offboarding]')
  console.log('══════════════════════════════════════════════════════════════\n')
}

module.exports = { seedUsers }

if (require.main === module) {
  seedUsers()
    .then(() => process.exit(0))
    .catch(e => { console.error('[seed-users-full] Erreur :', e); process.exit(1) })
}
