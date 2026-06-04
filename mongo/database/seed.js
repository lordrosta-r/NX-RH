'use strict'

// =============================================================================
// database/seed.js — SEED UNIQUE NX-RH (source de vérité)
//
// WIPE TOTAL puis ré-insertion du SOCLE uniquement : secteurs, utilisateurs,
// formulaires, config, mail templates, ressources.
//
// VOLONTAIREMENT SANS campagne ni évaluation : le parcours (création de
// campagnes, assignations, saisies, signatures, offboarding…) se fait À LA MAIN
// via l'UI pendant la phase de test visuel.
//
// Les autres scripts seed-*.js sont OBSOLÈTES — ne pas les utiliser.
//
// Usage :
//   cd mongo && node database/seed.js
//
// Comptes (mot de passe commun : Test1234!) :
//   admin@nx-rh.fr        → admin    (Alice Moreau)
//   rh@nx-rh.fr           → hr       (Hugo Lambert)
//   lead-tech@nx-rh.fr    → manager  (lead, manage des managers)
//   lead-biz@nx-rh.fr     → manager  (lead, manage des managers)
//   mgr-*@nx-rh.fr        → manager  (managers d'équipe)
//   emp-*@nx-rh.fr        → employee
// =============================================================================

const path      = require('path')
const serverDir = path.resolve(__dirname, '../server')
const resolve   = (mod) => require(path.join(serverDir, 'node_modules', mod))

resolve('dotenv').config({ path: path.join(serverDir, '.env') })

if (!process.env.MONGO_URI) {
  process.env.MONGO_URI = 'mongodb://root:changeme@localhost:27017/nanoxplore_rh?authSource=admin'
}

const mongoose = resolve('mongoose')
const bcrypt   = resolve('bcrypt')

const {
  User, Sector, Campaign, Form, Evaluation, Config, MailTemplate,
  Event, Resource, Notification, AuditLog, OffboardingRequest, PDI,
} = require('../server/models')
// MobilityRequest n'est pas exporté par le barrel — require direct (wipe only)
const MobilityRequest = require('../server/models/MobilityRequest')

// ─── Helpers ────────────────────────────────────────────────────────────────
const oid = () => new mongoose.Types.ObjectId()
const NOW = new Date()
const daysAgo = n => new Date(NOW.getTime() - n * 86_400_000)

async function wipeInsert(Model, docs, label) {
  await Model.deleteMany({})
  if (!docs.length) { console.log(`  ·  ${label}: 0`); return 0 }
  const res = await Model.collection.insertMany(docs, { ordered: true })
  console.log(`  ✓  ${label}: ${res.insertedCount}`)
  return res.insertedCount
}

