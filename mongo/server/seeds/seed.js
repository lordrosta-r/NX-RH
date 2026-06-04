'use strict'

// =============================================================================
// seeds/seed.js — Seed complet NX-RH avec données RH françaises réalistes
//
// Usage :
//   cd ~/Desktop/taff/NX-RH/mongo/server
//   MONGO_URI=mongodb://localhost:27017/nx-rh node seeds/seed.js
//
// Ou avec .env :
//   node seeds/seed.js
//
// Notes sur les champs :
//   • Campaign  → champ « name » (pas « title »), status: closed (pas completed)
//   • OffboardingRequest → userId / requestedBy / lastDay / reason enum
//   • MobilityRequest   → employeeId / requestType / targetPosition (required)
//   • PDI               → employee + manager (required) + period.{start,end}
//   • Event             → types limités : deadline|interview|meeting|feedback|campaign
//   • Resource          → filename (required), type: pdf|xlsx|docx|pptx
//   • Notification      → types de NOTIFICATION_TYPES
//   • AuditLog          → actions de AUDIT_ACTIONS
// =============================================================================

require('dotenv').config()

const mongoose = require('mongoose')
const bcrypt   = require('bcrypt')

// ── Models ────────────────────────────────────────────────────────────────────
const User                       = require('../models/User')
const { Campaign }               = require('../models/Campaign')
const Form                       = require('../models/Form')
const { Evaluation }             = require('../models/Evaluation')
const { OffboardingRequest }     = require('../models/OffboardingRequest')
const MobilityRequest            = require('../models/MobilityRequest')
const PDI                        = require('../models/PDI')
const Event                      = require('../models/Event')
const Resource                   = require('../models/Resource')
const Notification               = require('../models/Notification')
const AuditLog                   = require('../models/AuditLog')

// ── Helpers ───────────────────────────────────────────────────────────────────
const oid      = () => new mongoose.Types.ObjectId()
const now      = new Date()
const daysAgo  = n => new Date(now.getTime() - n * 86_400_000)
const daysFrom = n => new Date(now.getTime() + n * 86_400_000)

/** Drop collection then insert docs via the raw driver (bypasses all Mongoose hooks). */
async function dropAndInsert(Model, docs, label) {
  await Model.deleteMany({})
  if (!docs.length) { console.log(`  ⚠  ${label}: 0 — skipped`); return 0 }
  const res = await Model.collection.insertMany(docs, { ordered: true })
  console.log(`  ✓  ${label}: ${res.insertedCount}`)
  return res.insertedCount
}

