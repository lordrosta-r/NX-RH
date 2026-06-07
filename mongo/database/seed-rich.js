// =============================================================================
// database/seed-rich.js — Jeu de données riche pour NanoXplore RH
//
// Crée 3 campagnes (N-2 2024, N-1 2025, 2026 actuelle) avec des évaluations
// réalistes, des demandes de mobilité/salaire, une contestation et un mix de
// statuts pour la campagne en cours.
//
// Usage :
//   cd mongo/server && npm run seed:rich
//
// Idempotence :
//   - Campagnes / formulaires / évaluations : supprimés et recréés
//   - Utilisateurs : upsert par email (mot de passe forcé à Test1234!)
// =============================================================================

const path      = require('path')
const serverDir = path.resolve(__dirname, '../server')
const resolve   = (mod) => require(path.join(serverDir, 'node_modules', mod))

resolve('dotenv').config({ path: path.join(serverDir, '.env') })

// Fallback si MONGO_URI absent du .env (exécution hors Docker)
if (!process.env.MONGO_URI) {
  process.env.MONGO_URI = 'mongodb://mongo:27017/nanoxplore_rh'
}

const bcrypt    = resolve('bcrypt')
const { connect }                     = require('../server/config/db')
const { User, Campaign, Form, Evaluation } = require('../server/models')

const PASSWORD = 'Test1234!'

// ─── Helpers réponses ────────────────────────────────────────────────────────

/**
 * Construit un tableau de réponses pour le formulaire d'auto-évaluation.
 * s5 (mobilité) et s6 (rémunération) sont optionnels — omis si null/undefined/''.
 */
function fullSelfAnswers({ s1, s2, s3, s4, s5, s6 }) {
  const answers = [
    { questionId: 's1', value: s1 },
    { questionId: 's2', value: s2 },
    { questionId: 's3', value: s3 },
    { questionId: 's4', value: s4 },
  ]
  if (s5) answers.push({ questionId: 's5', value: s5 })
  if (s6) answers.push({ questionId: 's6', value: s6 })
  return answers
}

