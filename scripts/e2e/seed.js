'use strict'

// =============================================================================
// seed.js — Données de test E2E pour NanoXplore RH
//
// Crée une hiérarchie à 4 niveaux :
//   admin, hr, directeur
//   └─ senior_manager (manager de managers)
//        ├─ manager1 → emp1, emp2
//        └─ manager2 → emp3, emp4
//
// 3 formulaires + 2 campagnes (1 active avec extendedVisibility, 1 draft)
// Idempotent : supprime les données @nx.test avant d'insérer.
// =============================================================================

const { User, Campaign, Form, Evaluation, Event, Resource } = require('../../mongo/server/models')

const DOMAIN = '@nx.test'
const PASSWORD = 'Test1234!'

async function cleanup() {
  const emailRx = { $regex: DOMAIN.replace('.', '\\.') + '$' }
  await Promise.all([
    User.deleteMany({ email: emailRx }),
    Campaign.deleteMany({ name: { $regex: '^\\[E2E\\]' } }),
    Form.deleteMany({ title: { $regex: '^\\[E2E\\]' } }),
    Event.deleteMany({ title: { $regex: '^\\[E2E\\]' } }),
    Resource.deleteMany({ title: { $regex: '^\\[E2E\\]' } }),
  ])
  // Supprimer les évals liées aux campagnes E2E (après suppression des campagnes)
  // On les supprime via les campaignIds qui n'existent plus — orphans cleanup
  const campaigns = await Campaign.find({ name: { $regex: '^\\[E2E\\]' } }).lean()
  if (campaigns.length) {
    await Evaluation.deleteMany({ campaignId: { $in: campaigns.map(c => c._id) } })
  }
}

async function run() {
  // Nettoyage préalable (idempotence)
  await cleanup()

  // ─── Niveau 1 : sans manager ─────────────────────────────────────────────
  const [admin, hr, directeur] = await Promise.all([
    User.create({
      firstName: 'Admin', lastName: 'Test',
      email: 'admin@nx.test', role: 'admin',
      passwordHash: PASSWORD, authSource: 'local', isActive: true,
      department: 'Engineering',
    }),
    User.create({
      firstName: 'RH', lastName: 'Test',
      email: 'hr@nx.test', role: 'hr',
      passwordHash: PASSWORD, authSource: 'local', isActive: true,
      department: 'Engineering',
    }),
    User.create({
      firstName: 'Directeur', lastName: 'Test',
      email: 'directeur@nx.test', role: 'director',
      passwordHash: PASSWORD, authSource: 'local', isActive: true,
      department: 'Engineering',
    }),
  ])

  // ─── Niveau 2 : senior_manager sous directeur ────────────────────────────
  const seniorManager = await User.create({
    firstName: 'Senior', lastName: 'Manager',
    email: 'senior_manager@nx.test', role: 'manager',
    passwordHash: PASSWORD, authSource: 'local', isActive: true,
    department: 'Engineering', managerId: directeur._id,
  })

  // ─── Niveau 3 : manager1 et manager2 sous senior_manager ─────────────────
  const [manager1, manager2] = await Promise.all([
    User.create({
      firstName: 'Manager', lastName: 'Un',
      email: 'manager1@nx.test', role: 'manager',
      passwordHash: PASSWORD, authSource: 'local', isActive: true,
      department: 'Engineering', managerId: seniorManager._id,
    }),
    User.create({
      firstName: 'Manager', lastName: 'Deux',
      email: 'manager2@nx.test', role: 'manager',
      passwordHash: PASSWORD, authSource: 'local', isActive: true,
      department: 'Product', managerId: seniorManager._id,
    }),
  ])

  // ─── Niveau 4 : employés ────────────────────────────────────────────────
  const [emp1, emp2, emp3, emp4] = await Promise.all([
    User.create({
      firstName: 'Emp', lastName: 'Un',
      email: 'emp1@nx.test', role: 'employee',
      passwordHash: PASSWORD, authSource: 'local', isActive: true,
      department: 'Engineering', managerId: manager1._id,
    }),
    User.create({
      firstName: 'Emp', lastName: 'Deux',
      email: 'emp2@nx.test', role: 'employee',
      passwordHash: PASSWORD, authSource: 'local', isActive: true,
      department: 'Engineering', managerId: manager1._id,
    }),
    User.create({
      firstName: 'Emp', lastName: 'Trois',
      email: 'emp3@nx.test', role: 'employee',
      passwordHash: PASSWORD, authSource: 'local', isActive: true,
      department: 'Product', managerId: manager2._id,
    }),
    User.create({
      firstName: 'Emp', lastName: 'Quatre',
      email: 'emp4@nx.test', role: 'employee',
      passwordHash: PASSWORD, authSource: 'local', isActive: true,
      department: 'Product', managerId: manager2._id,
    }),
  ])

  // ─── Campagnes (créées AVANT les formulaires) ───────────────────────────
  const camp1 = await Campaign.create({
    name: '[E2E] Campagne Active 2025',
    description: 'Campagne E2E active — avec extendedVisibility pour senior_manager',
    startDate: new Date('2025-01-01'),
    endDate:   new Date('2025-12-31'),
    status:    'active',
    createdBy: hr._id,
    extendedVisibility: [
      { managerId: seniorManager._id, restrictedToManagers: [] },
    ],
  })

  const camp2 = await Campaign.create({
    name: '[E2E] Campagne Draft 2025',
    description: 'Campagne E2E draft — sans extendedVisibility',
    startDate: new Date('2025-06-01'),
    endDate:   new Date('2025-12-31'),
    status:    'draft',
    createdBy: hr._id,
    extendedVisibility: [],
  })

  // ─── Formulaires (nécessitent campaignId + formType) ─────────────────────
  const [formA, formB, formC] = await Promise.all([
    Form.create({
      title:      '[E2E] Manager Evaluation',
      description: 'Form E2E type manager_evaluation',
      formType:   'manager_evaluation',
      campaignId: camp1._id,
      createdBy:  hr._id,
      questions: [
        { id: 'q1', type: 'rating',  label: 'Performance globale', required: true, scale: 5 },
        { id: 'q2', type: 'text',    label: 'Points forts',        required: true },
        { id: 'q3', type: 'yes_no',  label: 'Objectifs atteints ?', required: true },
        { id: 'q4', type: 'choice',  label: 'Motivation', required: false, options: ['Élevé', 'Moyen', 'Bas'] },
      ],
    }),
    Form.create({
      title:      '[E2E] Self Evaluation',
      description: 'Form E2E type self_evaluation',
      formType:   'self_evaluation',
      campaignId: camp1._id,
      createdBy:  hr._id,
      questions: [
        { id: 'q1', type: 'rating', label: 'Auto-évaluation globale', required: true, scale: 10 },
        { id: 'q2', type: 'text',   label: 'Réalisations',            required: true },
        { id: 'q3', type: 'rating', label: 'Collaboration',           required: true, scale: 5 },
      ],
    }),
    Form.create({
      title:      '[E2E] Upward Feedback',
      description: 'Form E2E type upward_feedback (anonyme forcé)',
      formType:   'upward_feedback',
      campaignId: camp1._id,
      createdBy:  hr._id,
      questions: [
        { id: 'q1', type: 'rating', label: 'Qualité du management', required: true, scale: 5 },
        { id: 'q2', type: 'text',   label: 'Suggestions',           required: false },
      ],
    }),
  ])

  return {
    admin, hr, directeur, seniorManager, manager1, manager2,
    emp1, emp2, emp3, emp4,
    formA, formB, formC,
    camp1, camp2,
  }
}

module.exports = { run, cleanup }