// =============================================================================
async function seed() {
  const uri = process.env.MONGO_URI
  if (!uri) { console.error('❌  MONGO_URI non définie'); process.exit(1) }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 10000 })
  console.log('✅  MongoDB connecté\n🌱  Seeding NX-RH…\n')

  const counts = {}

  // ── Hachage mot de passe ──────────────────────────────────────────────────
  const hash = await bcrypt.hash('password123', 10)

  // ── ObjectIds nommés pour les cross-références ────────────────────────────
  const U = {
    admin1: oid(), hr1: oid(), hr2: oid(),
    manager1: oid(), manager2: oid(), manager3: oid(),
    emp1: oid(), emp2: oid(), emp3: oid(), emp4: oid(), emp5: oid(),
  }
  const C = { past1: oid(), past2: oid(), active1: oid(), active2: oid(), draft1: oid() }
  const F = { form1: oid(), form2: oid(), form3: oid(), form4: oid() }
  // Named evaluation IDs for audit log references
  const E = {
    emp4Active1:  oid(),   // submitted — active1 campaign
    emp1Past1:    oid(),   // validated — past1 campaign
    emp2Past1:    oid(),   // validated — past1 campaign
  }
  const PDI_IDS = { pdi1: oid(), pdi2: oid(), pdi3: oid() }

  // ── 1. USERS (11) ────────────────────────────────────────────────────────
  // Note : collection.insertMany() bypass les hooks pre-save (cycle detection,
  //        password hash). On insère le hash bcrypt directement.
  // Departments : valeurs de l'enum DEPARTMENTS (Engineering / HR / Sales /
  //               Customer Success / Executive)
  const users = [
    {
      _id: U.admin1, email: 'alice@nxrh.local', passwordHash: hash,
      firstName: 'Alice', lastName: 'Admin', role: 'admin',
      department: 'Executive', isActive: true, authSource: 'local',
      offboardingStatus: 'active',
    },
    {
      _id: U.hr1, email: 'marie.dupont@nxrh.local', passwordHash: hash,
      firstName: 'Marie', lastName: 'Dupont', role: 'hr',
      department: 'HR', isActive: true, authSource: 'local',
      offboardingStatus: 'active',
    },
    {
      _id: U.hr2, email: 'sophie.martin@nxrh.local', passwordHash: hash,
      firstName: 'Sophie', lastName: 'Martin', role: 'hr',
      department: 'HR', isActive: true, authSource: 'ldap',
      offboardingStatus: 'active',
    },
    {
      _id: U.manager1, email: 'pierre.leclerc@nxrh.local', passwordHash: hash,
      firstName: 'Pierre', lastName: 'Leclerc', role: 'manager',
      department: 'Engineering', isActive: true, authSource: 'local',
      offboardingStatus: 'active', position: 'Responsable ingénierie',
    },
    {
      _id: U.manager2, email: 'jean.moreau@nxrh.local', passwordHash: hash,
      firstName: 'Jean', lastName: 'Moreau', role: 'manager',
      department: 'Sales', isActive: true, authSource: 'ldap',
      offboardingStatus: 'active', position: 'Responsable commercial',
    },
    {
      _id: U.manager3, email: 'claire.fontaine@nxrh.local', passwordHash: hash,
      firstName: 'Claire', lastName: 'Fontaine', role: 'manager',
      department: 'Customer Success', isActive: true, authSource: 'local',
      offboardingStatus: 'active', position: 'Responsable support client',
    },
    {
      _id: U.emp1, email: 'lucas.bernard@nxrh.local', passwordHash: hash,
      firstName: 'Lucas', lastName: 'Bernard', role: 'employee',
      department: 'Engineering', isActive: true, authSource: 'local',
      managerId: U.manager1, offboardingStatus: 'active',
      position: 'Ingénieur logiciel',
    },
    {
      _id: U.emp2, email: 'emma.petit@nxrh.local', passwordHash: hash,
      firstName: 'Emma', lastName: 'Petit', role: 'employee',
      department: 'Engineering', isActive: true, authSource: 'local',
      managerId: U.manager1, offboardingStatus: 'active',
      position: 'Ingénieure logicielle',
    },
    {
      _id: U.emp3, email: 'thomas.richard@nxrh.local', passwordHash: hash,
      firstName: 'Thomas', lastName: 'Richard', role: 'employee',
      department: 'Sales', isActive: true, authSource: 'ldap',
      managerId: U.manager2, offboardingStatus: 'active',
      position: 'Commercial',
    },
    {
      _id: U.emp4, email: 'lea.durand@nxrh.local', passwordHash: hash,
      firstName: 'Léa', lastName: 'Durand', role: 'employee',
      department: 'Customer Success', isActive: true, authSource: 'local',
      managerId: U.manager3, offboardingStatus: 'offboarding',
      position: 'Chargée de support client',
    },
    {
      _id: U.emp5, email: 'nicolas.blanc@nxrh.local', passwordHash: hash,
      firstName: 'Nicolas', lastName: 'Blanc', role: 'employee',
      department: 'Customer Success', isActive: false, authSource: 'local',
      managerId: U.manager3, offboardingStatus: 'offboarded',
      archivedAt: daysAgo(60), offboardingDate: daysAgo(30),
      offboardingReason: 'Démission volontaire',
      position: 'Technicien support',
    },
  ]
  counts.users = await dropAndInsert(User, users, 'Users')

  // ── 2. CAMPAIGNS (5) ────────────────────────────────────────────────────
  // Note : le modèle utilise « name » (pas « title »).
  //        Status enum : draft | active | closed | archived  (pas « completed »)
  const campaigns = [
    {
      _id: C.past1,
      name: 'Entretien annuel 2023',
      description: 'Campagne annuelle de performance — exercice 2023.',
      status: 'closed',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-03-31'),
      createdBy: U.hr1,
      formIds: [F.form1],
      deadlineEmployee: new Date('2024-02-28'),
      deadlineManager: new Date('2024-03-15'),
    },
    {
      _id: C.past2,
      name: 'Mi-parcours S2 2024',
      description: 'Bilan de mi-année — second semestre 2024.',
      status: 'closed',
      startDate: new Date('2024-07-01'),
      endDate: new Date('2024-09-30'),
      createdBy: U.hr1,
      formIds: [F.form2],
      deadlineEmployee: new Date('2024-08-15'),
      deadlineManager: new Date('2024-09-15'),
    },
    {
      _id: C.active1,
      name: 'Entretien annuel 2025',
      description: 'Campagne annuelle de performance — exercice 2025.',
      status: 'active',
      startDate: new Date('2025-01-06'),
      endDate: new Date('2025-04-30'),
      createdBy: U.hr1,
      formIds: [F.form1, F.form4],
      deadlineEmployee: new Date('2025-03-31'),
      deadlineManager: new Date('2025-04-15'),
      previousCampaignId: C.past1,
      enableN1Context: true,
      n1VisibleToEmployee: true,
    },
    {
      _id: C.active2,
      name: 'Évaluation 360° Q1 2025',
      description: 'Évaluation croisée par les pairs — premier trimestre 2025.',
      status: 'active',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-03-31'),
      createdBy: U.hr2,
      formIds: [F.form3],
    },
    {
      _id: C.draft1,
      name: 'Mi-parcours S1 2025',
      description: 'Bilan de mi-année — premier semestre 2025 (en préparation).',
      status: 'draft',
      startDate: daysFrom(30),
      endDate: daysFrom(120),
      createdBy: U.hr2,
      formIds: [F.form2],
    },
  ]
  counts.campaigns = await dropAndInsert(Campaign, campaigns, 'Campaigns')

  // ── 3. FORMS (4) ────────────────────────────────────────────────────────
  // Question types valides : rating | text | yes_no | choice | weather |
  //   mobility | n1_import | scale | objective_item
  // Form types valides : self_evaluation | manager_evaluation | peer_review | …
  const forms = [
    {
      _id: F.form1,
      title: 'Entretien annuel',
      description: "Formulaire d'auto-évaluation pour l'entretien annuel de performance.",
      formType: 'self_evaluation',
      createdBy: U.hr1,
      questions: [
        {
          id: 'q1', type: 'rating', scale: 5, required: true, phase: 'self',
          label: 'Dans quelle mesure avez-vous atteint vos objectifs de l\'année ?',
        },
        {
          id: 'q2', type: 'rating', scale: 5, required: true, phase: 'self',
          label: 'Comment évaluez-vous globalement vos compétences métier ?',
        },
        {
          id: 'q3', type: 'text', required: false, phase: 'aspirations',
          label: 'Quels développements professionnels souhaitez-vous pour l\'année à venir ?',
        },
        {
          id: 'q4', type: 'text', required: true, phase: 'self',
          label: 'Quels sont vos principaux points forts ?',
        },
        {
          id: 'q5', type: 'text', required: false, phase: 'self',
          label: 'Quels sont vos principaux axes d\'amélioration ?',
        },
        {
          id: 'q6', type: 'choice', required: true, phase: 'all',
          label: 'Recommanderiez-vous NX-RH comme employeur ?',
          options: ['Oui, sans hésitation', 'Oui, avec réserves', 'Non', 'Sans avis'],
        },
      ],
    },
    {
      _id: F.form2,
      title: 'Mi-parcours',
      description: 'Bilan de mi-année — avancement des objectifs et besoins de support.',
      formType: 'self_evaluation',
      createdBy: U.hr1,
      questions: [
        {
          id: 'q1', type: 'rating', scale: 5, required: true, phase: 'objectives',
          label: 'Quel est l\'avancement global de vos objectifs annuels ?',
        },
        {
          id: 'q2', type: 'text', required: false, phase: 'self',
          label: 'Quelles difficultés avez-vous rencontrées depuis le début d\'année ?',
        },
        {
          id: 'q3', type: 'text', required: false, phase: 'self',
          label: 'De quel type de support ou de ressources avez-vous besoin ?',
        },
        {
          id: 'q4', type: 'rating', scale: 5, required: true, phase: 'self',
          label: 'Quelle est votre satisfaction globale dans votre poste actuel ?',
        },
      ],
    },
    {
      _id: F.form3,
      title: 'Évaluation 360°',
      description: 'Évaluation croisée des compétences transversales par les pairs.',
      formType: 'peer_review',
      isAnonymous: true,
      createdBy: U.hr2,
      questions: [
        {
          id: 'q1', type: 'rating', scale: 5, required: true, phase: 'all',
          label: 'Comment évaluez-vous la capacité de collaboration de cette personne ?',
        },
        {
          id: 'q2', type: 'rating', scale: 5, required: true, phase: 'all',
          label: 'Comment évaluez-vous la qualité de sa communication ?',
        },
        {
          id: 'q3', type: 'rating', scale: 5, required: true, phase: 'all',
          label: 'Comment évaluez-vous son expertise technique ?',
        },
        {
          id: 'q4', type: 'rating', scale: 5, required: true, phase: 'all',
          label: 'Comment évaluez-vous son leadership et son influence positive ?',
        },
        {
          id: 'q5', type: 'text', required: false, phase: 'all',
          label: 'Commentaire libre — points forts et suggestions d\'amélioration.',
        },
      ],
    },
    {
      _id: F.form4,
      title: 'Évaluation compétences (manager)',
      description: "Évaluation des compétences et du développement par le manager — couvre les types de question avancés.",
      formType: 'manager_evaluation',
      createdBy: U.hr1,
      questions: [
        {
          id: 'q1', type: 'scale', required: true, phase: 'objectives',
          label: 'Taux d\'atteinte global des objectifs (0-100 %)',
        },
        {
          id: 'q2', type: 'objective_item', required: true, phase: 'objectives',
          label: 'Objectif structuré principal de l\'année',
        },
        {
          id: 'q3', type: 'weather', required: false, phase: 'self',
          label: 'Météo du moral / engagement perçu',
        },
        {
          id: 'q4', type: 'mobility', required: false, phase: 'aspirations',
          label: 'Souhait de mobilité identifié lors de l\'entretien',
        },
        {
          id: 'q5', type: 'n1_import', required: false, phase: 'n-1',
          label: 'Rappel des données de l\'évaluation N-1',
        },
        {
          id: 'q6', type: 'text', required: true, phase: 'self',
          label: 'Synthèse du manager sur la période écoulée',
        },
      ],
    },
  ]
  counts.forms = await dropAndInsert(Form, forms, 'Forms')

  // ── 4. EVALUATIONS (17) ─────────────────────────────────────────────────
  // Index unique : (campaignId, formId, evaluatorId, evaluateeId)
  // Pour self_evaluation : evaluatorId === evaluateeId
  // Répartition statuts : assigned(2) in_progress(4) submitted(3)
  //                       signed_evaluatee(2) signed_manager(2) validated(2)

  const answersAnnualFull = [
    { questionId: 'q1', value: 4 },
    { questionId: 'q2', value: 3 },
    { questionId: 'q3', value: 'Je souhaite développer mes compétences en leadership et gestion de projet.' },
    { questionId: 'q4', value: 'Rigueur, autonomie, sens des responsabilités et esprit d\'équipe.' },
    { questionId: 'q5', value: 'Gestion du stress en période de forte charge et communication ascendante.' },
    { questionId: 'q6', value: 'Oui, sans hésitation' },
  ]
  const answersAnnualPartial = answersAnnualFull.slice(0, 3)

  const answersMidYearFull = [
    { questionId: 'q1', value: 3 },
    { questionId: 'q2', value: 'Manque de ressources humaines sur certains projets prioritaires.' },
    { questionId: 'q3', value: 'Formation sur les outils de gestion de projet agile (Jira avancé).' },
    { questionId: 'q4', value: 4 },
  ]
  const answersMidYearPartial = answersMidYearFull.slice(0, 2)

  const answers360Full = [
    { questionId: 'q1', value: 5 },
    { questionId: 'q2', value: 4 },
    { questionId: 'q3', value: 4 },
    { questionId: 'q4', value: 3 },
    { questionId: 'q5', value: 'Excellente collaboration au quotidien. Toujours disponible pour aider l\'équipe.' },
  ]
  const answers360Partial = answers360Full.slice(0, 3)

  // Réponses pour le form4 (manager_evaluation) — exerce les types avancés (#1)
  const answersManagerEvalFull = [
    { questionId: 'q1', value: 75 },
    { questionId: 'q2', value: { description: 'Piloter la refonte de l\'architecture microservices.', progress: 60 } },
    { questionId: 'q3', value: 'sunny' },
    { questionId: 'q4', value: { wish: 'functional', details: 'Évolution vers un poste de tech lead à 12 mois.' } },
    { questionId: 'q6', value: 'Très bonne progression technique, prêt pour davantage de responsabilités.' },
  ]

  const evaluations = [
    // ── active1 + form1 (self_eval annuel 2025) ── 4 évals
    {
      _id: oid(), campaignId: C.active1, formId: F.form1,
      evaluatorId: U.emp1, evaluateeId: U.emp1,
      status: 'assigned', answers: [],
      expiresAt: new Date('2025-05-30'),
    },
    {
      _id: oid(), campaignId: C.active1, formId: F.form1,
      evaluatorId: U.emp2, evaluateeId: U.emp2,
      status: 'in_progress', answers: answersAnnualPartial,
      lastSavedAt: daysAgo(2), expiresAt: new Date('2025-05-30'),
    },
    {
      _id: oid(), campaignId: C.active1, formId: F.form1,
      evaluatorId: U.emp3, evaluateeId: U.emp3,
      status: 'in_progress', answers: answersAnnualPartial,
      lastSavedAt: daysAgo(1), expiresAt: new Date('2025-05-30'),
    },
    {
      _id: E.emp4Active1,
      campaignId: C.active1, formId: F.form1,
      evaluatorId: U.emp4, evaluateeId: U.emp4,
      status: 'submitted', answers: answersAnnualFull,
      lastSavedAt: daysAgo(3), expiresAt: new Date('2025-05-30'),
    },

    // ── active1 + form4 (éval compétences manager — types avancés) ── 2 évals
    {
      _id: oid(), campaignId: C.active1, formId: F.form4,
      evaluatorId: U.manager1, evaluateeId: U.emp1,
      status: 'in_progress', answers: answersManagerEvalFull,
      lastSavedAt: daysAgo(1), expiresAt: new Date('2025-05-30'),
    },
    {
      _id: oid(), campaignId: C.active1, formId: F.form4,
      evaluatorId: U.manager1, evaluateeId: U.emp2,
      status: 'assigned', answers: [],
      expiresAt: new Date('2025-05-30'),
    },

    // ── past2 + form2 (mi-parcours S2 2024) ── 4 évals
    {
      _id: oid(), campaignId: C.past2, formId: F.form2,
      evaluatorId: U.emp1, evaluateeId: U.emp1,
      status: 'in_progress', answers: answersMidYearPartial,
      lastSavedAt: daysAgo(100),
    },
    {
      _id: oid(), campaignId: C.past2, formId: F.form2,
      evaluatorId: U.emp2, evaluateeId: U.emp2,
      status: 'submitted', answers: answersMidYearFull,
      lastSavedAt: daysAgo(95),
    },
    {
      _id: oid(), campaignId: C.past2, formId: F.form2,
      evaluatorId: U.emp3, evaluateeId: U.emp3,
      status: 'signed_evaluatee', answers: answersMidYearFull,
      lastSavedAt: daysAgo(90),
      signedByEvaluateeAt: daysAgo(85),
      evaluateeComment: 'Je valide ce bilan de mi-parcours.',
      signatureStatus: 'pending_evaluator',
    },
    {
      _id: oid(), campaignId: C.past2, formId: F.form2,
      evaluatorId: U.emp4, evaluateeId: U.emp4,
      status: 'signed_manager', answers: answersMidYearFull,
      lastSavedAt: daysAgo(88),
      signedByEvaluateeAt: daysAgo(82),
      signedByManagerAt: daysAgo(80),
      reviewerScore: 72,
      reviewerComment: 'Bon bilan de mi-parcours — objectifs en bonne voie.',
      reviewedBy: U.manager3,
      signatureStatus: 'complete',
    },

    // ── past1 + form1 (annuel 2023) ── 4 évals
    {
      _id: E.emp1Past1,
      campaignId: C.past1, formId: F.form1,
      evaluatorId: U.emp1, evaluateeId: U.emp1,
      status: 'validated', answers: answersAnnualFull,
      lastSavedAt: daysAgo(300),
      signedByEvaluateeAt: daysAgo(280), signedByManagerAt: daysAgo(270), signedByHrAt: daysAgo(260),
      reviewerScore: 80,
      reviewerComment: 'Excellente performance annuelle — progression remarquable.',
      reviewedBy: U.manager1,
      signatureStatus: 'complete',
      nextYearObjectives: 'Prendre en charge le mentorat de deux juniors et piloter la refonte technique.',
    },
    {
      _id: E.emp2Past1,
      campaignId: C.past1, formId: F.form1,
      evaluatorId: U.emp2, evaluateeId: U.emp2,
      status: 'validated', answers: answersAnnualFull,
      lastSavedAt: daysAgo(305),
      signedByEvaluateeAt: daysAgo(285), signedByManagerAt: daysAgo(275), signedByHrAt: daysAgo(265),
      reviewerScore: 75,
      reviewerComment: 'Très bon travail — progression notable sur la communication.',
      reviewedBy: U.manager1,
      signatureStatus: 'complete',
      nextYearObjectives: 'Contribuer à un projet open-source et améliorer les compétences en TypeScript.',
    },
    {
      _id: oid(), campaignId: C.past1, formId: F.form1,
      evaluatorId: U.emp3, evaluateeId: U.emp3,
      status: 'signed_evaluatee', answers: answersAnnualFull,
      lastSavedAt: daysAgo(310),
      signedByEvaluateeAt: daysAgo(290),
      signatureStatus: 'pending_evaluator',
    },
    {
      _id: oid(), campaignId: C.past1, formId: F.form1,
      evaluatorId: U.emp4, evaluateeId: U.emp4,
      status: 'signed_manager', answers: answersAnnualFull,
      lastSavedAt: daysAgo(308),
      signedByEvaluateeAt: daysAgo(288), signedByManagerAt: daysAgo(278),
      reviewerScore: 68,
      reviewerComment: 'Résultats corrects — marge de progression sur la proactivité.',
      reviewedBy: U.manager3,
      signatureStatus: 'complete',
    },

    // ── active2 + form3 (360° Q1 2025) ── 3 évals
    {
      _id: oid(), campaignId: C.active2, formId: F.form3,
      evaluatorId: U.emp2, evaluateeId: U.emp1,
      status: 'assigned', answers: [],
    },
    {
      _id: oid(), campaignId: C.active2, formId: F.form3,
      evaluatorId: U.emp3, evaluateeId: U.emp2,
      status: 'submitted', answers: answers360Full,
      lastSavedAt: daysAgo(5),
    },
    {
      _id: oid(), campaignId: C.active2, formId: F.form3,
      evaluatorId: U.emp1, evaluateeId: U.emp3,
      status: 'in_progress', answers: answers360Partial,
      lastSavedAt: daysAgo(1),
    },
  ]
  counts.evaluations = await dropAndInsert(Evaluation, evaluations, 'Evaluations')

  // ── 5. OFFBOARDING REQUESTS (2) ──────────────────────────────────────────
  // Champs : userId / requestedBy / reason (enum) / lastDay / status / checklist
  const offboarding = [
    {
      _id: oid(),
      userId: U.emp5,
      requestedBy: U.hr1,
      reason: 'resignation',
      lastDay: daysAgo(30),
      status: 'completed',
      notes: 'Démission volontaire de Nicolas Blanc — départ négocié avec préavis respecté.',
      checklist: [
        { item: 'Révocation accès systèmes',      done: true,  doneAt: daysAgo(32), doneBy: U.hr1 },
        { item: 'Récupération matériel',           done: true,  doneAt: daysAgo(31), doneBy: U.hr1 },
        { item: 'Archivage évaluations',           done: true,  doneAt: daysAgo(30), doneBy: U.hr1 },
        { item: 'Solde de tout compte',            done: true,  doneAt: daysAgo(30), doneBy: U.hr1 },
        { item: 'Entretien de départ (optionnel)', done: true,  doneAt: daysAgo(35), doneBy: U.hr1 },
      ],
    },
    {
      _id: oid(),
      userId: U.emp4,
      requestedBy: U.hr1,
      reason: 'termination',
      lastDay: daysFrom(30),
      status: 'in_progress',
      notes: 'Fin de CDD de Léa Durand — non-renouvellement du contrat à terme.',
      checklist: [
        { item: 'Révocation accès systèmes',      done: true,  doneAt: daysAgo(5),  doneBy: U.hr1 },
        { item: 'Récupération matériel',           done: true,  doneAt: daysAgo(3),  doneBy: U.hr1 },
        { item: 'Archivage évaluations',           done: false, doneAt: null },
        { item: 'Solde de tout compte',            done: false, doneAt: null },
        { item: 'Entretien de départ (optionnel)', done: false, doneAt: null },
      ],
    },
  ]
  counts.offboarding = await dropAndInsert(OffboardingRequest, offboarding, 'OffboardingRequests')

  // ── 6. MOBILITY REQUESTS (4) ────────────────────────────────────────────
  // Champs : employeeId / requestType (enum) / targetPosition (required) /
  //          status (pending|under_review|approved|rejected|on_hold)
  const mobility = [
    {
      _id: oid(),
      employeeId:        U.emp1,
      currentPosition:   'Ingénieur logiciel',
      currentDepartment: 'Engineering',
      targetPosition:    'Ingénieur senior',
      requestType:       'promotion',
      motivation:        'Cinq ans d\'expérience, leadership démontré sur plusieurs projets critiques. Prêt à assumer des responsabilités élargies.',
      status:            'approved',
      priority:          'high',
      reviewedBy:        U.manager1,
      reviewedAt:        daysAgo(15),
      decision: {
        decidedAt:     daysAgo(15),
        decidedBy:     U.manager1,
        effectiveDate: daysFrom(30),
        comment:       'Promotion accordée — très bon profil, évolution méritée.',
      },
      implementation: { status: 'pending' },
    },
    {
      _id: oid(),
      employeeId:        U.emp2,
      currentPosition:   'Ingénieure logicielle',
      currentDepartment: 'Engineering',
      targetPosition:    'Chargée de développement commercial',
      targetDepartment:  'Sales',
      requestType:       'department_change',
      motivation:        'Souhait de réorientation vers des fonctions commerciales — compétences techniques en appui des ventes.',
      status:            'pending',
      priority:          'normal',
    },
    {
      _id: oid(),
      employeeId:        U.emp3,
      currentPosition:   'Commercial',
      currentDepartment: 'Sales',
      targetPosition:    'Commercial international',
      targetSite:        'Londres',
      requestType:       'international',
      motivation:        'Souhait d\'expérience internationale pour développer le marché anglophone. Niveau d\'anglais C2.',
      status:            'under_review',
      priority:          'medium',
      reviewedBy:        U.hr1,
    },
    {
      _id: oid(),
      employeeId:        U.emp4,
      currentPosition:   'Chargée de support client',
      currentDepartment: 'Customer Success',
      targetPosition:    'Responsable support intérimaire',
      requestType:       'secondment',
      motivation:        'Opportunité de développer des compétences managériales via un remplacement de 6 mois.',
      status:            'rejected',
      priority:          'low',
      reviewedBy:        U.hr1,
      reviewedAt:        daysAgo(7),
      hrComment:         'Aucun poste de remplacement disponible pour cette période — demande à reconsidérer en S2.',
      decision: {
        decidedAt: daysAgo(7),
        decidedBy: U.hr1,
        comment:   'Demande rejetée — pas de besoin opérationnel identifié.',
      },
    },
  ]
  counts.mobility = await dropAndInsert(MobilityRequest, mobility, 'MobilityRequests')

  // ── 7. PDI PLANS (3) ────────────────────────────────────────────────────
  // Champs : employee / manager (required) / period.{start,end} (required)
  //          status : draft | active | completed | archived
  const pdis = [
    {
      _id: PDI_IDS.pdi1,
      employee: U.emp1,
      manager:  U.manager1,
      campaign: C.active1,
      period:   { start: new Date('2025-01-01'), end: new Date('2025-12-31') },
      objectives: [
        'Obtenir la certification AWS Solutions Architect Associate (SAA-C03)',
        'Prendre en charge le mentorat de deux ingénieurs juniors',
        'Conduire la refonte de l\'architecture microservices du projet Alpha',
      ],
      actions: [
        {
          title: 'Formation AWS SAA-C03', type: 'formation',
          description: 'Suivre la formation officielle AWS + examens blancs',
          targetDate: new Date('2025-06-30'), status: 'in_progress',
        },
        {
          title: 'Sessions de mentorat hebdomadaires', type: 'coaching',
          description: 'Sessions de 1h chaque semaine avec les deux juniors',
          targetDate: new Date('2025-12-31'), status: 'planned',
        },
        {
          title: 'Document architecture microservices', type: 'projet',
          description: 'Rédiger et présenter en revue technique la nouvelle architecture',
          targetDate: new Date('2025-09-30'), status: 'planned',
        },
        {
          title: 'Lecture Clean Architecture', type: 'lecture',
          description: 'Lire « Clean Architecture » de Robert C. Martin',
          targetDate: new Date('2025-03-31'), status: 'completed',
          completedAt: daysAgo(10),
        },
      ],
      status: 'active',
      managerSignedAt: daysAgo(20),
    },
    {
      _id: PDI_IDS.pdi2,
      employee: U.emp2,
      manager:  U.manager1,
      campaign: C.active1,
      period:   { start: new Date('2025-01-01'), end: new Date('2025-12-31') },
      objectives: [
        'Améliorer les compétences en communication écrite et orale',
        'Contribuer activement à un projet open-source reconnu',
      ],
      actions: [
        {
          title: 'Atelier « Écrire pour convaincre »', type: 'formation',
          description: 'Suivre l\'atelier interne de communication professionnelle',
          targetDate: new Date('2025-04-30'), status: 'completed',
          completedAt: daysAgo(5),
        },
        {
          title: 'Contribution open-source', type: 'projet',
          description: 'Soumettre au moins une PR substantielle sur un projet OSS identifié',
          targetDate: new Date('2025-07-31'), status: 'in_progress',
        },
        {
          title: 'Certification TypeScript avancée', type: 'certification',
          description: 'Obtenir la certification TypeScript nivel avanzado',
          targetDate: new Date('2025-09-30'), status: 'planned',
        },
      ],
      status: 'completed',
      employeeSignedAt: daysAgo(15),
      managerSignedAt:  daysAgo(12),
    },
    {
      _id: PDI_IDS.pdi3,
      employee: U.emp3,
      manager:  U.manager2,
      campaign: C.active1,
      period:   { start: new Date('2025-01-01'), end: new Date('2025-12-31') },
      objectives: [
        'Développer le portefeuille clients sur le marché britannique',
        'Maîtriser les fonctionnalités avancées du CRM Salesforce',
      ],
      actions: [
        {
          title: 'Formation Salesforce Sales Cloud', type: 'formation',
          description: 'Préparer et passer la certification Salesforce Sales Cloud Consultant',
          targetDate: new Date('2025-05-31'), status: 'planned',
        },
        {
          title: 'Prospection marché UK', type: 'projet',
          description: 'Identifier et qualifier 20 prospects sur le marché britannique',
          targetDate: new Date('2025-12-31'), status: 'planned',
        },
      ],
      status: 'draft',
    },
  ]
  counts.pdis = await dropAndInsert(PDI, pdis, 'PDI Plans')

  // ── 8. EVENTS (4) ────────────────────────────────────────────────────────
  // Types valides : deadline | interview | meeting | feedback | campaign
  // (Les types training/teambuilding/onboarding sont mappés sur « meeting »)
  const events = [
    {
      _id: oid(),
      title:       'Formation Sécurité informatique',
      description: 'Session obligatoire de sensibilisation à la sécurité des SI.',
      location:    'Salle de conférence A',
      type:        'meeting',
      date:        daysFrom(30),
      endDate:     daysFrom(30),
      createdBy:   U.hr1,
    },
    {
      _id: oid(),
      title:       'Team Building Q2 2025',
      description: 'Activité de cohésion inter-équipes — journée en extérieur.',
      location:    'Parc des Buttes-Chaumont, Paris',
      type:        'meeting',
      date:        daysFrom(60),
      endDate:     daysFrom(61),
      createdBy:   U.hr2,
    },
    {
      _id: oid(),
      title:       'Réunion Annuelle RH',
      description: 'Bilan annuel des ressources humaines — présentation aux managers.',
      location:    'Grande salle du siège',
      type:        'meeting',
      date:        daysAgo(30),
      endDate:     daysAgo(30),
      createdBy:   U.hr1,
    },
    {
      _id: oid(),
      title:       'Onboarding Thomas Richard',
      description: 'Journée d\'intégration — présentation des équipes et des outils.',
      location:    'Bureaux Sales, 2e étage',
      type:        'meeting',
      date:        daysAgo(180),
      createdBy:   U.hr1,
    },
  ]
  counts.events = await dropAndInsert(Event, events, 'Events')

  // ── 9. RESOURCES (3) ────────────────────────────────────────────────────
  // Champs : title / type (pdf|xlsx|docx|pptx) / filename (required) /
  //          status / createdBy (required)
  // Note : pas de champ « url » ni « tags » dans le modèle Resource.
  const resources = [
    {
      _id: oid(),
      title:       'Guide entretien annuel',
      description: 'Guide complet pour préparer et conduire l\'entretien annuel de performance.',
      type:        'pdf',
      filename:    'guide-entretien-annuel.pdf',
      status:      'published',
      publishedAt: daysAgo(60),
      createdBy:   U.hr1,
    },
    {
      _id: oid(),
      title:       'Politique mobilité interne',
      description: 'Document décrivant les règles et procédures de mobilité interne chez NX-RH.',
      type:        'pdf',
      filename:    'politique-mobilite-interne.pdf',
      status:      'published',
      publishedAt: daysAgo(90),
      createdBy:   U.hr1,
    },
    {
      _id: oid(),
      title:       'Charte développement personnel',
      description: 'Engagements de l\'entreprise en matière de développement des collaborateurs.',
      type:        'docx',
      filename:    'charte-developpement-personnel.docx',
      status:      'published',
      publishedAt: daysAgo(45),
      createdBy:   U.hr2,
    },
  ]
  counts.resources = await dropAndInsert(Resource, resources, 'Resources')

  // ── 10. NOTIFICATIONS (20) ──────────────────────────────────────────────
  // Types valides (NOTIFICATION_TYPES) :
  //   eval_assigned | eval_submitted | eval_reviewed | eval_signed_evaluatee |
  //   eval_signed_manager | eval_signed_hr | eval_reminder_deadline | eval_expired |
  //   campaign_launched | campaign_closed | request_submitted | request_treated |
  //   request_rejected | reminder | system
  const notifications = [
    // admin1 (2)
    { _id: oid(), userId: U.admin1, type: 'campaign_launched',      read: true,  priority: 'medium', createdAt: daysAgo(14), title: 'Campagne lancée', body: 'L\'entretien annuel 2025 est désormais actif.' },
    { _id: oid(), userId: U.admin1, type: 'system',                 read: false, priority: 'low',    createdAt: daysAgo(2),  title: 'Mise à jour plateforme', body: 'NX-RH a été mis à jour vers la version 2.3.0.' },
    // hr1 (2)
    { _id: oid(), userId: U.hr1,    type: 'eval_submitted',         read: true,  priority: 'medium', createdAt: daysAgo(3),  title: 'Évaluation soumise', body: 'Léa Durand a soumis son auto-évaluation annuelle.' },
    { _id: oid(), userId: U.hr1,    type: 'campaign_launched',      read: false, priority: 'high',   createdAt: daysAgo(1),  title: 'Nouvelle campagne active', body: 'L\'évaluation 360° Q1 2025 a démarré.', link: '/campaigns' },
    // hr2 (2)
    { _id: oid(), userId: U.hr2,    type: 'eval_submitted',         read: false, priority: 'medium', createdAt: daysAgo(4),  title: 'Évaluation soumise', body: 'Emma Petit a soumis son bilan de mi-parcours.' },
    { _id: oid(), userId: U.hr2,    type: 'request_submitted',      read: true,  priority: 'high',   createdAt: daysAgo(5),  title: 'Demande de mobilité reçue', body: 'Thomas Richard a soumis une demande de mobilité internationale.' },
    // manager1 (2)
    { _id: oid(), userId: U.manager1, type: 'eval_submitted',       read: false, priority: 'high',   createdAt: daysAgo(1),  title: 'Évaluation à traiter', body: 'Lucas Bernard a soumis son auto-évaluation — action requise de votre part.' },
    { _id: oid(), userId: U.manager1, type: 'request_treated',      read: true,  priority: 'medium', createdAt: daysAgo(15), title: 'Promotion approuvée', body: 'La promotion de Lucas Bernard a été accordée.' },
    // manager2 (2)
    { _id: oid(), userId: U.manager2, type: 'eval_assigned',        read: true,  priority: 'medium', createdAt: daysAgo(8),  title: 'Évaluation assignée', body: 'Une évaluation vous a été assignée dans la campagne Entretien annuel 2025.' },
    { _id: oid(), userId: U.manager2, type: 'eval_reminder_deadline',read: false, priority: 'high',   createdAt: daysAgo(1),  title: 'Rappel échéance', body: 'La campagne Entretien annuel 2025 se clôture dans 30 jours.' },
    // manager3 (2)
    { _id: oid(), userId: U.manager3, type: 'eval_submitted',       read: true,  priority: 'medium', createdAt: daysAgo(3),  title: 'Évaluation soumise', body: 'Léa Durand a soumis son auto-évaluation.' },
    { _id: oid(), userId: U.manager3, type: 'system',               read: false, priority: 'urgent', createdAt: daysAgo(14), title: 'Offboarding initié', body: 'Le processus d\'offboarding de Léa Durand a été initié par les RH.' },
    // emp1 (2)
    { _id: oid(), userId: U.emp1,   type: 'eval_assigned',          read: true,  priority: 'medium', createdAt: daysAgo(10), title: 'Évaluation assignée', body: 'Vous avez été assigné à l\'entretien annuel 2025.' },
    { _id: oid(), userId: U.emp1,   type: 'request_treated',        read: false, priority: 'high',   createdAt: daysAgo(15), title: 'Promotion approuvée 🎉', body: 'Votre demande de promotion a été approuvée — félicitations !', link: '/mobility' },
    // emp2 (2)
    { _id: oid(), userId: U.emp2,   type: 'eval_assigned',          read: true,  priority: 'medium', createdAt: daysAgo(10), title: 'Évaluation assignée', body: 'Vous avez été assigné à l\'entretien annuel 2025.' },
    { _id: oid(), userId: U.emp2,   type: 'eval_reminder_deadline', read: false, priority: 'medium', createdAt: daysAgo(2),  title: 'Rappel auto-évaluation', body: 'Pensez à compléter votre auto-évaluation avant le 30 avril 2025.' },
    // emp3 (2)
    { _id: oid(), userId: U.emp3,   type: 'eval_assigned',          read: true,  priority: 'medium', createdAt: daysAgo(7),  title: 'Évaluation 360° assignée', body: 'Une évaluation 360° vous a été assignée.' },
    { _id: oid(), userId: U.emp3,   type: 'request_treated',        read: false, priority: 'medium', createdAt: daysAgo(5),  title: 'Demande de mobilité en examen', body: 'Votre demande de mobilité internationale est en cours d\'examen par les RH.' },
    // emp4 (2)
    { _id: oid(), userId: U.emp4,   type: 'eval_assigned',          read: false, priority: 'medium', createdAt: daysAgo(10), title: 'Évaluation assignée', body: 'Vous avez été assigné à l\'entretien annuel 2025.' },
    { _id: oid(), userId: U.emp4,   type: 'request_rejected',       read: false, priority: 'high',   createdAt: daysAgo(7),  title: 'Demande de secondement refusée', body: 'Votre demande de secondement n\'a pas été retenue pour cette période.', link: '/mobility' },
  ]
  counts.notifications = await dropAndInsert(Notification, notifications, 'Notifications')

  // ── 11. AUDIT LOGS (20) ─────────────────────────────────────────────────
  // Actions valides (AUDIT_ACTIONS) :
  //   login | login_failed | status_change | evaluation_update | reassigned |
  //   bulk_action | campaign_create | campaign_activate | campaign_update |
  //   campaign_delete | offboard | offboarding_create | offboarding_update |
  //   offboarding_delete | gdpr_anonymize
  const auditLogs = [
    { _id: oid(), userId: U.admin1,   userRole: 'admin',    action: 'login',               targetType: 'User',       targetId: U.admin1,   meta: { ip: '10.0.0.1', ua: 'Mozilla/5.0' },             createdAt: daysAgo(1) },
    { _id: oid(), userId: U.hr1,      userRole: 'hr',       action: 'login',               targetType: 'User',       targetId: U.hr1,      meta: { ip: '10.0.0.2' },                                 createdAt: daysAgo(2) },
    { _id: oid(), userId: U.hr2,      userRole: 'hr',       action: 'login',               targetType: 'User',       targetId: U.hr2,      meta: { ip: '10.0.0.3' },                                 createdAt: daysAgo(1) },
    { _id: oid(), userId: U.manager1, userRole: 'manager',  action: 'login',               targetType: 'User',       targetId: U.manager1, meta: { ip: '10.0.0.4' },                                 createdAt: daysAgo(1) },
    { _id: oid(), userId: U.emp1,     userRole: 'employee', action: 'login',               targetType: 'User',       targetId: U.emp1,     meta: { ip: '10.0.0.5' },                                 createdAt: daysAgo(2) },
    { _id: oid(), userId: U.hr1,      userRole: 'hr',       action: 'campaign_create',     targetType: 'Campaign',   targetId: C.active1,  meta: { name: 'Entretien annuel 2025' },                   createdAt: daysAgo(30) },
    { _id: oid(), userId: U.hr1,      userRole: 'hr',       action: 'campaign_activate',   targetType: 'Campaign',   targetId: C.active1,  meta: { previousStatus: 'draft' },                        createdAt: daysAgo(29) },
    { _id: oid(), userId: U.hr2,      userRole: 'hr',       action: 'campaign_create',     targetType: 'Campaign',   targetId: C.active2,  meta: { name: 'Évaluation 360° Q1 2025' },                createdAt: daysAgo(25) },
    { _id: oid(), userId: U.hr2,      userRole: 'hr',       action: 'campaign_activate',   targetType: 'Campaign',   targetId: C.active2,  meta: { previousStatus: 'draft' },                        createdAt: daysAgo(24) },
    { _id: oid(), userId: U.hr2,      userRole: 'hr',       action: 'campaign_update',     targetType: 'Campaign',   targetId: C.draft1,   meta: { field: 'description', by: 'hr2' },                createdAt: daysAgo(1) },
    { _id: oid(), userId: U.emp4,     userRole: 'employee', action: 'status_change',       targetType: 'Evaluation', targetId: E.emp4Active1, meta: { from: 'in_progress', to: 'submitted' },       createdAt: daysAgo(3) },
    { _id: oid(), userId: U.emp2,     userRole: 'employee', action: 'status_change',       targetType: 'Evaluation', targetId: oid(),       meta: { from: 'in_progress', to: 'submitted', campaign: 'Mi-parcours S2 2024' }, createdAt: daysAgo(95) },
    { _id: oid(), userId: U.manager1, userRole: 'manager',  action: 'evaluation_update',   targetType: 'Evaluation', targetId: E.emp1Past1, meta: { field: 'reviewerScore', value: 80 },            createdAt: daysAgo(270) },
    { _id: oid(), userId: U.hr1,      userRole: 'hr',       action: 'status_change',       targetType: 'Evaluation', targetId: E.emp1Past1, meta: { from: 'signed_manager', to: 'validated' },      createdAt: daysAgo(260) },
    { _id: oid(), userId: U.hr1,      userRole: 'hr',       action: 'status_change',       targetType: 'Evaluation', targetId: E.emp2Past1, meta: { from: 'signed_manager', to: 'validated' },      createdAt: daysAgo(265) },
    { _id: oid(), userId: U.hr1,      userRole: 'hr',       action: 'offboarding_create',  targetType: 'User',       targetId: U.emp5,     meta: { reason: 'resignation', lastDay: daysAgo(30) },   createdAt: daysAgo(65) },
    { _id: oid(), userId: U.hr1,      userRole: 'hr',       action: 'offboard',            targetType: 'User',       targetId: U.emp5,     meta: { lastDay: daysAgo(30), allStepsDone: true },       createdAt: daysAgo(30) },
    { _id: oid(), userId: U.hr1,      userRole: 'hr',       action: 'offboarding_create',  targetType: 'User',       targetId: U.emp4,     meta: { reason: 'termination', lastDay: daysFrom(30) },  createdAt: daysAgo(14) },
    { _id: oid(), userId: U.admin1,   userRole: 'admin',    action: 'gdpr_anonymize',      targetType: 'User',       targetId: U.emp5,     meta: { fields: ['phone', 'avatar'], requestedBy: U.admin1 }, createdAt: daysAgo(28) },
    { _id: oid(), userId: U.admin1,   userRole: 'admin',    action: 'bulk_action',         targetType: 'Campaign',   targetId: C.active1,  meta: { affectedCount: 4, action: 'send_reminder' },      createdAt: daysAgo(7) },
  ]
  counts.auditLogs = await dropAndInsert(AuditLog, auditLogs, 'AuditLogs')

  // ── Résumé ────────────────────────────────────────────────────────────────
  console.log(`
✅  Seed complet :
   👤  ${counts.users}             utilisateurs
   📢  ${counts.campaigns}             campagnes
   📋  ${counts.forms}             formulaires
   📝  ${counts.evaluations}            évaluations
   🚪  ${counts.offboarding}             demandes offboarding
   🔄  ${counts.mobility}             demandes de mobilité
   🎯  ${counts.pdis}             plans PDI
   📅  ${counts.events}             événements
   📁  ${counts.resources}             ressources
   🔔  ${counts.notifications}            notifications
   🗂️   ${counts.auditLogs}            entrées audit log
`)

  await mongoose.disconnect()
  process.exit(0)
}

seed().catch(err => {
  console.error('\n❌  Seed error :', err.message)
  if (process.env.SEED_VERBOSE) console.error(err)
  mongoose.disconnect().finally(() => process.exit(1))
})
