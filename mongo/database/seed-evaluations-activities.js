'use strict'

// =============================================================================
// database/seed-evaluations-activities.js
//
// Seed évaluations (10 statuts couverts), offboarding, événements calendrier,
// ressources documentaires, notifications et piste d'audit.
//
// Idempotent : upsert partout, aucune donnée supprimée.
// Usage : node database/seed-evaluations-activities.js
// =============================================================================

const path = require('path')
const serverDir = path.resolve(__dirname, '../server')
const resolve = (mod) => require(path.join(serverDir, 'node_modules', mod))

resolve('dotenv').config({ path: path.join(serverDir, '.env') })

if (!process.env.MONGO_URI) {
  process.env.MONGO_URI = 'mongodb://root:changeme@localhost:27017/nanoxplore_rh?authSource=admin'
}

const { connect } = require('../server/config/db')
const {
  User, Campaign, Form, Evaluation,
  OffboardingRequest, Event, Resource, Notification, AuditLog,
} = require('../server/models')

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** N jours dans le passé depuis maintenant */
const ago = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)

/** Upsert d'une évaluation par sa clé composée unique */
async function upsertEval(filter, data) {
  return Evaluation.findOneAndUpdate(
    filter,
    { $setOnInsert: { ...filter, ...data } },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: false },
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function seedEvaluationsActivities() {
  await connect()
  console.log('[seed:eval-activities] Connecté à MongoDB')

  // ── Step 1 : Récupération des données existantes ───────────────────────────

  const [
    admin, rh, direction, managerIt, managerMarketing,
    empA, empB, empC, empD, empOffboarding,
  ] = await Promise.all([
    User.findOne({ email: 'admin@nx-rh.fr' }),
    User.findOne({ email: 'rh@nx-rh.fr' }),
    User.findOne({ email: 'direction@nx-rh.fr' }),
    User.findOne({ email: 'manager-it@nx-rh.fr' }),
    User.findOne({ email: 'manager-marketing@nx-rh.fr' }),
    User.findOne({ email: 'employee-a@nx-rh.fr' }),
    User.findOne({ email: 'employee-b@nx-rh.fr' }),
    User.findOne({ email: 'employee-c@nx-rh.fr' }),
    User.findOne({ email: 'employee-d@nx-rh.fr' }),
    User.findOne({ email: 'employee-offboarding@nx-rh.fr' }),
  ])

  for (const [name, user] of Object.entries({
    admin, rh, direction, managerIt, empA, empB, empC, empD, empOffboarding,
  })) {
    if (!user) throw new Error(`[seed] Utilisateur introuvable : ${name}. Lancez seed-users-full d'abord.`)
  }
  if (!managerMarketing) {
    console.warn('[seed] manager-marketing@nx-rh.fr introuvable — rh utilisé comme fallback pour l\'éval archivée')
  }

  const [campaign2024, campaign2025, campaign2026] = await Promise.all([
    Campaign.findOne({ name: 'Entretiens annuels 2024' }),
    Campaign.findOne({ name: 'Entretiens annuels 2025' }),
    Campaign.findOne({ name: 'Entretiens annuels 2026' }),
  ])

  const [selfEvalForm, managerEvalForm, upwardForm, objectivesForm] = await Promise.all([
    Form.findOne({ formType: 'self_evaluation' }),
    Form.findOne({ formType: 'manager_evaluation' }),
    Form.findOne({ formType: 'upward_feedback' }),
    Form.findOne({ formType: 'objectives' }),
  ])

  for (const [name, val] of Object.entries({
    campaign2025, campaign2026, selfEvalForm, managerEvalForm, objectivesForm,
  })) {
    if (!val) throw new Error(`[seed] Données manquantes : ${name}. Lancez seed-campaigns-forms d'abord.`)
  }

  // ── Step 2 : Évaluations (10 statuts) ─────────────────────────────────────
  console.log('[seed:eval-activities] Création des évaluations...')

  // 1. assigned — empB auto-évaluation non commencée
  const eval1 = await upsertEval(
    {
      campaignId: campaign2026._id,
      formId: selfEvalForm._id,
      evaluatorId: empB._id,
      evaluateeId: empB._id,
    },
    { status: 'assigned', answers: [] },
  )

  // 2. in_progress — empA auto-évaluation en cours
  const eval2 = await upsertEval(
    {
      campaignId: campaign2026._id,
      formId: selfEvalForm._id,
      evaluatorId: empA._id,
      evaluateeId: empA._id,
    },
    {
      status: 'in_progress',
      answers: [
        { questionId: 's1', value: 3 },
        { questionId: 's2', value: 'Bonne progression sur les projets backend. Migration vers TypeScript complétée.' },
      ],
      lastSavedAt: new Date('2026-01-15'),
    },
  )

  // 3. submitted — empC auto-évaluation soumise (toutes les réponses)
  const eval3 = await upsertEval(
    {
      campaignId: campaign2026._id,
      formId: selfEvalForm._id,
      evaluatorId: empC._id,
      evaluateeId: empC._id,
    },
    {
      status: 'submitted',
      answers: [
        { questionId: 's1', value: 4 },
        { questionId: 's2', value: 'Lancement de 3 campagnes marketing et refonte du site web.' },
        { questionId: 's3', value: true },
        { questionId: 's4', value: 8 },
        { questionId: 's5', value: 'Développer les compétences en analytics' },
      ],
      lastSavedAt: new Date('2026-01-28'),
    },
  )

  // 4. reviewed — managerIt évalue empA (après soumission)
  const eval4 = await upsertEval(
    {
      campaignId: campaign2026._id,
      formId: managerEvalForm._id,
      evaluatorId: managerIt._id,
      evaluateeId: empA._id,
    },
    {
      status: 'reviewed',
      answers: [
        { questionId: 'm1', value: 4 },
        { questionId: 'm2', value: "Très bonne maîtrise technique, excellent esprit d'équipe." },
        { questionId: 'm3', value: true },
        { questionId: 'm4', value: 4 },
      ],
      reviewedBy: managerIt._id,
      reviewerScore: 80,
      reviewerComment: "Collaborateur fiable, force de proposition sur les sujets d'architecture.",
      lastSavedAt: new Date('2026-02-05'),
    },
  )

  // 5. signed_evaluatee — managerIt évalue empB, employé a signé
  const eval5 = await upsertEval(
    {
      campaignId: campaign2026._id,
      formId: managerEvalForm._id,
      evaluatorId: managerIt._id,
      evaluateeId: empB._id,
    },
    {
      status: 'signed_evaluatee',
      answers: [
        { questionId: 'm1', value: 5 },
        { questionId: 'm2', value: 'Performance exceptionnelle, force de proposition.' },
        { questionId: 'm3', value: true },
        { questionId: 'm4', value: 5 },
      ],
      reviewedBy: managerIt._id,
      reviewerScore: 95,
      reviewerComment: "Meilleur élément de l'équipe cette année. Prêt pour une évolution.",
      signedByEvaluateeAt: new Date('2026-02-10'),
      lastSavedAt: new Date('2026-02-08'),
    },
  )

  // 6. signed_manager — empB objectifs N+1, manager a co-signé
  const eval6 = await upsertEval(
    {
      campaignId: campaign2026._id,
      formId: objectivesForm._id,
      evaluatorId: empB._id,
      evaluateeId: empB._id,
    },
    {
      status: 'signed_manager',
      answers: [
        { questionId: 'o1', value: "Finaliser la refonte de l'interface mobile" },
        { questionId: 'o2', value: "Montée en compétences sur les tests d'intégration" },
      ],
      signedByEvaluateeAt: new Date('2026-02-15'),
      signedByManagerAt: new Date('2026-02-16'),
      lastSavedAt: new Date('2026-02-14'),
    },
  )

  // 7. signed_hr — empA objectifs N+1, RH a signé
  const eval7 = await upsertEval(
    {
      campaignId: campaign2026._id,
      formId: objectivesForm._id,
      evaluatorId: empA._id,
      evaluateeId: empA._id,
    },
    {
      status: 'signed_hr',
      answers: [
        { questionId: 'o1', value: 'Monter en compétences sur le cloud AWS' },
        { questionId: 'o2', value: 'Contribuer à 2 projets transverses' },
        { questionId: 'o3', value: 'Contexte : passage à une architecture microservices prévu au T2 2026.' },
      ],
      signedByEvaluateeAt: new Date('2026-02-20'),
      signedByManagerAt: new Date('2026-02-21'),
      signedByHrAt: new Date('2026-02-22'),
      lastSavedAt: new Date('2026-02-19'),
    },
  )

  // 8. validated — campagne 2025, empB auto-évaluation validée
  const eval8 = await upsertEval(
    {
      campaignId: campaign2025._id,
      formId: selfEvalForm._id,
      evaluatorId: empB._id,
      evaluateeId: empB._id,
    },
    {
      status: 'validated',
      answers: [
        { questionId: 's1', value: 4 },
        { questionId: 's2', value: 'Excellente année : dépassement des objectifs, onboarding de 2 juniors.' },
        { questionId: 's3', value: true },
        { questionId: 's4', value: 9 },
        { questionId: 's5', value: 'Évoluer vers un rôle de lead technique' },
      ],
      signedByEvaluateeAt: new Date('2025-03-01'),
      signedByManagerAt: new Date('2025-03-08'),
      signedByHrAt: new Date('2025-03-14'),
      lastSavedAt: new Date('2025-02-28'),
    },
  )

  // 9. expired — campagne 2025, managerIt → empC, jamais commencée
  const eval9 = await upsertEval(
    {
      campaignId: campaign2025._id,
      formId: managerEvalForm._id,
      evaluatorId: managerIt._id,
      evaluateeId: empC._id,
    },
    {
      status: 'expired',
      answers: [],
      expiresAt: new Date('2025-02-01'),
    },
  )

  // 10. archived — empOffboarding → feedback sur managerMarketing (ou rh en fallback)
  const archivedEvaluatee = managerMarketing || rh
  let eval10 = null
  if (upwardForm) {
    eval10 = await upsertEval(
      {
        campaignId: campaign2026._id,
        formId: upwardForm._id,
        evaluatorId: empOffboarding._id,
        evaluateeId: archivedEvaluatee._id,
      },
      {
        status: 'archived',
        answers: [],
        auditLog: [{
          action: 'archived',
          by: rh._id,
          at: new Date('2026-01-18'),
          meta: { reason: 'offboarding' },
        }],
      },
    )
  } else {
    console.warn('[seed] upward_feedback form introuvable — évaluation archivée non créée')
  }

  const evalCount = [eval1, eval2, eval3, eval4, eval5, eval6, eval7, eval8, eval9, eval10]
    .filter(Boolean).length
  console.log(`[seed:eval-activities] ✅ ${evalCount} évaluations upsertées (10 statuts couverts)`)

  // ── Step 3 : OffboardingRequests ──────────────────────────────────────────
  console.log('[seed:eval-activities] Création des offboardings...')

  await OffboardingRequest.findOneAndUpdate(
    { userId: empOffboarding._id },
    {
      $setOnInsert: {
        userId: empOffboarding._id,
        requestedBy: rh._id,
        reason: 'resignation',
        lastDay: new Date('2026-02-28'),
        status: 'in_progress',
        notes: 'Départ volontaire après transition vers statut consultant.',
        checklist: [
          { item: 'Révocation accès systèmes',      done: true,  doneAt: new Date('2026-01-20') },
          { item: 'Récupération matériel',           done: true,  doneAt: new Date('2026-01-22') },
          { item: 'Archivage évaluations',           done: false },
          { item: 'Solde de tout compte',            done: false },
          { item: 'Entretien de départ (optionnel)', done: false },
        ],
      },
    },
    { upsert: true, new: true },
  )

  await OffboardingRequest.findOneAndUpdate(
    { userId: empD._id },
    {
      $setOnInsert: {
        userId: empD._id,
        requestedBy: admin._id,
        reason: 'termination',
        lastDay: new Date('2025-12-15'),
        status: 'completed',
        notes: "Fin de période d'essai. Tous les accès révoqués.",
        checklist: [
          { item: 'Révocation accès systèmes',      done: true, doneAt: new Date('2025-12-10') },
          { item: 'Récupération matériel',           done: true, doneAt: new Date('2025-12-12') },
          { item: 'Archivage évaluations',           done: true, doneAt: new Date('2025-12-13') },
          { item: 'Solde de tout compte',            done: true, doneAt: new Date('2025-12-14') },
          { item: 'Entretien de départ (optionnel)', done: false },
        ],
      },
    },
    { upsert: true, new: true },
  )

  console.log('[seed:eval-activities] ✅ 2 offboarding requests upsertées')

  // ── Step 4 : Événements calendrier ────────────────────────────────────────
  console.log('[seed:eval-activities] Création des événements...')

  const EVENTS = [
    {
      title: 'Lancement campagne 2026',
      type: 'campaign',
      date: new Date('2026-01-05'),
      campaignId: campaign2026._id,
      createdBy: admin._id,
      targetRoles: ['admin', 'hr', 'director', 'manager', 'employee'],
    },
    {
      title: 'Deadline auto-évaluations',
      type: 'deadline',
      date: new Date('2026-01-31'),
      campaignId: campaign2026._id,
      createdBy: rh._id,
      targetRoles: ['admin', 'hr', 'director', 'manager', 'employee'],
    },
    {
      title: 'Réunion de calibration managers',
      type: 'meeting',
      date: new Date('2026-02-03'),
      createdBy: rh._id,
      targetRoles: ['admin', 'hr', 'director', 'manager'],
    },
    {
      title: 'Entretiens manager – vague 1',
      type: 'interview',
      date: new Date('2026-02-10'),
      campaignId: campaign2026._id,
      createdBy: managerIt._id,
      targetRoles: ['admin', 'hr', 'manager'],
    },
    {
      title: 'Comité RH mensuel',
      type: 'meeting',
      date: new Date('2026-02-12'),
      createdBy: rh._id,
      targetRoles: ['admin', 'hr'],
    },
    {
      title: 'Deadline évaluations manager',
      type: 'deadline',
      date: new Date('2026-02-15'),
      campaignId: campaign2026._id,
      createdBy: rh._id,
      targetRoles: ['admin', 'hr', 'director', 'manager', 'employee'],
    },
    {
      title: 'Entretien directeur / managers',
      type: 'interview',
      date: new Date('2026-02-20'),
      createdBy: direction._id,
      targetRoles: ['admin', 'director', 'manager'],
    },
    {
      title: 'Point offboarding',
      type: 'meeting',
      date: new Date('2026-02-24'),
      createdBy: rh._id,
      targetRoles: ['admin', 'hr'],
    },
    {
      title: 'Clôture retours employés',
      type: 'deadline',
      date: new Date('2026-03-10'),
      createdBy: rh._id,
      targetRoles: ['admin', 'hr', 'director', 'manager', 'employee'],
    },
    {
      title: 'Jury promotions',
      type: 'meeting',
      date: new Date('2026-03-18'),
      createdBy: direction._id,
      targetRoles: ['admin', 'hr', 'director'],
    },
    {
      title: 'Fin campagne 2026',
      type: 'deadline',
      date: new Date('2026-03-31'),
      campaignId: campaign2026._id,
      createdBy: admin._id,
      targetRoles: ['admin', 'hr', 'director', 'manager', 'employee'],
    },
  ]

  for (const ev of EVENTS) {
    await Event.findOneAndUpdate(
      { title: ev.title, date: ev.date },
      { $setOnInsert: ev },
      { upsert: true, new: true },
    )
  }

  console.log(`[seed:eval-activities] ✅ ${EVENTS.length} événements upsertés`)

  // ── Step 5 : Ressources documentaires ─────────────────────────────────────
  console.log('[seed:eval-activities] Création des ressources...')

  const RESOURCES = [
    {
      title: 'Guide auto-évaluation 2026',
      description: 'Guide pratique pour remplir votre auto-évaluation.',
      type: 'pdf',
      filename: 'guide-auto-eval-2026.pdf',
      status: 'published',
      publishedAt: new Date('2026-01-05'),
      visibleTo: ['employee', 'manager', 'director', 'hr', 'admin'],
      createdBy: rh._id,
    },
    {
      title: 'Charte des entretiens annuels',
      description: 'Règles et bonnes pratiques pour les entretiens annuels.',
      type: 'pdf',
      filename: 'charte-entretiens.pdf',
      status: 'published',
      publishedAt: new Date('2026-01-05'),
      visibleTo: ['employee', 'manager', 'director', 'hr', 'admin'],
      createdBy: rh._id,
    },
    {
      title: 'Grille de compétences',
      description: 'Référentiel de compétences par poste et niveau.',
      type: 'xlsx',
      filename: 'grille-competences.xlsx',
      status: 'published',
      publishedAt: new Date('2026-01-06'),
      visibleTo: ['manager', 'director', 'hr', 'admin'],
      createdBy: admin._id,
    },
    {
      title: 'Modèle objectifs N+1',
      description: 'Template Excel pour définir les objectifs annuels.',
      type: 'xlsx',
      filename: 'modele-objectifs.xlsx',
      status: 'draft',
      visibleTo: ['hr', 'admin'],
      createdBy: rh._id,
    },
    {
      title: 'Processus mobilité interne',
      description: 'Procédure et formulaires pour les demandes de mobilité.',
      type: 'pdf',
      filename: 'processus-mobilite.pdf',
      status: 'draft',
      visibleTo: ['hr', 'admin'],
      createdBy: rh._id,
    },
  ]

  for (const res of RESOURCES) {
    await Resource.findOneAndUpdate(
      { title: res.title },
      { $setOnInsert: res },
      { upsert: true, new: true },
    )
  }

  console.log(`[seed:eval-activities] ✅ ${RESOURCES.length} ressources upsertées`)

  // ── Step 6 : Notifications ─────────────────────────────────────────────────
  console.log('[seed:eval-activities] Création des notifications...')

  // Idempotence : on n'insère que si l'utilisateur n'a pas encore de notifications
  const notifUserMap = [
    { user: admin,     label: 'admin' },
    { user: rh,        label: 'rh' },
    { user: direction, label: 'direction' },
    { user: managerIt, label: 'managerIt' },
    { user: empA,      label: 'empA' },
  ]

  const notifCounts = await Promise.all(
    notifUserMap.map(({ user }) => Notification.countDocuments({ userId: user._id })),
  )

  const toInsert = []

  // Admin
  if (notifCounts[0] === 0) {
    toInsert.push(
      { userId: admin._id, type: 'campaign_launched',     title: 'Campagne 2026 lancée',            body: 'La campagne "Entretiens annuels 2026" a été lancée avec succès.',             read: true,  priority: 'high',   createdAt: ago(30), link: '/campaigns' },
      { userId: admin._id, type: 'eval_submitted',        title: 'Auto-évaluation soumise',          body: 'Employee C a soumis son auto-évaluation.',                                   read: true,  priority: 'medium', createdAt: ago(25), link: '/evaluations' },
      { userId: admin._id, type: 'eval_reviewed',         title: 'Évaluation revue',                 body: 'Manager IT a finalisé la revue de l\'évaluation d\'Employee A.',              read: true,  priority: 'medium', createdAt: ago(20), link: '/evaluations' },
      { userId: admin._id, type: 'eval_signed_hr',        title: 'Évaluation signée RH',             body: "L'évaluation d'Employee A a été signée par les RH.",                          read: true,  priority: 'medium', createdAt: ago(10), link: '/evaluations' },
      { userId: admin._id, type: 'system',                title: 'Offboarding en cours',             body: 'Un dossier de départ est en cours pour Employee Offboarding.',                read: true,  priority: 'high',   createdAt: ago(8),  link: '/offboarding' },
      { userId: admin._id, type: 'eval_expired',          title: 'Évaluation expirée détectée',      body: "L'évaluation de Manager IT pour Employee C (2025) a expiré.",                 read: true,  priority: 'high',   createdAt: ago(7),  link: '/evaluations' },
      { userId: admin._id, type: 'campaign_closed',       title: 'Campagne 2025 clôturée',           body: 'La campagne "Entretiens annuels 2025" a été clôturée.',                       read: true,  priority: 'medium', createdAt: ago(6),  link: '/campaigns' },
      { userId: admin._id, type: 'eval_reminder_deadline',title: 'Rappel : deadline approche',       body: 'La deadline évaluations manager est dans 7 jours.',                          read: false, priority: 'high',   createdAt: ago(2),  link: '/campaigns' },
      { userId: admin._id, type: 'system',                title: 'Rapport mensuel disponible',       body: 'Le rapport RH de janvier 2026 est disponible dans les analytics.',            read: false, priority: 'low',    createdAt: ago(1),  link: '/analytics' },
      { userId: admin._id, type: 'eval_signed_evaluatee', title: 'Signature évaluatee reçue',        body: 'Employee B a signé son évaluation manager — co-signature manager attendue.',  read: false, priority: 'medium', createdAt: ago(0),  link: '/evaluations' },
    )
  }

  // RH
  if (notifCounts[1] === 0) {
    toInsert.push(
      { userId: rh._id, type: 'campaign_launched',      title: 'Campagne 2026 lancée',           body: 'La campagne "Entretiens annuels 2026" a démarré.',                              read: true,  priority: 'high',   createdAt: ago(30), link: '/campaigns' },
      { userId: rh._id, type: 'eval_submitted',         title: 'Auto-évaluation soumise',         body: 'Employee C a soumis son auto-évaluation.',                                    read: true,  priority: 'medium', createdAt: ago(25), link: '/evaluations' },
      { userId: rh._id, type: 'eval_reviewed',          title: 'Évaluation revue',                body: "Manager IT a finalisé l'évaluation d'Employee A.",                            read: true,  priority: 'medium', createdAt: ago(20), link: '/evaluations' },
      { userId: rh._id, type: 'eval_signed_manager',    title: 'Signature manager reçue',         body: "Manager IT a co-signé l'évaluation d'Employee B.",                            read: true,  priority: 'medium', createdAt: ago(15), link: '/evaluations' },
      { userId: rh._id, type: 'request_submitted',      title: 'Demande soumise',                 body: 'Une demande de mobilité a été soumise et attend traitement.',                  read: true,  priority: 'medium', createdAt: ago(12), link: '/requests' },
      { userId: rh._id, type: 'eval_expired',           title: 'Évaluation expirée',              body: "Une évaluation a expiré dans la campagne 2025.",                               read: true,  priority: 'high',   createdAt: ago(7),  link: '/evaluations' },
      { userId: rh._id, type: 'eval_reminder_deadline', title: 'Rappel deadline',                 body: 'La deadline employés est dans 3 jours.',                                      read: false, priority: 'urgent', createdAt: ago(3),  link: '/campaigns' },
      { userId: rh._id, type: 'eval_signed_hr',         title: 'Signature RH requise',            body: "Une évaluation (objectifs empA) attend votre signature.",                     read: false, priority: 'high',   createdAt: ago(2),  link: '/evaluations' },
      { userId: rh._id, type: 'reminder',               title: 'Traiter les offboardings',        body: "2 dossiers d'offboarding sont en cours — vérifiez les checklists.",            read: false, priority: 'medium', createdAt: ago(1),  link: '/offboarding' },
      { userId: rh._id, type: 'system',                 title: 'Maintenance planifiée',           body: 'NX-RH sera en maintenance le 28/02 de 2h à 4h.',                               read: false, priority: 'low',    createdAt: ago(0),  link: null },
    )
  }

  // Direction
  if (notifCounts[2] === 0) {
    toInsert.push(
      { userId: direction._id, type: 'campaign_launched',      title: 'Campagne 2026 lancée',       body: "La campagne annuelle 2026 a démarré.",                                       read: true,  priority: 'high',   createdAt: ago(30), link: '/campaigns' },
      { userId: direction._id, type: 'eval_submitted',         title: 'Évaluation soumise',          body: "Employee C a soumis son auto-évaluation pour 2026.",                        read: true,  priority: 'low',    createdAt: ago(25), link: '/evaluations' },
      { userId: direction._id, type: 'eval_signed_manager',    title: 'Signatures managers avancent',body: "Les co-signatures managers progressent pour la campagne 2026.",              read: true,  priority: 'medium', createdAt: ago(14), link: '/evaluations' },
      { userId: direction._id, type: 'eval_signed_hr',         title: 'Évaluation signée RH',        body: "L'évaluation d'Employee A a été signée par RH.",                            read: true,  priority: 'medium', createdAt: ago(10), link: '/evaluations' },
      { userId: direction._id, type: 'reminder',               title: 'Entretien direction prévu',   body: "Réunion avec les managers prévue le 20/02/2026.",                            read: true,  priority: 'medium', createdAt: ago(9),  link: '/calendar' },
      { userId: direction._id, type: 'eval_reminder_deadline', title: 'Rappel deadline clôture',     body: "La deadline de clôture de la campagne 2026 approche.",                      read: true,  priority: 'high',   createdAt: ago(5),  link: '/campaigns' },
      { userId: direction._id, type: 'campaign_closed',        title: 'Bilan campagne 2025',          body: "Le bilan de la campagne 2025 est disponible.",                              read: false, priority: 'medium', createdAt: ago(3),  link: '/campaigns' },
      { userId: direction._id, type: 'eval_signed_hr',         title: 'Évaluation 2025 validée',     body: "L'évaluation d'Employee B (campagne 2025) est validée.",                    read: false, priority: 'low',    createdAt: ago(2),  link: '/evaluations' },
      { userId: direction._id, type: 'reminder',               title: 'Jury promotions le 18/03',    body: "Le jury des promotions est programmé le 18/03/2026.",                       read: false, priority: 'high',   createdAt: ago(0),  link: '/calendar' },
    )
  }

  // Manager IT
  if (notifCounts[3] === 0) {
    toInsert.push(
      { userId: managerIt._id, type: 'eval_assigned',          title: 'Évaluation assignée — empA',  body: "Vous devez évaluer Employee A pour la campagne 2026.",                      read: true,  priority: 'high',   createdAt: ago(28), link: '/evaluations' },
      { userId: managerIt._id, type: 'eval_assigned',          title: 'Évaluation assignée — empB',  body: "Vous devez évaluer Employee B pour la campagne 2026.",                      read: true,  priority: 'high',   createdAt: ago(28), link: '/evaluations' },
      { userId: managerIt._id, type: 'eval_submitted',         title: 'Auto-évaluation reçue — empA',body: "Employee A a soumis son auto-évaluation.",                                  read: true,  priority: 'medium', createdAt: ago(22), link: '/evaluations' },
      { userId: managerIt._id, type: 'eval_submitted',         title: 'Auto-évaluation reçue — empC',body: "Employee C a soumis son auto-évaluation.",                                  read: true,  priority: 'medium', createdAt: ago(25), link: '/evaluations' },
      { userId: managerIt._id, type: 'eval_signed_evaluatee',  title: 'Signature reçue — empB',      body: "Employee B a signé son évaluation. Votre co-signature est attendue.",       read: true,  priority: 'high',   createdAt: ago(12), link: '/evaluations' },
      { userId: managerIt._id, type: 'eval_reminder_deadline', title: 'Rappel deadline manager',     body: "La deadline pour les évaluations manager est le 15/02/2026.",               read: true,  priority: 'urgent', createdAt: ago(8),  link: '/evaluations' },
      { userId: managerIt._id, type: 'reminder',               title: 'Réunion de calibration',      body: "Réunion de calibration managers le 03/02/2026 à 14h.",                      read: false, priority: 'medium', createdAt: ago(4),  link: '/calendar' },
      { userId: managerIt._id, type: 'eval_reminder_deadline', title: 'Dernière relance',            body: "Il reste des évaluations à finaliser avant la deadline.",                   read: false, priority: 'urgent', createdAt: ago(2),  link: '/evaluations' },
      { userId: managerIt._id, type: 'system',                 title: 'Compte rendu disponible',     body: "Le compte rendu de la réunion de calibration est dans les ressources.",     read: false, priority: 'low',    createdAt: ago(1),  link: '/resources' },
      { userId: managerIt._id, type: 'eval_signed_manager',    title: 'Co-signature confirmée',      body: "Votre co-signature sur l'évaluation d'Employee B a été enregistrée.",       read: false, priority: 'low',    createdAt: ago(0),  link: '/evaluations' },
    )
  }

  // Employee A
  if (notifCounts[4] === 0) {
    toInsert.push(
      { userId: empA._id, type: 'eval_assigned',          title: 'Auto-évaluation assignée',        body: "Votre auto-évaluation pour la campagne 2026 est disponible.",                read: true,  priority: 'high',   createdAt: ago(28), link: '/evaluations' },
      { userId: empA._id, type: 'eval_reminder_deadline', title: 'Rappel : deadline approche',      body: "Pensez à compléter votre auto-évaluation avant le 31/01.",                  read: true,  priority: 'high',   createdAt: ago(15), link: '/evaluations' },
      { userId: empA._id, type: 'eval_reviewed',          title: 'Évaluation revue par votre manager', body: "Votre manager a examiné et annoté votre évaluation.",                    read: true,  priority: 'high',   createdAt: ago(12), link: '/evaluations' },
      { userId: empA._id, type: 'eval_signed_manager',    title: 'Évaluation co-signée',            body: "Votre évaluation a été co-signée par votre manager.",                       read: true,  priority: 'medium', createdAt: ago(10), link: '/evaluations' },
      { userId: empA._id, type: 'eval_signed_hr',         title: 'Évaluation signée RH',            body: "Votre évaluation (objectifs N+1) a été signée par les RH.",                 read: true,  priority: 'medium', createdAt: ago(8),  link: '/evaluations' },
      { userId: empA._id, type: 'request_treated',        title: 'Votre demande a été traitée',     body: "Votre demande de formation a été examinée par les RH.",                     read: true,  priority: 'medium', createdAt: ago(5),  link: '/requests' },
      { userId: empA._id, type: 'reminder',               title: 'Objectifs N+1 à valider',         body: "N'oubliez pas de valider vos objectifs pour la prochaine période.",          read: false, priority: 'medium', createdAt: ago(3),  link: '/evaluations' },
      { userId: empA._id, type: 'eval_reminder_deadline', title: 'Signature en attente',            body: "Votre signature est attendue sur le formulaire d'objectifs.",                read: false, priority: 'high',   createdAt: ago(2),  link: '/evaluations' },
      { userId: empA._id, type: 'system',                 title: 'Documents disponibles',           body: "Le guide d'auto-évaluation 2026 est disponible dans les ressources.",       read: false, priority: 'low',    createdAt: ago(1),  link: '/resources' },
      { userId: empA._id, type: 'campaign_launched',      title: 'Nouvelle campagne ouverte',       body: "La campagne 2026 est lancée. Complétez votre auto-évaluation.",              read: false, priority: 'medium', createdAt: ago(0),  link: '/campaigns' },
    )
  }

  if (toInsert.length > 0) {
    await Notification.insertMany(toInsert)
    console.log(`[seed:eval-activities] ✅ ${toInsert.length} notifications insérées`)
  } else {
    console.log('[seed:eval-activities] Notifications déjà présentes, ignorées')
  }

  // ── Step 7 : Piste d'audit ────────────────────────────────────────────────
  console.log('[seed:eval-activities] Création des logs d\'audit...')

  // Idempotence : on skip si l'admin a déjà des logs
  const existingAuditCount = await AuditLog.countDocuments({ userId: admin._id })

  if (existingAuditCount < 5) {
    const camp2024Id = campaign2024 ? campaign2024._id : campaign2025._id

    const auditLogs = [
      // Connexions
      { userId: admin._id,     userRole: 'admin',    action: 'login',             targetType: 'User',               targetId: admin._id,          meta: { authSource: 'local' },                                                   createdAt: ago(30) },
      { userId: rh._id,        userRole: 'hr',       action: 'login',             targetType: 'User',               targetId: rh._id,             meta: { authSource: 'local' },                                                   createdAt: ago(29) },
      // Tentative échouée
      { userId: admin._id,     userRole: 'admin',    action: 'login_failed',      targetType: 'User',               targetId: admin._id,          meta: { email: 'unknown@hacker.io', reason: 'invalid_credentials' },            createdAt: ago(28) },
      // Campagnes
      { userId: admin._id,     userRole: 'admin',    action: 'campaign_create',   targetType: 'Campaign',           targetId: campaign2026._id,   meta: { name: 'Entretiens annuels 2026' },                                       createdAt: ago(27) },
      { userId: admin._id,     userRole: 'admin',    action: 'campaign_create',   targetType: 'Campaign',           targetId: campaign2025._id,   meta: { name: 'Entretiens annuels 2025' },                                       createdAt: ago(26) },
      { userId: admin._id,     userRole: 'admin',    action: 'campaign_activate', targetType: 'Campaign',           targetId: campaign2026._id,   meta: { previousStatus: 'draft', newStatus: 'active' },                         createdAt: ago(25) },
      { userId: rh._id,        userRole: 'hr',       action: 'campaign_update',   targetType: 'Campaign',           targetId: campaign2026._id,   meta: { field: 'deadlineEmployee', value: '2026-01-31' },                       createdAt: ago(24) },
      // Mises à jour évaluations
      { userId: managerIt._id, userRole: 'manager',  action: 'evaluation_update', targetType: 'Evaluation',         targetId: eval4._id,          meta: { status: 'reviewed',          evaluateeId: String(empA._id) },           createdAt: ago(20) },
      { userId: managerIt._id, userRole: 'manager',  action: 'evaluation_update', targetType: 'Evaluation',         targetId: eval5._id,          meta: { status: 'signed_evaluatee',  evaluateeId: String(empB._id) },           createdAt: ago(15) },
      { userId: rh._id,        userRole: 'hr',       action: 'evaluation_update', targetType: 'Evaluation',         targetId: eval7._id,          meta: { status: 'signed_hr',         evaluateeId: String(empA._id) },           createdAt: ago(8) },
      // Réaffectations
      { userId: rh._id,        userRole: 'hr',       action: 'reassigned',        targetType: 'Evaluation',         targetId: eval9._id,          meta: { from: String(managerIt._id), reason: 'Évaluation expirée — réassignation' }, createdAt: ago(22) },
      { userId: admin._id,     userRole: 'admin',    action: 'reassigned',        targetType: 'Evaluation',         targetId: eval2._id,          meta: { from: String(empA._id), to: String(empA._id), reason: 'Correction' },   createdAt: ago(18) },
      // Action en masse
      { userId: rh._id,        userRole: 'hr',       action: 'bulk_action',       targetType: 'Evaluation',         targetId: campaign2026._id,   meta: { action: 'send_reminder', count: 5, campaignId: String(campaign2026._id) }, createdAt: ago(10) },
      // Changements de statut
      { userId: empC._id,      userRole: 'employee', action: 'status_change',     targetType: 'Evaluation',         targetId: eval3._id,          meta: { from: 'in_progress',   to: 'submitted' },                               createdAt: ago(23) },
      { userId: managerIt._id, userRole: 'manager',  action: 'status_change',     targetType: 'Evaluation',         targetId: eval4._id,          meta: { from: 'submitted',      to: 'reviewed' },                               createdAt: ago(20) },
      { userId: rh._id,        userRole: 'hr',       action: 'status_change',     targetType: 'Evaluation',         targetId: eval7._id,          meta: { from: 'signed_manager', to: 'signed_hr' },                              createdAt: ago(8) },
      // Offboarding
      { userId: rh._id,        userRole: 'hr',       action: 'offboarding_create', targetType: 'OffboardingRequest', targetId: empOffboarding._id, meta: { reason: 'resignation', lastDay: '2026-02-28', userId: String(empOffboarding._id) }, createdAt: ago(14) },
      { userId: admin._id,     userRole: 'admin',    action: 'offboarding_create', targetType: 'OffboardingRequest', targetId: empD._id,           meta: { reason: 'termination', lastDay: '2025-12-15', userId: String(empD._id) }, createdAt: ago(50) },
      { userId: rh._id,        userRole: 'hr',       action: 'offboarding_update', targetType: 'OffboardingRequest', targetId: empOffboarding._id, meta: { items: ['Révocation accès systèmes', 'Récupération matériel'], done: true }, createdAt: ago(7) },
      { userId: admin._id,     userRole: 'admin',    action: 'offboard',           targetType: 'User',               targetId: empD._id,           meta: { lastDay: '2025-12-15', status: 'completed' },                          createdAt: ago(48) },
      // RGPD
      { userId: admin._id,     userRole: 'admin',    action: 'gdpr_anonymize',    targetType: 'User',               targetId: empD._id,           meta: { fields: ['firstName', 'lastName', 'email'], anonymizedAt: ago(45).toISOString() }, createdAt: ago(45) },
      // Suppression campagne test
      { userId: admin._id,     userRole: 'admin',    action: 'campaign_delete',   targetType: 'Campaign',           targetId: camp2024Id,         meta: { name: 'Entretiens annuels 2024 (test)', reason: 'Test supprimé' },       createdAt: ago(60) },
    ]

    await AuditLog.insertMany(auditLogs)
    console.log(`[seed:eval-activities] ✅ ${auditLogs.length} logs d'audit insérés`)
  } else {
    console.log('[seed:eval-activities] Logs d\'audit déjà présents, ignorés')
  }

  // ── Résumé ────────────────────────────────────────────────────────────────
  const [totalEvals, totalOffboard, totalEvents, totalResources, totalNotifs, totalAudit] =
    await Promise.all([
      Evaluation.countDocuments(),
      OffboardingRequest.countDocuments(),
      Event.countDocuments(),
      Resource.countDocuments(),
      Notification.countDocuments(),
      AuditLog.countDocuments(),
    ])

  console.log('\n[seed:eval-activities] ── Résumé ────────────────────────────')
  console.log(`  Evaluations         : ${totalEvals}`)
  console.log(`  OffboardingRequests : ${totalOffboard}`)
  console.log(`  Events              : ${totalEvents}`)
  console.log(`  Resources           : ${totalResources}`)
  console.log(`  Notifications       : ${totalNotifs}`)
  console.log(`  AuditLogs           : ${totalAudit}`)
  console.log('[seed:eval-activities] ✅ Terminé.')
}

module.exports = { seedEvaluationsActivities }

if (require.main === module) {
  seedEvaluationsActivities()
    .then(() => process.exit(0))
    .catch(e => { console.error(e); process.exit(1) })
}
