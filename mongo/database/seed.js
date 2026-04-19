// =============================================================================
// database/seed.js — Données initiales
//
// Crée un admin local, une campagne exemple et quelques événements calendrier.
// À exécuter UNE SEULE FOIS après le premier démarrage :
//   cd server && npm run seed
// =============================================================================

require('dotenv').config({ path: require('path').resolve(__dirname, '../server/.env') })

const bcrypt = require('bcrypt')
const { connect } = require('../server/config/db')
const { User, Campaign, Form, Event } = require('../server/models')

async function seed() {
  await connect()
  console.log('[seed] Connecté')

  // ── Admin ──────────────────────────────────────────────────────────────────
  const existing = await User.findOne({ email: 'admin@nanoxplore.com' })
  if (existing) {
    console.log('[seed] Admin déjà présent — skip')
  } else {
    const passwordHash = await bcrypt.hash('Admin1234!', 12)
    await User.create({
      email:        'admin@nanoxplore.com',
      passwordHash,
      firstName:    'Admin',
      lastName:     'RH',
      role:         'admin',
      department:   'RH',
      authSource:   'local',
    })
    console.log('[seed] Admin créé : admin@nanoxplore.com (mot de passe dans .env ou communiqué séparément)')
  }

  const admin = await User.findOne({ email: 'admin@nanoxplore.com' })
  if (!admin) {
    console.error('[seed] ERREUR : admin introuvable après création — abandon')
    process.exit(1)
  }

  // ── Comptes de test par rôle ───────────────────────────────────────────────
  const testUsers = [
    { email: 'hr@nanoxplore.com',       firstName: 'Camille',   lastName: 'Dupont',    role: 'hr',       department: 'RH',          password: 'Hr1234!' },
    { email: 'director@nanoxplore.com', firstName: 'Laurent',   lastName: 'Martin',    role: 'director', department: 'Executive',    password: 'Director1234!' },
    { email: 'manager@nanoxplore.com',  firstName: 'Sophie',    lastName: 'Bernard',   role: 'manager',  department: 'Engineering',  password: 'Manager1234!' },
    { email: 'employee@nanoxplore.com', firstName: 'Thomas',    lastName: 'Leroy',     role: 'employee', department: 'Engineering',  password: 'Employee1234!' },
  ]

  for (const u of testUsers) {
    const exists = await User.findOne({ email: u.email })
    if (exists) {
      console.log(`[seed] ${u.role} déjà présent — skip`)
    } else {
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
      console.log(`[seed] ${u.role} créé : ${u.email}`)
    }
  }

  // Rattacher employee et manager au bon manager
  const managerUser  = await User.findOne({ email: 'manager@nanoxplore.com' })
  const employeeUser = await User.findOne({ email: 'employee@nanoxplore.com' })
  if (managerUser && employeeUser && !employeeUser.managerId) {
    await User.findByIdAndUpdate(employeeUser._id, { managerId: managerUser._id })
    console.log('[seed] employee rattaché au manager')
  }

  // ── Campagne exemple ───────────────────────────────────────────────────────
  const campExists = await Campaign.findOne({ name: 'Entretiens annuels 2026' })
  if (!campExists) {
    const campaign = await Campaign.create({
      name:        'Entretiens annuels 2026',
      description: 'Cycle d\'évaluation annuel — tous les collaborateurs',
      startDate:   new Date('2026-04-01'),
      endDate:     new Date('2026-06-30'),
      status:      'draft',
      createdBy:   admin._id,
    })

    // Formulaire d'auto-évaluation exemple
    await Form.create({
      campaignId: campaign._id,
      title:      'Auto-évaluation 2026',
      formType:   'self_evaluation',
      isAnonymous: false,
      createdBy:  admin._id,
      questions: [
        { id: 'q1', type: 'rating', scale: 5, label: 'Comment évaluez-vous votre performance globale ?', required: true },
        { id: 'q2', type: 'text',              label: 'Quels sont vos points forts cette année ?',        required: true },
        { id: 'q3', type: 'text',              label: 'Quels axes d\'amélioration identifiez-vous ?',     required: true },
        { id: 'q4', type: 'yes_no',            label: 'Avez-vous atteint vos objectifs fixés ?',          required: true },
      ],
    })

    // Formulaire upward feedback exemple (forcé anonyme)
    await Form.create({
      campaignId: campaign._id,
      title:      'Évaluation de votre manager',
      formType:   'upward_feedback',
      createdBy:  admin._id,
      questions: [
        { id: 'q1', type: 'rating', scale: 5, label: 'Votre manager communique clairement les objectifs.',           required: true },
        { id: 'q2', type: 'rating', scale: 5, label: 'Votre manager vous soutient dans votre développement.',        required: true },
        { id: 'q3', type: 'text',              label: 'Qu\'est-ce qui pourrait être amélioré dans le management ?',  required: false },
      ],
    })

    console.log('[seed] Campagne + 2 formulaires créés')
  }

  // ── Événements calendrier ─────────────────────────────────────────────────
  const eventsExist = await Event.countDocuments()
  if (eventsExist === 0) {
    await Event.insertMany([
      { title: 'Deadline auto-évaluations', date: new Date('2026-04-30'), type: 'deadline',  createdBy: admin._id, targetRoles: ['employee', 'manager'] },
      { title: 'Période entretiens manager', date: new Date('2026-05-15'), type: 'interview', createdBy: admin._id, targetRoles: ['manager', 'director', 'admin'] },
      { title: 'Clôture campagne 2026',      date: new Date('2026-06-30'), type: 'deadline',  createdBy: admin._id },
    ])
    console.log('[seed] Événements calendrier créés')
  }

  console.log('[seed] Terminé ✓')
  process.exit(0)
}

seed().catch(err => {
  console.error('[seed] Erreur :', err.message)
  process.exit(1)
})
