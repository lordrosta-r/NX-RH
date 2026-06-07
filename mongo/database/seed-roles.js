// seed-roles.js — Run inside /app container
// Adds one test account per role (idempotent)
const bcrypt = require('bcrypt')
const { connect } = require('./config/db')
const { User } = require('./models')

async function seed() {
  await connect()
  console.log('[seed-roles] Connecté')

  const testUsers = [
    { email: 'hr@nanoxplore.com',       firstName: 'Camille', lastName: 'Dupont',  role: 'hr',       department: 'RH',         password: 'Hr1234!' },
    { email: 'director@nanoxplore.com', firstName: 'Laurent', lastName: 'Martin',  role: 'director', department: 'Executive',    password: 'Director1234!' },
    { email: 'manager@nanoxplore.com',  firstName: 'Sophie',  lastName: 'Bernard', role: 'manager',  department: 'Engineering', password: 'Manager1234!' },
    { email: 'employee@nanoxplore.com', firstName: 'Thomas',  lastName: 'Leroy',   role: 'employee', department: 'Engineering', password: 'Employee1234!' },
  ]

  for (const u of testUsers) {
    const exists = await User.findOne({ email: u.email })
    if (exists) {
      console.log(`[seed-roles] ${u.role} déjà présent — skip`)
    } else {
      const passwordHash = await bcrypt.hash(u.password, 12)
      await User.create({ email: u.email, passwordHash, firstName: u.firstName, lastName: u.lastName, role: u.role, department: u.department, authSource: 'local' })
      console.log(`[seed-roles] ${u.role} créé : ${u.email}`)
    }
  }

  // Rattacher employee au manager
  const managerUser  = await User.findOne({ email: 'manager@nanoxplore.com' })
  const employeeUser = await User.findOne({ email: 'employee@nanoxplore.com' })
  if (managerUser && employeeUser && !employeeUser.managerId) {
    await User.findByIdAndUpdate(employeeUser._id, { managerId: managerUser._id })
    console.log('[seed-roles] employee rattaché au manager')
  }

  console.log('[seed-roles] Terminé ✓')
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
