// =============================================================================
// database/seed-demo.js — Données de démonstration complètes
//
// Crée un jeu de données complet pour tester toutes les fonctionnalités :
//   - 1 admin, 1 HR, 1 directeur, 2 managers, 6 employés
//   - 1 campagne active avec évaluations assignées
//   - 2 formulaires (auto-évaluation + upward feedback)
//   - Événements calendrier + ressources
//
// Usage :  cd /path/to/NX/mongo/database && node seed-demo.js
// =============================================================================

// Resolve modules from the server directory (where node_modules live)
const path = require('path')
const serverDir = path.resolve(__dirname, '../server')
const resolve = (mod) => require(path.join(serverDir, 'node_modules', mod))

resolve('dotenv').config({ path: path.join(serverDir, '.env') })

const bcrypt = resolve('bcrypt')
const { connect } = require('../server/config/db')
const { User, Campaign, Form, Event, Evaluation, Resource } = require('../server/models')

const PASSWORD = 'Test1234!'

async function seedDemo() {
  await connect()
  console.log('[seed-demo] Connecté à MongoDB')

  // ── Nettoyage complet ─────────────────────────────────────────────────────
  await Promise.all([
    User.deleteMany({}),
    Campaign.deleteMany({}),
    Form.deleteMany({}),
    Event.deleteMany({}),
    Evaluation.deleteMany({}),
    Resource.deleteMany({}),
  ])
  console.log('[seed-demo] Collections vidées')

  // ── Hash partagé ──────────────────────────────────────────────────────────
  const hash = await bcrypt.hash(PASSWORD, 12)

  // ── Utilisateurs ──────────────────────────────────────────────────────────
  const admin = await User.create({
    email: 'admin@nanoxplore.com', passwordHash: hash,
    firstName: 'Alice', lastName: 'Admin', role: 'admin',
    department: 'HR', authSource: 'local',
  })

  const hr = await User.create({
    email: 'hr@nanoxplore.com', passwordHash: hash,
    firstName: 'Hugo', lastName: 'Ressources', role: 'hr',
    department: 'HR', authSource: 'local',
  })

  const director = await User.create({
    email: 'directeur@nanoxplore.com', passwordHash: hash,
    firstName: 'David', lastName: 'Directeur', role: 'director',
    department: 'Engineering', authSource: 'local',
  })

  const manager1 = await User.create({
    email: 'manager1@nanoxplore.com', passwordHash: hash,
    firstName: 'Marie', lastName: 'Manager', role: 'manager',
    department: 'Engineering', managerId: director._id, authSource: 'local',
  })

  const manager2 = await User.create({
    email: 'manager2@nanoxplore.com', passwordHash: hash,
    firstName: 'Marc', lastName: 'Manager', role: 'manager',
    department: 'Marketing', managerId: director._id, authSource: 'local',
  })

  // 3 employés Engineering (sous manager1)
  const emp1 = await User.create({
    email: 'emp1@nanoxplore.com', passwordHash: hash,
    firstName: 'Émile', lastName: 'Dupont', role: 'employee',
    department: 'Engineering', position: 'Développeur senior', managerId: manager1._id, authSource: 'local',
  })
  const emp2 = await User.create({
    email: 'emp2@nanoxplore.com', passwordHash: hash,
    firstName: 'Sophie', lastName: 'Martin', role: 'employee',
    department: 'Engineering', position: 'Développeuse front-end', managerId: manager1._id, authSource: 'local',
  })
  const emp3 = await User.create({
    email: 'emp3@nanoxplore.com', passwordHash: hash,
    firstName: 'Thomas', lastName: 'Bernard', role: 'employee',
    department: 'Engineering', position: 'DevOps', managerId: manager1._id, authSource: 'local',
  })

  // 3 employés Marketing (sous manager2)
  const emp4 = await User.create({
    email: 'emp4@nanoxplore.com', passwordHash: hash,
    firstName: 'Julie', lastName: 'Petit', role: 'employee',
    department: 'Marketing', position: 'Chef de projet marketing', managerId: manager2._id, authSource: 'local',
  })
  const emp5 = await User.create({
    email: 'emp5@nanoxplore.com', passwordHash: hash,
    firstName: 'Lucas', lastName: 'Moreau', role: 'employee',
    department: 'Marketing', position: 'Chargé de communication', managerId: manager2._id, authSource: 'local',
  })
  const emp6 = await User.create({
    email: 'emp6@nanoxplore.com', passwordHash: hash,
    firstName: 'Camille', lastName: 'Roux', role: 'employee',
    department: 'Marketing', position: 'Graphiste', managerId: manager2._id, authSource: 'local',
  })

  console.log('[seed-demo] 11 utilisateurs créés')
  console.log('  admin     : admin@nanoxplore.com')
  console.log('  hr        : hr@nanoxplore.com')
  console.log('  directeur : directeur@nanoxplore.com')
  console.log('  manager1  : manager1@nanoxplore.com (Engineering)')
  console.log('  manager2  : manager2@nanoxplore.com (Marketing)')
  console.log('  emp1-3    : emp1-3@nanoxplore.com   (Engineering)')
  console.log('  emp4-6    : emp4-6@nanoxplore.com   (Marketing)')
  console.log(`  Mot de passe commun : ${PASSWORD}`)

  // ── Campagne active ───────────────────────────────────────────────────────
  const campaign = await Campaign.create({
    name:             'Entretiens annuels 2026',
    description:      'Cycle d\'évaluation annuel — tous les collaborateurs',
    startDate:        new Date('2026-04-01'),
    endDate:          new Date('2026-06-30'),
    status:           'active',
    targetDepartments: ['Engineering', 'Marketing'],
    createdBy:        admin._id,
  })
  console.log('[seed-demo] Campagne "Entretiens annuels 2026" créée (active)')

  // ── Formulaires ───────────────────────────────────────────────────────────
  // Formulaire annuel complet — les IDs des questions sont préfixés par phase
  // (self_, n1_, obj_, asp_) pour permettre le découpage phase par phase côté front.
  const formAnnuel = await Form.create({
    campaignId: campaign._id,
    title:      'Entretien annuel 2026',
    formType:   'self_evaluation',
    isAnonymous: false,
    createdBy:  admin._id,
    questions: [
      // Phase auto-évaluation
      { id: 'self_q1', type: 'rating',  scale: 5, label: 'Maîtrise technique',                                         required: true },
      { id: 'self_q2', type: 'rating',  scale: 5, label: 'Collaboration',                                              required: true },
      { id: 'self_q3', type: 'yes_no',            label: 'Avez-vous atteint vos objectifs de l\'année ?',              required: true },
      { id: 'self_q4', type: 'text',              label: 'Réalisations clés',                                          required: true },
      { id: 'self_q5', type: 'text',              label: 'Axes d\'amélioration',                                       required: false },
      // Phase bilan N-1
      { id: 'n1_q1',   type: 'rating',  scale: 5, label: 'Atteinte des objectifs fixés',                              required: true },
      { id: 'n1_q2',   type: 'text',              label: 'Bilan qualitatif',                                           required: true },
      { id: 'n1_q3',   type: 'choice',            label: 'Niveau de satisfaction globale',
        options: ['Très satisfait(e)', 'Satisfait(e)', 'Neutre', 'Insatisfait(e)', 'Très insatisfait(e)'],               required: false },
      // Phase objectifs
      { id: 'obj_q1',  type: 'text',              label: 'Objectif prioritaire',                                       required: true },
      { id: 'obj_q2',  type: 'text',              label: 'Deuxième objectif',                                          required: false },
      { id: 'obj_q3',  type: 'yes_no',            label: 'Souhaitez-vous une formation pour atteindre ces objectifs ?', required: false },
      { id: 'obj_q4',  type: 'text',              label: 'Compétences à développer',                                   required: false },
      // Phase aspirations
      { id: 'asp_q1',  type: 'choice',            label: 'Horizon d\'évolution envisagé',
        options: ['Moins d\'un an', '1 à 2 ans', '3 à 5 ans', '5 ans et plus'],                                         required: false },
      { id: 'asp_q2',  type: 'text',              label: 'Aspirations à court terme',                                  required: false },
      { id: 'asp_q3',  type: 'text',              label: 'Vision à long terme',                                        required: false },
      { id: 'asp_q4',  type: 'yes_no',            label: 'Seriez-vous intéressé(e) par une mobilité interne ?',        required: false },
    ],
  })

  const formUpward = await Form.create({
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
  console.log('[seed-demo] 2 formulaires créés')

  // ── Évaluations assignées ─────────────────────────────────────────────────
  const allEmployees = [emp1, emp2, emp3, emp4, emp5, emp6]
  const evaluations = []

  // Auto-évaluations pour chaque employé
  for (const emp of allEmployees) {
    evaluations.push({
      campaignId:  campaign._id,
      formId:      formAnnuel._id,
      evaluatorId: emp._id,
      evaluateeId: emp._id,
      status:      'assigned',
      answers:     [],
    })
  }

  // Upward feedback : chaque employé évalue son manager
  for (const emp of [emp1, emp2, emp3]) {
    evaluations.push({
      campaignId:  campaign._id,
      formId:      formUpward._id,
      evaluatorId: emp._id,
      evaluateeId: manager1._id,
      status:      'assigned',
      answers:     [],
    })
  }
  for (const emp of [emp4, emp5, emp6]) {
    evaluations.push({
      campaignId:  campaign._id,
      formId:      formUpward._id,
      evaluatorId: emp._id,
      evaluateeId: manager2._id,
      status:      'assigned',
      answers:     [],
    })
  }

  // emp1 : auto-évaluation soumise (toutes les phases remplies)
  evaluations[0].status = 'submitted'
  evaluations[0].answers = [
    { questionId: 'self_q1', value: 4 },
    { questionId: 'self_q2', value: 5 },
    { questionId: 'self_q3', value: 'yes' },
    { questionId: 'self_q4', value: 'Bonne maîtrise technique, esprit d\'équipe, livraison du module auth en avance.' },
    { questionId: 'self_q5', value: 'Gestion du temps sur les projets longs, communication écrite.' },
    { questionId: 'n1_q1',   value: 4 },
    { questionId: 'n1_q2',   value: 'Objectifs globalement atteints malgré un contexte tendu Q3.' },
    { questionId: 'n1_q3',   value: 'Satisfait(e)' },
    { questionId: 'obj_q1',  value: 'Prise en charge d\'un module critique (microservice paiement)' },
    { questionId: 'obj_q2',  value: 'Certification AWS Cloud Practitioner avant juin 2026' },
    { questionId: 'obj_q3',  value: 'yes' },
    { questionId: 'obj_q4',  value: 'Architecture cloud, tests d\'intégration.' },
    { questionId: 'asp_q1',  value: '3 à 5 ans' },
    { questionId: 'asp_q2',  value: 'Approfondissement DevOps et CI/CD.' },
    { questionId: 'asp_q3',  value: 'Lead technique ou architecte sur un projet stratégique.' },
    { questionId: 'asp_q4',  value: 'no' },
  ]

  // emp2 : auto-évaluation en cours (phase objectives remplie — pour tester EmployeeGoals)
  evaluations[1].status = 'in_progress'
  evaluations[1].answers = [
    { questionId: 'self_q1', value: 3 },
    { questionId: 'self_q2', value: 4 },
    { questionId: 'self_q3', value: 'yes' },
    { questionId: 'self_q4', value: 'Refonte complète du design system, 12 composants livrés.' },
    { questionId: 'obj_q1',  value: 'Améliorer la couverture de tests front (objectif : 80%)' },
    { questionId: 'obj_q2',  value: 'Migrer 3 pages legacy vers la nouvelle stack React' },
    { questionId: 'obj_progress_obj_q1', value: 35 },
    { questionId: 'obj_progress_obj_q2', value: 67 },
  ]

  await Evaluation.insertMany(evaluations)
  console.log(`[seed-demo] ${evaluations.length} évaluations créées (1 soumise, 1 en cours)`)

  // ── Événements calendrier ─────────────────────────────────────────────────
  await Event.insertMany([
    { title: 'Lancement campagne 2026',         date: new Date('2026-04-01'), type: 'deadline',  createdBy: admin._id, targetRoles: ['employee', 'manager', 'director'] },
    { title: 'Deadline auto-évaluations',        date: new Date('2026-04-30'), type: 'deadline',  createdBy: admin._id, targetRoles: ['employee', 'manager'] },
    { title: 'Période entretiens manager',       date: new Date('2026-05-15'), type: 'interview', createdBy: admin._id, targetRoles: ['manager', 'director', 'admin'] },
    { title: 'Clôture campagne 2026',            date: new Date('2026-06-30'), type: 'deadline',  createdBy: admin._id },
    { title: 'Comité de calibration direction',  date: new Date('2026-05-25'), type: 'interview', createdBy: admin._id, targetRoles: ['director', 'hr', 'admin'] },
  ])
  console.log('[seed-demo] 5 événements calendrier créés')

  // ── Ressources ────────────────────────────────────────────────────────────
  await Resource.insertMany([
    { title: 'Guide de l\'auto-évaluation',     description: 'Comment bien remplir son auto-évaluation', type: 'pdf', filename: 'guide-auto-evaluation.pdf', status: 'published', createdBy: admin._id },
    { title: 'Charte des entretiens annuels',   description: 'Règles et bonnes pratiques',               type: 'pdf', filename: 'charte-entretiens.pdf',      status: 'published', createdBy: admin._id },
    { title: 'Grille de compétences',            description: 'Référentiel de compétences par métier',    type: 'xlsx', filename: 'grille-competences.xlsx',   status: 'published', createdBy: admin._id },
  ])
  console.log('[seed-demo] 3 ressources créées')

  // ── Résumé ────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════')
  console.log('  SEED DEMO TERMINÉ ✓')
  console.log('══════════════════════════════════════════════════════════════')
  console.log('  Comptes disponibles (mot de passe : Test1234!) :')
  console.log('    admin@nanoxplore.com      → Admin')
  console.log('    hr@nanoxplore.com         → RH')
  console.log('    directeur@nanoxplore.com  → Directeur')
  console.log('    manager1@nanoxplore.com   → Manager Engineering')
  console.log('    manager2@nanoxplore.com   → Manager Marketing')
  console.log('    emp1@nanoxplore.com       → Employé (auto-éval soumise)')
  console.log('    emp2-6@nanoxplore.com     → Employés')
  console.log('══════════════════════════════════════════════════════════════\n')

  process.exit(0)
}

seedDemo().catch(err => {
  console.error('[seed-demo] Erreur :', err.message)
  process.exit(1)
})