// =============================================================================
async function seed() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  console.log('✅  MongoDB connecté →', mongoose.connection.name)
  console.log('🌱  Wipe + seed du socle NX-RH (sans campagnes ni évaluations)…\n')

  const counts = {}
  const passwordHash = await bcrypt.hash('Test1234!', 12)

  // ── 0. WIPE complet ─────────────────────────────────────────────────────────
  for (const M of [
    User, Sector, Campaign, Form, Evaluation, Config, MailTemplate,
    Event, Resource, Notification, AuditLog, OffboardingRequest, PDI,
    MobilityRequest,
  ]) {
    await M.deleteMany({})
  }
  console.log('🧹  Toutes les collections vidées\n')

  // ── ObjectIds nommés ──────────────────────────────────────────────────────
  const S = { innov: oid(), support: oid(), commercial: oid() }
  const U = {
    admin: oid(), hr: oid(),
    leadTech: oid(), leadBiz: oid(),
    mgrEng: oid(), mgrData: oid(), mgrSales: oid(), mgrMkt: oid(),
  }
  const F = { self: oid(), manager: oid(), upward: oid(), objectives: oid(), mobility: oid(), promotion: oid() }

  // ── 1. SECTORS ──────────────────────────────────────────────────────────────
  const sectors = [
    { _id: S.innov,      name: 'Innovation',         color: '#17A8D4', description: 'Équipes produit, ingénierie et data.',     createdBy: U.admin, isActive: true, createdAt: NOW, updatedAt: NOW },
    { _id: S.support,    name: 'Fonctions Support',  color: '#7C3AED', description: 'RH, finance, juridique et opérations.',    createdBy: U.admin, isActive: true, createdAt: NOW, updatedAt: NOW },
    { _id: S.commercial, name: 'Commercial & Client', color: '#F97316', description: 'Sales, marketing et customer success.',   createdBy: U.admin, isActive: true, createdAt: NOW, updatedAt: NOW },
  ]
  counts.sectors = await wipeInsert(Sector, sectors, 'Sectors')

  // ── 2. USERS (20) — hiérarchie multi-niveaux ────────────────────────────────
  // admin → { hr, leadTech, leadBiz }
  // leadTech → { mgrEng, mgrData } ; leadBiz → { mgrSales, mgrMkt }
  // chaque mgr → 3 employés
  const baseUser = (over) => ({
    passwordHash, role: 'employee', authSource: 'local', isActive: true,
    offboardingStatus: 'active', locale: 'fr', theme: 'dark',
    createdAt: daysAgo(400), updatedAt: NOW, ...over,
  })

  const staff = [
    baseUser({ _id: U.admin,    email: 'admin@nx-rh.fr',     firstName: 'Alice', lastName: 'Moreau',  role: 'admin',   department: 'Executive',   sectorId: S.support,    position: 'Directrice des systèmes RH' }),
    baseUser({ _id: U.hr,       email: 'rh@nx-rh.fr',        firstName: 'Hugo',  lastName: 'Lambert', role: 'hr',      department: 'HR',          sectorId: S.support,    position: 'Responsable RH',       managerId: U.admin }),
    // Leads (managers de managers)
    baseUser({ _id: U.leadTech, email: 'lead-tech@nx-rh.fr', firstName: 'Julien', lastName: 'Robert', role: 'manager', department: 'Engineering', sectorId: S.innov,      position: 'Directeur technique',  managerId: U.admin }),
    baseUser({ _id: U.leadBiz,  email: 'lead-biz@nx-rh.fr',  firstName: 'Marie', lastName: 'Dubois',  role: 'manager', department: 'Sales',       sectorId: S.commercial, position: 'Directrice commerciale', managerId: U.admin, authSource: 'ldap' }),
    // Managers d'équipe
    baseUser({ _id: U.mgrEng,   email: 'mgr-eng@nx-rh.fr',   firstName: 'Paul',  lastName: 'Girard',  role: 'manager', department: 'Engineering', sectorId: S.innov,      position: "Responsable d'ingénierie", managerId: U.leadTech }),
    baseUser({ _id: U.mgrData,  email: 'mgr-data@nx-rh.fr',  firstName: 'Léa',   lastName: 'Fontaine', role: 'manager', department: 'Data',       sectorId: S.innov,      position: 'Responsable data',     managerId: U.leadTech }),
    baseUser({ _id: U.mgrSales, email: 'mgr-sales@nx-rh.fr', firstName: 'Antoine', lastName: 'Mercier', role: 'manager', department: 'Sales',     sectorId: S.commercial, position: 'Responsable des ventes', managerId: U.leadBiz }),
    baseUser({ _id: U.mgrMkt,   email: 'mgr-mkt@nx-rh.fr',   firstName: 'Sophie', lastName: 'Bonnet', role: 'manager', department: 'Marketing',   sectorId: S.commercial, position: 'Responsable marketing', managerId: U.leadBiz }),
  ]

  // 12 employés, 3 par manager d'équipe
  const empSpec = [
    { mgr: U.mgrEng,   dept: 'Engineering', sector: S.innov,      people: [['emp-elodie', 'Élodie', 'Martin', 'Ingénieure logiciel senior'], ['emp-thomas', 'Thomas', 'Petit', 'Ingénieur logiciel'], ['emp-lucas', 'Lucas', 'Bernard', 'Ingénieur QA']] },
    { mgr: U.mgrData,  dept: 'Data',        sector: S.innov,      people: [['emp-camille', 'Camille', 'Girard', 'Data scientist'], ['emp-nicolas', 'Nicolas', 'Roux', 'Data engineer'], ['emp-emma', 'Emma', 'Blanc', 'Analyste data']] },
    { mgr: U.mgrSales, dept: 'Sales',       sector: S.commercial, people: [['emp-sarah', 'Sarah', 'Leroy', 'Account executive'], ['emp-maxime', 'Maxime', 'Faure', 'Business developer'], ['emp-julie', 'Julie', 'Henry', 'Sales ops']] },
    { mgr: U.mgrMkt,   dept: 'Marketing',   sector: S.commercial, people: [['emp-chloe', 'Chloé', 'Lefebvre', 'Content manager'], ['emp-hugo', 'Hugo', 'Garnier', 'Growth marketer'], ['emp-nina', 'Nina', 'Rousseau', 'Chargée SEO']] },
  ]

  const employees = []
  for (const spec of empSpec) {
    for (const [slug, firstName, lastName, position] of spec.people) {
      employees.push(baseUser({
        _id: oid(), email: `${slug}@nx-rh.fr`, firstName, lastName,
        role: 'employee', department: spec.dept, sectorId: spec.sector,
        managerId: spec.mgr, position,
      }))
    }
  }

  counts.users = await wipeInsert(User, [...staff, ...employees], 'Users')

  // ── 3. FORMS (6) — génériques, réutilisables sur toute campagne ─────────────
  const forms = [
    {
      _id: F.self, title: 'Auto-évaluation', formType: 'self_evaluation',
      description: "Auto-évaluation de l'entretien annuel de performance.",
      isAnonymous: false, createdBy: U.hr, frozenAt: null, isFrozen: false,
      questions: [
        { id: 's1', type: 'rating', scale: 5, required: true,  phase: 'self',        label: 'Maîtrise du poste et des responsabilités' },
        { id: 's2', type: 'text',             required: true,  phase: 'self',        label: 'Réalisations marquantes cette année' },
        { id: 's3', type: 'yes_no',           required: true,  phase: 'self',        label: 'Avez-vous atteint vos objectifs ?' },
        { id: 's4', type: 'scale', scale: 10, required: false, phase: 'objectives',  label: "Taux global d'atteinte des objectifs (/10)" },
        { id: 's5', type: 'objective_item',   required: false, phase: 'objectives',  label: "Objectif principal pour l'année à venir" },
        { id: 's6', type: 'text',             required: false, phase: 'aspirations', label: "Souhaits d'évolution et de formation" },
      ],
      createdAt: daysAgo(400), updatedAt: NOW,
    },
    {
      _id: F.manager, title: 'Évaluation manager', formType: 'manager_evaluation',
      description: 'Évaluation du collaborateur par son manager.',
      isAnonymous: false, createdBy: U.hr, frozenAt: null, isFrozen: false,
      questions: [
        { id: 'm1', type: 'rating', scale: 5, required: true,  phase: 'n-1', label: 'Performance globale' },
        { id: 'm2', type: 'text',             required: true,  phase: 'n-1', label: 'Points forts observés' },
        { id: 'm3', type: 'yes_no',           required: true,  phase: 'n-1', label: 'Autonomie satisfaisante ?' },
        { id: 'm4', type: 'rating', scale: 5, required: false, phase: 'n-1', label: "Potentiel d'évolution" },
      ],
      createdAt: daysAgo(400), updatedAt: NOW,
    },
    {
      _id: F.upward, title: 'Feedback ascendant', formType: 'upward_feedback',
      description: 'Retour anonyme des collaborateurs sur leur manager.',
      isAnonymous: true, createdBy: U.hr, frozenAt: null, isFrozen: false,
      questions: [
        { id: 'u1', type: 'rating', scale: 5, required: true,  phase: 'all', label: 'Qualité de communication du manager' },
        { id: 'u2', type: 'text',             required: false, phase: 'all', label: "Axes d'amélioration suggérés" },
        { id: 'u3', type: 'yes_no',           required: true,  phase: 'all', label: "Le manager est-il disponible et à l'écoute ?" },
      ],
      createdAt: daysAgo(400), updatedAt: NOW,
    },
    {
      _id: F.objectives, title: 'Objectifs N+1', formType: 'objectives',
      description: "Définition des objectifs pour l'année à venir.",
      isAnonymous: false, createdBy: U.hr, frozenAt: null, isFrozen: false,
      questions: [
        { id: 'o1', type: 'objective_item', required: true,  phase: 'objectives', label: 'Objectif prioritaire' },
        { id: 'o2', type: 'objective_item', required: false, phase: 'objectives', label: 'Objectif secondaire' },
        { id: 'o3', type: 'text',           required: false, phase: 'objectives', label: 'Contexte et justification' },
      ],
      createdAt: daysAgo(400), updatedAt: NOW,
    },
    {
      _id: F.mobility, title: 'Demande de mobilité interne', formType: 'mobility_request',
      description: 'Formulaire de demande de mobilité interne.',
      isAnonymous: false, createdBy: U.hr, frozenAt: null, isFrozen: false,
      questions: [
        { id: 'mob1', type: 'choice', options: ['Interne équipe', 'Inter-département', 'Inter-site'], required: true, phase: 'all', label: 'Type de mobilité souhaitée' },
        { id: 'mob2', type: 'text',   required: true, phase: 'all', label: 'Motivation et projet professionnel' },
        { id: 'mob3', type: 'yes_no', required: true, phase: 'all', label: 'Mobilité souhaitée dans les 3 prochains mois ?' },
      ],
      createdAt: daysAgo(400), updatedAt: NOW,
    },
    {
      _id: F.promotion, title: 'Demande de promotion', formType: 'promotion_request',
      description: 'Formulaire de demande de promotion.',
      isAnonymous: false, createdBy: U.hr, frozenAt: null, isFrozen: false,
      questions: [
        { id: 'promo1', type: 'text',   required: true,  phase: 'all', label: 'Arguments et réalisations justifiant la promotion' },
        { id: 'promo2', type: 'yes_no', required: false, phase: 'all', label: 'Nécessite un arbitrage RH spécifique ?' },
        { id: 'promo3', type: 'rating', scale: 5, required: true, phase: 'all', label: "Auto-évaluation du niveau de performance" },
      ],
      createdAt: daysAgo(400), updatedAt: NOW,
    },
  ]
  counts.forms = await wipeInsert(Form, forms, 'Forms')

  // ── 4. CONFIG ───────────────────────────────────────────────────────────────
  const configs = [
    { _id: oid(), key: 'ldap.enabled', value: true,  createdAt: NOW, updatedAt: NOW },
    { _id: oid(), key: 'smtp.enabled', value: false, createdAt: NOW, updatedAt: NOW },
    { _id: oid(), key: 'app.features', value: { offboarding: true, analytics: true, objectives: true, mobility: true }, createdAt: NOW, updatedAt: NOW },
  ]
  counts.configs = await wipeInsert(Config, configs, 'Config')

  // ── 5. MAIL TEMPLATES ───────────────────────────────────────────────────────
  const mailTemplates = [
    { slug: 'campaignLaunch',        subject: '[NX-RH] Nouvelle campagne : {{campaignName}}',              bodyText: 'Bonjour {{firstName}},\n\nLa campagne "{{campaignName}}" est lancée.\n\nNX-RH', variables: ['firstName', 'campaignName'] },
    { slug: 'evaluationAssigned',    subject: '[NX-RH] Une évaluation vous a été attribuée',               bodyText: 'Bonjour {{firstName}},\n\nUne évaluation vous attend pour "{{campaignName}}".\n\nNX-RH', variables: ['firstName', 'campaignName'] },
    { slug: 'evaluationSubmitted',   subject: '[NX-RH] Évaluation soumise par {{evaluatorName}}',          bodyText: 'Bonjour {{firstName}},\n\n{{evaluatorName}} a soumis son évaluation ("{{campaignName}}").\n\nNX-RH', variables: ['firstName', 'evaluatorName', 'campaignName'] },
    { slug: 'deadlineReminder',      subject: '[NX-RH] Rappel : échéance proche',                          bodyText: 'Bonjour {{firstName}},\n\nÉchéance "{{campaignName}}" le {{deadline}}.\n\nNX-RH', variables: ['firstName', 'campaignName', 'deadline'] },
    { slug: 'managerActionRequired', subject: '[NX-RH] Action requise de votre manager',                   bodyText: 'Bonjour {{firstName}},\n\nUne action manager est requise ("{{campaignName}}").\n\nNX-RH', variables: ['firstName', 'campaignName'] },
    { slug: 'systemAlerts',          subject: '[NX-RH] Alerte système : {{alertTitle}}',                   bodyText: 'Bonjour {{firstName}},\n\n{{alertBody}}\n\nNX-RH', variables: ['firstName', 'alertTitle', 'alertBody'] },
    { slug: 'bulkReminder',          subject: '[NX-RH] Rappel : évaluation en attente — {{campaignName}}',  bodyText: 'Bonjour {{firstName}},\n\nVotre évaluation "{{campaignName}}" est en attente.\n{{message}}\n\nNX-RH', variables: ['firstName', 'campaignName', 'message'] },
    { slug: 'request_treated',       subject: '[NX-RH] Votre demande a été traitée',                       bodyText: 'Bonjour {{firstName}},\n\nVotre demande "{{formTitle}}" a été examinée.\n\nNX-RH', variables: ['firstName', 'formTitle'] },
    { slug: 'request_rejected',      subject: "[NX-RH] Votre demande n'a pas été retenue",                 bodyText: 'Bonjour {{firstName}},\n\nVotre demande "{{formTitle}}" n\'a pas été retenue.\nMotif : {{note}}\n\nNX-RH', variables: ['firstName', 'formTitle', 'note'] },
  ].map(t => ({ _id: oid(), ...t, bodyHtml: '', lastEditedBy: null, createdAt: NOW, updatedAt: NOW }))
  counts.mailTemplates = await wipeInsert(MailTemplate, mailTemplates, 'MailTemplates')

  // ── 6. RESOURCES ──────────────────────────────────────────────────────────
  const resources = [
    { title: 'Guide auto-évaluation',          type: 'pdf',  filename: 'guide-auto-evaluation.pdf',     status: 'published', publishedAt: daysAgo(60) },
    { title: 'Charte des entretiens annuels',  type: 'pdf',  filename: 'charte-entretiens-annuels.pdf', status: 'published', publishedAt: daysAgo(90) },
    { title: 'Grille de compétences',          type: 'xlsx', filename: 'grille-competences.xlsx',       status: 'published', publishedAt: daysAgo(45) },
    { title: 'Modèle objectifs N+1',           type: 'xlsx', filename: 'modele-objectifs-n1.xlsx',      status: 'draft',     publishedAt: null },
    { title: 'Processus mobilité interne',     type: 'pdf',  filename: 'processus-mobilite-interne.pdf', status: 'draft',    publishedAt: null },
  ].map(r => ({ _id: oid(), description: '', visibleTo: ['admin', 'hr', 'manager', 'employee'], createdBy: U.hr, createdAt: NOW, updatedAt: NOW, ...r }))
  counts.resources = await wipeInsert(Resource, resources, 'Resources')

  // ── Résumé ────────────────────────────────────────────────────────────────
  console.log('\n✅  Socle seedé :')
  for (const [k, v] of Object.entries(counts)) console.log(`   ${String(v).padStart(3)}  ${k}`)
  console.log('\n→ 0 campagne, 0 évaluation : tout se crée à la main dans l\'UI.')
  console.log('\nComptes (mot de passe : Test1234!) :')
  console.log('   admin@nx-rh.fr · rh@nx-rh.fr · lead-tech@nx-rh.fr · lead-biz@nx-rh.fr')
  console.log('   mgr-eng / mgr-data / mgr-sales / mgr-mkt @nx-rh.fr · emp-*@nx-rh.fr')

  await mongoose.disconnect()
  process.exit(0)
}

seed().catch(err => {
  console.error('\n❌  Seed error :', err.message)
  if (process.env.SEED_VERBOSE) console.error(err)
  mongoose.disconnect().finally(() => process.exit(1))
})
