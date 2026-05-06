'use strict'

// =============================================================================
// database/seed-campaigns-forms.js — Campagnes, formulaires, configs, mail templates
//
// Idempotent (upsert uniquement — aucune donnée existante supprimée).
// Usage : node database/seed-campaigns-forms.js
// =============================================================================

const path      = require('path')
const serverDir = path.resolve(__dirname, '../server')
const resolve   = (mod) => require(path.join(serverDir, 'node_modules', mod))

resolve('dotenv').config({ path: path.join(serverDir, '.env') })

if (!process.env.MONGO_URI) {
  process.env.MONGO_URI = 'mongodb://root:changeme@localhost:27017/nanoxplore_rh?authSource=admin'
}

const { connect }                          = require('../server/config/db')
const { User, Campaign, Form, Config, MailTemplate } = require('../server/models')

// ─── Mail templates (tirés des hardcoded TEMPLATES de notificationService) ────

const MAIL_TEMPLATES = [
  {
    slug: 'campaignLaunch',
    subject: '[NanoXplore RH] Nouvelle campagne : {{campaignName}}',
    bodyText: `Bonjour {{firstName}},\n\nUne nouvelle campagne d'évaluation "{{campaignName}}" vient d'être lancée.\nConnectez-vous pour démarrer votre évaluation.\n\nCordialement,\nNanoXplore RH`,
    variables: ['firstName', 'campaignName'],
  },
  {
    slug: 'evaluationAssigned',
    subject: '[NanoXplore RH] Une évaluation vous a été attribuée',
    bodyText: `Bonjour {{firstName}},\n\nUne évaluation vous a été attribuée dans la campagne "{{campaignName}}".\nConnectez-vous pour la compléter.\n\nCordialement,\nNanoXplore RH`,
    variables: ['firstName', 'campaignName'],
  },
  {
    slug: 'evaluationSubmitted',
    subject: '[NanoXplore RH] Évaluation soumise par {{evaluatorName}}',
    bodyText: `Bonjour {{firstName}},\n\n{{evaluatorName}} a soumis son évaluation pour la campagne "{{campaignName}}".\nVous pouvez la consulter depuis votre espace.\n\nCordialement,\nNanoXplore RH`,
    variables: ['firstName', 'evaluatorName', 'campaignName'],
  },
  {
    slug: 'deadlineReminder',
    subject: '[NanoXplore RH] Rappel : échéance proche',
    bodyText: `Bonjour {{firstName}},\n\nVotre évaluation ("{{campaignName}}") arrive à échéance le {{deadline}}.\nPensez à la compléter avant la date limite.\n\nCordialement,\nNanoXplore RH`,
    variables: ['firstName', 'campaignName', 'deadline'],
  },
  {
    slug: 'managerActionRequired',
    subject: '[NanoXplore RH] Action requise de votre manager',
    bodyText: `Bonjour {{firstName}},\n\nUne action de votre manager est requise pour votre évaluation ("{{campaignName}}").\n\nCordialement,\nNanoXplore RH`,
    variables: ['firstName', 'campaignName'],
  },
  {
    slug: 'systemAlerts',
    subject: '[NanoXplore RH] Alerte système : {{alertTitle}}',
    bodyText: `Bonjour {{firstName}},\n\n{{alertBody}}\n\nCordialement,\nNanoXplore RH`,
    variables: ['firstName', 'alertTitle', 'alertBody'],
  },
  {
    slug: 'bulkReminder',
    subject: '[NanoXplore RH] Rappel : évaluation en attente — {{campaignName}}',
    bodyText: `Bonjour {{firstName}},\n\nVotre évaluation dans la campagne "{{campaignName}}" est toujours en attente de complétion.\n{{message}}\nMerci de vous connecter pour la finaliser.\n\nCordialement,\nNanoXplore RH`,
    variables: ['firstName', 'campaignName', 'message'],
  },
  {
    slug: 'request_treated',
    subject: '[NanoXplore RH] Votre demande a été traitée',
    bodyText: `Bonjour {{firstName}},\n\nVotre demande "{{formTitle}}" a été examinée par les RH.\n\nCordialement,\nNanoXplore RH`,
    variables: ['firstName', 'formTitle'],
  },
  {
    slug: 'request_rejected',
    subject: "c[NanoXplore RH] Votre demande n'a pas été retenue",
    bodyText: `Bonjour {{firstName}},\n\nVotre demande "{{formTitle}}" n'a pas été retenue.\nMotif : {{note}}\n\nCordialement,\nNanoXplore RH`,
    variables: ['firstName', 'formTitle', 'note'],
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seedCampaignsForms() {
  await connect()
  console.log('[seed:campaigns-forms] Connecté à MongoDB')

  // ── Admin user ──────────────────────────────────────────────────────────────
  const admin = await User.findOne({ email: 'admin@nx-rh.fr' }).lean()
  if (!admin) throw new Error('Admin user not found (admin@nx-rh.fr). Run seed-users first.')

  // ── Campaigns ───────────────────────────────────────────────────────────────

  // N-2 : 2024 (archived)
  const campaign2024 = await Campaign.findOneAndUpdate(
    { name: 'Entretiens annuels 2024' },
    {
      $set: {
        description: "Campagne de bilan annuel pour l'exercice 2024.",
        status: 'archived',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-03-31'),
        targetDepartments: ['Engineering', 'Marketing', 'Finance'],
        createdBy: admin._id,
        enableN1Context: true,
        n1VisibleToEmployee: true,
      },
      $setOnInsert: { name: 'Entretiens annuels 2024' },
    },
    { upsert: true, new: true, runValidators: false }
  )
  console.log(`[seed:campaigns-forms] Campaign 2024 : ${campaign2024._id} (${campaign2024.status})`)

  // N-1 : 2025 (closed)
  const campaign2025 = await Campaign.findOneAndUpdate(
    { name: 'Entretiens annuels 2025' },
    {
      $set: {
        description: "Campagne de bilan annuel pour l'exercice 2025.",
        status: 'closed',
        startDate: new Date('2025-01-10'),
        endDate: new Date('2025-03-31'),
        targetDepartments: ['Engineering', 'Marketing', 'Finance'],
        createdBy: admin._id,
        previousCampaignId: campaign2024._id,
        enableN1Context: true,
        n1VisibleToEmployee: false,
      },
      $setOnInsert: { name: 'Entretiens annuels 2025' },
    },
    { upsert: true, new: true, runValidators: false }
  )
  console.log(`[seed:campaigns-forms] Campaign 2025 : ${campaign2025._id} (${campaign2025.status})`)

  // Current : 2026 (active)
  const campaign2026 = await Campaign.findOneAndUpdate(
    { name: 'Entretiens annuels 2026' },
    {
      $set: {
        description: "Campagne en cours pour l'exercice 2026. Objectif : entretiens individuels et définition des objectifs N+1.",
        status: 'active',
        startDate: new Date('2026-01-05'),
        endDate: new Date('2026-03-31'),
        deadlineEmployee: new Date('2026-01-31'),
        deadlineManager: new Date('2026-02-15'),
        targetDepartments: ['Engineering', 'Marketing', 'Finance', 'HR'],
        createdBy: admin._id,
        previousCampaignId: campaign2025._id,
        enableN1Context: true,
        n1VisibleToEmployee: true,
      },
      $setOnInsert: { name: 'Entretiens annuels 2026' },
    },
    { upsert: true, new: true, runValidators: false }
  )
  console.log(`[seed:campaigns-forms] Campaign 2026 : ${campaign2026._id} (${campaign2026.status})`)

  // ── Forms ────────────────────────────────────────────────────────────────────

  // 1 — self_evaluation
  const selfEvalForm = await Form.findOneAndUpdate(
    { title: 'Auto-évaluation 2026', formType: 'self_evaluation' },
    {
      $set: {
        campaignId: campaign2026._id,
        isAnonymous: false,
        createdBy: admin._id,
        questions: [
          { id: 's1', type: 'rating',         scale: 5,  label: 'Maîtrise du poste et des responsabilités',  required: true,  phase: 'self' },
          { id: 's2', type: 'text',                       label: 'Réalisations marquantes cette année',         required: true,  phase: 'self' },
          { id: 's3', type: 'yes_no',                     label: 'Avez-vous atteint vos objectifs ?',           required: true,  phase: 'self' },
          { id: 's4', type: 'scale',           scale: 10, label: 'Atteinte des objectifs (%)',                  required: false, phase: 'objectives' },
          { id: 's5', type: 'objective_item',             label: 'Objectif principal pour N+1',                 required: false, phase: 'objectives' },
        ],
      },
      $setOnInsert: { title: 'Auto-évaluation 2026', formType: 'self_evaluation' },
    },
    { upsert: true, new: true, runValidators: false }
  )
  console.log(`[seed:campaigns-forms] Form self_evaluation : ${selfEvalForm._id}`)

  // 2 — manager_evaluation
  const managerEvalForm = await Form.findOneAndUpdate(
    { title: 'Évaluation manager 2026', formType: 'manager_evaluation' },
    {
      $set: {
        campaignId: campaign2026._id,
        isAnonymous: false,
        createdBy: admin._id,
        questions: [
          { id: 'm1', type: 'rating', scale: 5, label: 'Performance globale',          required: true,  phase: 'n-1' },
          { id: 'm2', type: 'text',              label: 'Points forts observés',         required: true,  phase: 'n-1' },
          { id: 'm3', type: 'yes_no',            label: 'Autonomie satisfaisante ?',     required: true,  phase: 'n-1' },
          { id: 'm4', type: 'rating', scale: 5, label: "Potentiel d'évolution",         required: false, phase: 'n-1' },
        ],
      },
      $setOnInsert: { title: 'Évaluation manager 2026', formType: 'manager_evaluation' },
    },
    { upsert: true, new: true, runValidators: false }
  )
  console.log(`[seed:campaigns-forms] Form manager_evaluation : ${managerEvalForm._id}`)

  // 3 — upward_feedback (always anonymous)
  const upwardFeedbackForm = await Form.findOneAndUpdate(
    { title: 'Feedback ascendant 2026', formType: 'upward_feedback' },
    {
      $set: {
        campaignId: campaign2026._id,
        isAnonymous: true,
        createdBy: admin._id,
        questions: [
          { id: 'u1', type: 'rating', scale: 5, label: 'Qualité de communication du manager',         required: true,  phase: 'all' },
          { id: 'u2', type: 'text',              label: "Axes d'amélioration suggérés",                required: false, phase: 'all' },
          { id: 'u3', type: 'yes_no',            label: "Le manager est-il disponible et à l'écoute ?", required: true,  phase: 'all' },
        ],
      },
      $setOnInsert: { title: 'Feedback ascendant 2026', formType: 'upward_feedback' },
    },
    { upsert: true, new: true, runValidators: false }
  )
  console.log(`[seed:campaigns-forms] Form upward_feedback : ${upwardFeedbackForm._id}`)

  // 4 — objectives
  const objectivesForm = await Form.findOneAndUpdate(
    { title: 'Objectifs N+1 2026', formType: 'objectives' },
    {
      $set: {
        campaignId: campaign2026._id,
        isAnonymous: false,
        createdBy: admin._id,
        questions: [
          { id: 'o1', type: 'objective_item', label: 'Objectif prioritaire',      required: true,  phase: 'objectives' },
          { id: 'o2', type: 'objective_item', label: 'Objectif secondaire',        required: false, phase: 'objectives' },
          { id: 'o3', type: 'text',            label: 'Contexte et justification', required: false, phase: 'objectives' },
        ],
      },
      $setOnInsert: { title: 'Objectifs N+1 2026', formType: 'objectives' },
    },
    { upsert: true, new: true, runValidators: false }
  )
  console.log(`[seed:campaigns-forms] Form objectives : ${objectivesForm._id}`)

  // Link objectivesFormId on campaign 2026
  await Campaign.findByIdAndUpdate(campaign2026._id, { $set: { objectivesFormId: objectivesForm._id } })
  console.log(`[seed:campaigns-forms] campaign2026.objectivesFormId → ${objectivesForm._id}`)

  // 5 — mobility_request (template, no campaign)
  const mobilityForm = await Form.findOneAndUpdate(
    { title: 'Demande de mobilité interne', formType: 'mobility_request' },
    {
      $set: {
        campaignId: null,
        isAnonymous: false,
        createdBy: admin._id,
        questions: [
          { id: 'mob1', type: 'choice',  options: ['Interne équipe', 'Inter-département', 'Inter-site'], label: 'Type de mobilité souhaitée',              required: true,  phase: 'all' },
          { id: 'mob2', type: 'text',                                                                      label: 'Motivation et projet professionnel',       required: true,  phase: 'all' },
          { id: 'mob3', type: 'yes_no',                                                                    label: 'Mobilité souhaitée dans les 3 prochains mois ?', required: true, phase: 'all' },
        ],
      },
      $setOnInsert: { title: 'Demande de mobilité interne', formType: 'mobility_request' },
    },
    { upsert: true, new: true, runValidators: false }
  )
  console.log(`[seed:campaigns-forms] Form mobility_request : ${mobilityForm._id}`)

  // 6 — promotion_request (template, no campaign)
  const promotionForm = await Form.findOneAndUpdate(
    { title: 'Demande de promotion', formType: 'promotion_request' },
    {
      $set: {
        campaignId: null,
        isAnonymous: false,
        createdBy: admin._id,
        questions: [
          { id: 'promo1', type: 'text',    label: 'Arguments et réalisations justifiant la promotion', required: true,  phase: 'all' },
          { id: 'promo2', type: 'yes_no',  label: 'Nécessite un arbitrage RH spécifique ?',            required: false, phase: 'all' },
          { id: 'promo3', type: 'rating', scale: 5, label: "Auto-évaluation du niveau de performance", required: true,  phase: 'all' },
        ],
      },
      $setOnInsert: { title: 'Demande de promotion', formType: 'promotion_request' },
    },
    { upsert: true, new: true, runValidators: false }
  )
  console.log(`[seed:campaigns-forms] Form promotion_request : ${promotionForm._id}`)

  // ── Config entries (upsert by key) ──────────────────────────────────────────

  const configs = [
    { key: 'ldap.enabled',  value: true },
    { key: 'ldap.baseDn',   value: 'dc=nx-rh,dc=fr' },
    { key: 'ldap.url',      value: 'ldaps://ldap.nx-rh.fr' },
    { key: 'app.features',  value: { offboarding: true, analytics: true, objectives: true } },
    { key: 'smtp.enabled',  value: false },
  ]

  for (const c of configs) {
    await Config.findOneAndUpdate(
      { key: c.key },
      { $set: { value: c.value } },
      { upsert: true }
    )
  }
  console.log(`[seed:campaigns-forms] ${configs.length} Config entries upserted`)

  // ── Mail templates (upsert by slug) ────────────────────────────────────────

  for (const tpl of MAIL_TEMPLATES) {
    await MailTemplate.findOneAndUpdate(
      { slug: tpl.slug },
      {
        $set: {
          subject:   tpl.subject,
          bodyText:  tpl.bodyText,
          variables: tpl.variables,
        },
        $setOnInsert: { slug: tpl.slug },
      },
      { upsert: true }
    )
  }
  console.log(`[seed:campaigns-forms] ${MAIL_TEMPLATES.length} MailTemplate entries upserted`)

  console.log('[seed:campaigns-forms] ✅ Done.')
}

module.exports = { seedCampaignsForms }

if (require.main === module) {
  seedCampaignsForms()
    .then(() => process.exit(0))
    .catch(e => { console.error(e); process.exit(1) })
}