/** Réponses partielles (statut in_progress) — ratings obligatoires uniquement */
function partialSelfAnswers(s1, s3) {
  return [
    { questionId: 's1', value: s1 },
    { questionId: 's3', value: s3 },
  ]
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function seedRich() {
  await connect()
  console.log('[seed:rich] Connecté à MongoDB')

  const hash = await bcrypt.hash(PASSWORD, 12)

  // ── Utilisateurs (upsert by email) ─────────────────────────────────────────
  // findOneAndUpdate ne déclenche pas les pre-save hooks — passwordHash passé
  // déjà haché. $set met à jour les champs y compris pour les docs existants.

  async function upsertUser({ email, firstName, lastName, role, department, position }) {
    return User.findOneAndUpdate(
      { email },
      {
        $set: {
          firstName,
          lastName,
          role,
          department,
          passwordHash: hash,
          authSource:   'local',
          ...(position ? { position } : {}),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
  }

  const admin = await upsertUser({ email: 'admin@nanoxplore.com',          firstName: 'Alice',   lastName: 'Admin',    role: 'admin',   department: 'HR',          position: 'Administratrice système' })
  /* hr */      await upsertUser({ email: 'hr@nanoxplore.com',              firstName: 'Sophie',  lastName: 'Moreau',   role: 'hr',      department: 'HR',          position: 'Responsable RH' })

  // Managers
  const mgr1 = await upsertUser({ email: 'thomas.dupont@nanoxplore.com',   firstName: 'Thomas',  lastName: 'Dupont',   role: 'manager', department: 'Design',      position: 'Manager Design' })
  const mgr2 = await upsertUser({ email: 'pierre.rousseau@nanoxplore.com', firstName: 'Pierre',  lastName: 'Rousseau', role: 'manager', department: 'Engineering', position: 'Manager Engineering' })
  const mgr3 = await upsertUser({ email: 'camille.dubois@nanoxplore.com',  firstName: 'Camille', lastName: 'Dubois',   role: 'manager', department: 'Product',     position: 'Manager Product' })

  // Employés
  const emp1 = await upsertUser({ email: 'alice.fabre@nanoxplore.com',     firstName: 'Alice',   lastName: 'Fabre',    role: 'employee', department: 'Engineering', position: 'Développeuse fullstack' })
  const emp2 = await upsertUser({ email: 'bob.leroux@nanoxplore.com',      firstName: 'Bob',     lastName: 'Leroux',   role: 'employee', department: 'Engineering', position: 'Ingénieur backend' })
  const emp3 = await upsertUser({ email: 'lucas.bernard@nanoxplore.com',   firstName: 'Lucas',   lastName: 'Bernard',  role: 'employee', department: 'Engineering', position: 'Développeur DevOps' })
  const emp4 = await upsertUser({ email: 'emma.petit@nanoxplore.com',      firstName: 'Emma',    lastName: 'Petit',    role: 'employee', department: 'Engineering', position: 'Lead développeuse' })
  const emp5 = await upsertUser({ email: 'nathan.martin@nanoxplore.com',   firstName: 'Nathan',  lastName: 'Martin',   role: 'employee', department: 'Product',     position: 'Product Manager' })
  const emp6 = await upsertUser({ email: 'lea.durand@nanoxplore.com',      firstName: 'Léa',     lastName: 'Durand',   role: 'employee', department: 'Product',     position: 'Product Owner' })
  const emp7 = await upsertUser({ email: 'hugo.lambert@nanoxplore.com',    firstName: 'Hugo',    lastName: 'Lambert',  role: 'employee', department: 'Design',      position: 'Designer UI/UX' })

  console.log('[seed:rich] 12 utilisateurs upsertés')

  // Rattacher les employés à leurs managers
  await User.bulkWrite([
    { updateOne: { filter: { _id: emp1._id }, update: { $set: { managerId: mgr2._id } } } },
    { updateOne: { filter: { _id: emp2._id }, update: { $set: { managerId: mgr2._id } } } },
    { updateOne: { filter: { _id: emp3._id }, update: { $set: { managerId: mgr2._id } } } },
    { updateOne: { filter: { _id: emp4._id }, update: { $set: { managerId: mgr2._id } } } },
    { updateOne: { filter: { _id: emp5._id }, update: { $set: { managerId: mgr3._id } } } },
    { updateOne: { filter: { _id: emp6._id }, update: { $set: { managerId: mgr3._id } } } },
    { updateOne: { filter: { _id: emp7._id }, update: { $set: { managerId: mgr1._id } } } },
  ])
  console.log('[seed:rich] Relations hiérarchiques mises à jour')

  // ── Nettoyage idempotent ────────────────────────────────────────────────────
  const CAMPAIGN_NAMES = ['Entretiens annuels 2024', 'Entretiens annuels 2025', 'Entretiens annuels 2026']
  const FORM_TITLES    = ['Auto-évaluation annuelle', 'Évaluation manager annuelle']

  const oldCampaigns = await Campaign.find({ name: { $in: CAMPAIGN_NAMES } }, '_id').lean()
  const oldCampIds   = oldCampaigns.map(c => c._id)

  await Promise.all([
    Campaign.deleteMany({ name: { $in: CAMPAIGN_NAMES } }),
    Form.deleteMany({ title: { $in: FORM_TITLES } }),
    Evaluation.deleteMany({ campaignId: { $in: oldCampIds } }),
  ])
  console.log('[seed:rich] Données précédentes supprimées')

  // ── Formulaires templates (campaignId: null = bibliothèque réutilisable) ───

  const selfForm = await Form.create({
    campaignId:  null,
    title:       'Auto-évaluation annuelle',
    description: 'Formulaire d\'auto-évaluation pour les entretiens annuels.',
    formType:    'self_evaluation',
    isAnonymous: false,
    createdBy:   admin._id,
    questions: [
      { id: 's1', type: 'rating', scale: 5, label: 'Comment évaluez-vous vos performances globales cette année ?',        required: true,  phase: 'all'        },
      { id: 's2', type: 'text',              label: 'Quelles ont été vos principales réalisations ?',                     required: true,  phase: 'self'       },
      { id: 's3', type: 'rating', scale: 5, label: 'Comment évaluez-vous votre collaboration avec l\'équipe ?',          required: true,  phase: 'all'        },
      { id: 's4', type: 'text',              label: 'Quels sont vos objectifs pour la prochaine période ?',               required: true,  phase: 'objectives' },
      { id: 's5', type: 'text',              label: 'Avez-vous des aspirations de mobilité ou d\'évolution ?',           required: false, phase: 'aspirations' },
      { id: 's6', type: 'text',              label: 'Y a-t-il des points de rémunération que vous souhaitez aborder ?', required: false, phase: 'aspirations' },
    ],
  })

  /* mgrForm — créé comme template RH, non utilisé dans ce seed pour les évaluations */
  await Form.create({
    campaignId:  null,
    title:       'Évaluation manager annuelle',
    description: 'Formulaire d\'évaluation du collaborateur par son manager.',
    formType:    'manager_evaluation',
    isAnonymous: false,
    createdBy:   admin._id,
    questions: [
      { id: 'm1', type: 'rating', scale: 5, label: 'Évaluez les performances globales du collaborateur',  required: true,  phase: 'all'        },
      { id: 'm2', type: 'text',              label: 'Points forts observés',                              required: true,  phase: 'n-1'        },
      { id: 'm3', type: 'rating', scale: 5, label: 'Maîtrise technique et compétences métier',            required: true,  phase: 'n-1'        },
      { id: 'm4', type: 'text',              label: 'Axes d\'amélioration recommandés',                   required: false, phase: 'n-1'        },
      { id: 'm5', type: 'text',              label: 'Recommandation pour évolution ou mobilité',          required: false, phase: 'aspirations' },
    ],
  })

  console.log('[seed:rich] 2 formulaires templates créés')

  const now = new Date()

  // ── Campagne N-2 (2024) — closed, toutes les évaluations validées ───────────

  const camp2024 = await Campaign.create({
    name:        'Entretiens annuels 2024',
    description: 'Cycle d\'évaluation annuel 2024 — clôturé.',
    startDate:   new Date('2024-01-15'),
    endDate:     new Date('2024-03-31'),
    status:      'closed',
    createdBy:   admin._id,
  })

  const evals2024 = [
    // emp1 — Alice Fabre (Engineering)
    {
      campaignId: camp2024._id, formId: selfForm._id,
      evaluatorId: emp1._id, evaluateeId: emp1._id,
      status: 'validated', lastSavedAt: now,
      signedByEvaluateeAt: new Date('2024-02-25'),
      signedByManagerAt:   new Date('2024-03-08'),
      signedByHrAt:        new Date('2024-03-25'),
      answers: fullSelfAnswers({
        s1: 4,
        s2: 'Livraison du module de reporting avec 2 semaines d\'avance. Réduction des incidents de production de 40 %.',
        s3: 5,
        s4: 'Prendre en charge l\'architecture du service de notifications et contribuer à la migration cloud.',
      }),
    },
    // emp2 — Bob Leroux (Engineering)
    {
      campaignId: camp2024._id, formId: selfForm._id,
      evaluatorId: emp2._id, evaluateeId: emp2._id,
      status: 'validated', lastSavedAt: now,
      signedByEvaluateeAt: new Date('2024-02-26'),
      signedByManagerAt:   new Date('2024-03-09'),
      signedByHrAt:        new Date('2024-03-25'),
      answers: fullSelfAnswers({
        s1: 4,
        s2: 'Migration de l\'API REST vers GraphQL avec zéro interruption de service. Formation de 2 collègues juniors.',
        s3: 4,
        s4: 'Améliorer la couverture de tests unitaires à 85 % et contribuer à la documentation technique interne.',
      }),
    },
    // emp3 — Lucas Bernard (Engineering)
    {
      campaignId: camp2024._id, formId: selfForm._id,
      evaluatorId: emp3._id, evaluateeId: emp3._id,
      status: 'validated', lastSavedAt: now,
      signedByEvaluateeAt: new Date('2024-02-27'),
      signedByManagerAt:   new Date('2024-03-10'),
      signedByHrAt:        new Date('2024-03-26'),
      answers: fullSelfAnswers({
        s1: 3,
        s2: 'Optimisation des pipelines CI/CD : réduction du temps de build de 25 %. Gestion des incidents P1 en autonomie.',
        s3: 4,
        s4: 'Monter en compétences sur Kubernetes et automatiser les déploiements de production.',
      }),
    },
    // emp4 — Emma Petit (Engineering)
    {
      campaignId: camp2024._id, formId: selfForm._id,
      evaluatorId: emp4._id, evaluateeId: emp4._id,
      status: 'validated', lastSavedAt: now,
      signedByEvaluateeAt: new Date('2024-02-28'),
      signedByManagerAt:   new Date('2024-03-11'),
      signedByHrAt:        new Date('2024-03-26'),
      answers: fullSelfAnswers({
        s1: 4,
        s2: 'Développement de 8 fonctionnalités majeures sans régression. Leadership technique reconnu sur le sprint Q4.',
        s3: 4,
        s4: 'Explorer le rôle de tech lead sur un projet transversal et encadrer des développeurs juniors.',
      }),
    },
    // emp5 — Nathan Martin (Product)
    {
      campaignId: camp2024._id, formId: selfForm._id,
      evaluatorId: emp5._id, evaluateeId: emp5._id,
      status: 'validated', lastSavedAt: now,
      signedByEvaluateeAt: new Date('2024-02-27'),
      signedByManagerAt:   new Date('2024-03-10'),
      signedByHrAt:        new Date('2024-03-27'),
      answers: fullSelfAnswers({
        s1: 4,
        s2: 'Lancement réussi du produit B2B avec +200 clients en 6 mois. Conduite de 50 interviews utilisateurs documentées.',
        s3: 5,
        s4: 'Définir la roadmap produit 2025 et structurer les rituels agile de l\'équipe.',
      }),
    },
    // emp6 — Léa Durand (Product)
    {
      campaignId: camp2024._id, formId: selfForm._id,
      evaluatorId: emp6._id, evaluateeId: emp6._id,
      status: 'validated', lastSavedAt: now,
      signedByEvaluateeAt: new Date('2024-02-28'),
      signedByManagerAt:   new Date('2024-03-12'),
      signedByHrAt:        new Date('2024-03-27'),
      answers: fullSelfAnswers({
        s1: 3,
        s2: 'Refonte de l\'expérience onboarding avec +30 % de taux de complétion. Coordination fluide Design/Ingénierie.',
        s3: 4,
        s4: 'Prendre en charge le périmètre mobile et développer une expertise UX approfondie.',
      }),
    },
    // emp7 — Hugo Lambert (Design)
    {
      campaignId: camp2024._id, formId: selfForm._id,
      evaluatorId: emp7._id, evaluateeId: emp7._id,
      status: 'validated', lastSavedAt: now,
      signedByEvaluateeAt: new Date('2024-02-24'),
      signedByManagerAt:   new Date('2024-03-07'),
      signedByHrAt:        new Date('2024-03-24'),
      answers: fullSelfAnswers({
        s1: 5,
        s2: 'Création du Design System NX avec 45 composants documentés. Réduction de 60 % du temps de prototypage.',
        s3: 5,
        s4: 'Étendre le Design System aux applications mobiles et publier les guidelines d\'accessibilité WCAG 2.1.',
      }),
    },
  ]

  await Evaluation.insertMany(evals2024)
  console.log(`[seed:rich] ${evals2024.length} évaluations 2024 créées (toutes validées)`)

  // ── Campagne N-1 (2025) — closed, mobilité + salaires + contestation ────────

  const camp2025 = await Campaign.create({
    name:        'Entretiens annuels 2025',
    description: 'Cycle d\'évaluation annuel 2025 — clôturé. Contient des demandes de mobilité, des révisions salariales et une contestation.',
    startDate:   new Date('2025-01-10'),
    endDate:     new Date('2025-03-28'),
    status:      'closed',
    createdBy:   admin._id,
  })

  const evals2025 = [
    // emp1 — Alice Fabre : note plus basse + contestation
    {
      campaignId: camp2025._id, formId: selfForm._id,
      evaluatorId: emp1._id, evaluateeId: emp1._id,
      status: 'validated', lastSavedAt: now,
      signedByEvaluateeAt: new Date('2025-02-18'),
      signedByManagerAt:   new Date('2025-03-04'),
      signedByHrAt:        new Date('2025-03-21'),
      disagreementFlag:   true,
      evaluateeComment:   'Mon manager a sous-évalué mes performances sur le projet Alpha sans tenir compte de mes contributions documentées.',
      answers: fullSelfAnswers({
        s1: 3,
        s2: 'Contribution majeure au projet Alpha : développement du module SSO et migration des 2 000 comptes existants sans interruption.',
        s3: 4,
        s4: 'Prendre en charge la refonte de l\'API REST et piloter la montée en compétences de l\'équipe junior.',
      }),
    },
    // emp2 — Bob Leroux : pas de demande particulière
    {
      campaignId: camp2025._id, formId: selfForm._id,
      evaluatorId: emp2._id, evaluateeId: emp2._id,
      status: 'validated', lastSavedAt: now,
      signedByEvaluateeAt: new Date('2025-02-19'),
      signedByManagerAt:   new Date('2025-03-05'),
      signedByHrAt:        new Date('2025-03-22'),
      answers: fullSelfAnswers({
        s1: 4,
        s2: 'Stabilisation de l\'infrastructure staging et réduction du taux d\'erreur de 35 %. Revues de code systématiques.',
        s3: 4,
        s4: 'Participer à la migration cloud AWS et viser la certification Solutions Architect.',
      }),
    },
    // emp3 — Lucas Bernard : mobilité vers Product
    {
      campaignId: camp2025._id, formId: selfForm._id,
      evaluatorId: emp3._id, evaluateeId: emp3._id,
      status: 'validated', lastSavedAt: now,
      signedByEvaluateeAt: new Date('2025-02-20'),
      signedByManagerAt:   new Date('2025-03-06'),
      signedByHrAt:        new Date('2025-03-22'),
      answers: fullSelfAnswers({
        s1: 4,
        s2: 'Automatisation complète du pipeline de déploiement. Mise en place du monitoring Grafana/Prometheus.',
        s3: 4,
        s4: 'Approfondir les compétences en orchestration Kubernetes et viser le rôle de DevOps Lead.',
        s5: 'Je souhaite explorer une mobilité vers l\'équipe Product à moyen terme.',
      }),
    },
    // emp4 — Emma Petit : demande de revalorisation salariale
    {
      campaignId: camp2025._id, formId: selfForm._id,
      evaluatorId: emp4._id, evaluateeId: emp4._id,
      status: 'validated', lastSavedAt: now,
      signedByEvaluateeAt: new Date('2025-02-21'),
      signedByManagerAt:   new Date('2025-03-07'),
      signedByHrAt:        new Date('2025-03-23'),
      answers: fullSelfAnswers({
        s1: 5,
        s2: 'Pilotage technique du projet e-commerce (9 mois). Livraison dans les délais avec un NPS développeur de 9/10.',
        s3: 5,
        s4: 'Continuer à développer mes responsabilités de tech lead et encadrer une équipe de 3 développeurs.',
        s6: 'Après 3 ans dans l\'entreprise, je souhaite aborder une revalorisation de ma rémunération en lien avec les responsabilités supplémentaires.',
      }),
    },
    // emp5 — Nathan Martin : mobilité vers Lyon
    {
      campaignId: camp2025._id, formId: selfForm._id,
      evaluatorId: emp5._id, evaluateeId: emp5._id,
      status: 'validated', lastSavedAt: now,
      signedByEvaluateeAt: new Date('2025-02-22'),
      signedByManagerAt:   new Date('2025-03-08'),
      signedByHrAt:        new Date('2025-03-23'),
      answers: fullSelfAnswers({
        s1: 4,
        s2: 'Définition et exécution de la roadmap H1 2025. Lancement de 4 nouvelles fonctionnalités avec un taux d\'adoption > 60 %.',
        s3: 4,
        s4: 'Étendre le périmètre produit vers les marchés internationaux et renforcer la culture data-driven.',
        s5: 'Je suis intéressé par une mutation vers le bureau de Lyon pour des raisons personnelles.',
      }),
    },
    // emp6 — Léa Durand : pas de demande particulière
    {
      campaignId: camp2025._id, formId: selfForm._id,
      evaluatorId: emp6._id, evaluateeId: emp6._id,
      status: 'validated', lastSavedAt: now,
      signedByEvaluateeAt: new Date('2025-02-23'),
      signedByManagerAt:   new Date('2025-03-09'),
      signedByHrAt:        new Date('2025-03-24'),
      answers: fullSelfAnswers({
        s1: 4,
        s2: 'Refonte complète des user flows mobiles avec +40 % de rétention sur 30 jours. Coordination avec 3 équipes en parallèle.',
        s3: 4,
        s4: 'Prendre la responsabilité de PO sur le nouveau produit SaaS prévu pour Q3 2025.',
      }),
    },
    // emp7 — Hugo Lambert : demande d'augmentation (Design System)
    {
      campaignId: camp2025._id, formId: selfForm._id,
      evaluatorId: emp7._id, evaluateeId: emp7._id,
      status: 'validated', lastSavedAt: now,
      signedByEvaluateeAt: new Date('2025-02-17'),
      signedByManagerAt:   new Date('2025-03-03'),
      signedByHrAt:        new Date('2025-03-20'),
      answers: fullSelfAnswers({
        s1: 5,
        s2: 'Extension du Design System à 70 composants. Standardisation des guidelines d\'accessibilité WCAG 2.1 AA.',
        s3: 5,
        s4: 'Concevoir l\'identité visuelle de la nouvelle gamme de produits et former les équipes aux nouvelles guidelines.',
        s6: 'Je souhaite discuter d\'une augmentation de salaire compte tenu de mes contributions au projet Design System.',
      }),
    },
  ]

  await Evaluation.insertMany(evals2025)
  console.log(`[seed:rich] ${evals2025.length} évaluations 2025 créées (validées — 2 mobilités, 2 salaires, 1 contestation)`)

  // ── Campagne 2026 — active, mix de statuts ──────────────────────────────────

  const camp2026 = await Campaign.create({
    name:        'Entretiens annuels 2026',
    description: 'Cycle d\'évaluation annuel 2026 — en cours.',
    startDate:   new Date('2026-01-06'),
    endDate:     new Date('2026-05-30'),
    status:      'active',
    createdBy:   admin._id,
  })

  const evals2026 = [
    // emp1 — submitted : toutes les réponses remplies
    {
      campaignId: camp2026._id, formId: selfForm._id,
      evaluatorId: emp1._id, evaluateeId: emp1._id,
      status: 'submitted', lastSavedAt: new Date('2026-01-25'),
      answers: fullSelfAnswers({
        s1: 4,
        s2: 'Finalisation de la migration SSO et livraison de la v2 de l\'API de reporting en avance sur le planning.',
        s3: 5,
        s4: 'Prendre en charge l\'architecture microservices du nouveau module RH et coacher les développeurs juniors.',
      }),
    },
    // emp2 — in_progress : réponses partielles (ratings uniquement)
    {
      campaignId: camp2026._id, formId: selfForm._id,
      evaluatorId: emp2._id, evaluateeId: emp2._id,
      status: 'in_progress', lastSavedAt: new Date('2026-02-03'),
      answers: partialSelfAnswers(4, 4),
    },
    // emp3 — assigned : pas encore commencé
    {
      campaignId: camp2026._id, formId: selfForm._id,
      evaluatorId: emp3._id, evaluateeId: emp3._id,
      status: 'assigned', answers: [],
    },
    // emp4 — assigned : pas encore commencé
    {
      campaignId: camp2026._id, formId: selfForm._id,
      evaluatorId: emp4._id, evaluateeId: emp4._id,
      status: 'assigned', answers: [],
    },
    // emp5 — submitted : avec confirmation de mobilité vers Lyon
    {
      campaignId: camp2026._id, formId: selfForm._id,
      evaluatorId: emp5._id, evaluateeId: emp5._id,
      status: 'submitted', lastSavedAt: new Date('2026-01-30'),
      answers: fullSelfAnswers({
        s1: 5,
        s2: 'Lancement réussi de la version internationale avec 3 nouvelles langues. +400 clients entreprise en Q1 2026.',
        s3: 5,
        s4: 'Piloter le développement du module analytics et définir la stratégie go-to-market pour Q3.',
        s5: 'Je confirme mon souhait de mobilité vers Lyon évoqué l\'an dernier, la situation est toujours d\'actualité.',
      }),
    },
    // emp6 — in_progress : réponses partielles
    {
      campaignId: camp2026._id, formId: selfForm._id,
      evaluatorId: emp6._id, evaluateeId: emp6._id,
      status: 'in_progress', lastSavedAt: new Date('2026-02-05'),
      answers: partialSelfAnswers(3, 4),
    },
    // emp7 — assigned : pas encore commencé
    {
      campaignId: camp2026._id, formId: selfForm._id,
      evaluatorId: emp7._id, evaluateeId: emp7._id,
      status: 'assigned', answers: [],
    },
  ]

  await Evaluation.insertMany(evals2026)
  console.log(`[seed:rich] ${evals2026.length} évaluations 2026 créées (2 soumises, 2 en cours, 3 assignées)`)

  // ── Résumé ──────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════════════')
  console.log('  SEED RICH TERMINÉ ✓')
  console.log('══════════════════════════════════════════════════════════════════════')
  console.log(`  Mot de passe commun : ${PASSWORD}\n`)
  console.log('  Comptes :')
  console.log('    admin@nanoxplore.com              Alice Admin       (admin)')
  console.log('    hr@nanoxplore.com                 Sophie Moreau     (hr)')
  console.log('    thomas.dupont@nanoxplore.com      Thomas Dupont     (manager — Design)')
  console.log('    pierre.rousseau@nanoxplore.com    Pierre Rousseau   (manager — Engineering)')
  console.log('    camille.dubois@nanoxplore.com     Camille Dubois    (manager — Product)')
  console.log('    alice.fabre@nanoxplore.com        Alice Fabre       (emp1 — Engineering)')
  console.log('    bob.leroux@nanoxplore.com         Bob Leroux        (emp2 — Engineering)')
  console.log('    lucas.bernard@nanoxplore.com      Lucas Bernard     (emp3 — Engineering)')
  console.log('    emma.petit@nanoxplore.com         Emma Petit        (emp4 — Engineering)')
  console.log('    nathan.martin@nanoxplore.com      Nathan Martin     (emp5 — Product)')
  console.log('    lea.durand@nanoxplore.com         Léa Durand        (emp6 — Product)')
  console.log('    hugo.lambert@nanoxplore.com       Hugo Lambert      (emp7 — Design)')
  console.log('\n  Hiérarchie :')
  console.log('    Pierre Rousseau  →  Alice, Bob, Lucas, Emma  (Engineering)')
  console.log('    Camille Dubois   →  Nathan, Léa              (Product)')
  console.log('    Thomas Dupont    →  Hugo                     (Design)')
  console.log('\n  Campagnes :')
  console.log('    2024 — closed : 7 évaluations validées (positives, sans demande)')
  console.log('    2025 — closed : 7 évaluations validées')
  console.log('                    · emp3 (Lucas)  : mobilité → équipe Product')
  console.log('                    · emp5 (Nathan) : mobilité → bureau Lyon')
  console.log('                    · emp4 (Emma)   : demande de revalorisation salariale')
  console.log('                    · emp7 (Hugo)   : demande d\'augmentation (Design System)')
  console.log('                    · emp1 (Alice)  : contestation (disagreementFlag)')
  console.log('    2026 — active  : emp1 soumise, emp5 soumise (mobilité Lyon)')
  console.log('                     emp2 en cours, emp6 en cours')
  console.log('                     emp3, emp4, emp7 assignées (pas commencé)')
  console.log('══════════════════════════════════════════════════════════════════════\n')

  process.exit(0)
}

seedRich().catch(err => {
  console.error('[seed:rich] Erreur :', err.message)
  console.error(err.stack)
  process.exit(1)
})
