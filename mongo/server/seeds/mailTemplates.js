'use strict'

// =============================================================================
// seeds/mailTemplates.js — Seed des templates d'email en base MongoDB
//
// À exécuter une seule fois (upsert par slug) :
//   node seeds/mailTemplates.js
//
// Convertit les templates hardcodés de notificationService.js au format
// {{ varName }} utilisé par la DB et les API de personnalisation.
// =============================================================================

require('dotenv').config()

const { connect } = require('../config/db')
const MailTemplate = require('../models/MailTemplate')

// Templates avec les variables interpolées au format {{ varName }}
const SEED_TEMPLATES = [
  {
    slug:      'campaignLaunch',
    subject:   '[NanoXplore RH] Nouvelle campagne : {{ campaignName }}',
    bodyText:  'Bonjour {{ firstName }},\n\nUne nouvelle campagne d\'évaluation "{{ campaignName }}" vient d\'être lancée.\nConnectez-vous pour démarrer votre évaluation.\n\nCordialement,\nNanoXplore RH',
    bodyHtml:  '',
    variables: ['firstName', 'campaignName'],
  },
  {
    slug:      'evaluationAssigned',
    subject:   '[NanoXplore RH] Une évaluation vous a été attribuée',
    bodyText:  'Bonjour {{ firstName }},\n\nUne évaluation vous a été attribuée dans la campagne "{{ campaignName }}".\nConnectez-vous pour la compléter.\n\nCordialement,\nNanoXplore RH',
    bodyHtml:  '',
    variables: ['firstName', 'campaignName'],
  },
  {
    slug:      'evaluationSubmitted',
    subject:   '[NanoXplore RH] Évaluation soumise par {{ evaluatorName }}',
    bodyText:  'Bonjour {{ firstName }},\n\n{{ evaluatorName }} a soumis son évaluation pour la campagne "{{ campaignName }}".\nVous pouvez la consulter depuis votre espace.\n\nCordialement,\nNanoXplore RH',
    bodyHtml:  '',
    variables: ['firstName', 'evaluatorName', 'campaignName'],
  },
  {
    slug:      'deadlineReminder',
    subject:   '[NanoXplore RH] Rappel : échéance proche',
    bodyText:  'Bonjour {{ firstName }},\n\nVotre évaluation ("{{ campaignName }}") arrive à échéance le {{ deadline }}.\nPensez à la compléter avant la date limite.\n\nCordialement,\nNanoXplore RH',
    bodyHtml:  '',
    variables: ['firstName', 'campaignName', 'deadline'],
  },
  {
    slug:      'managerActionRequired',
    subject:   '[NanoXplore RH] Action requise de votre manager',
    bodyText:  'Bonjour {{ firstName }},\n\nUne action de votre manager est requise pour votre évaluation ("{{ campaignName }}").\n\nCordialement,\nNanoXplore RH',
    bodyHtml:  '',
    variables: ['firstName', 'campaignName'],
  },
  {
    slug:      'systemAlerts',
    subject:   '[NanoXplore RH] Alerte système : {{ alertTitle }}',
    bodyText:  'Bonjour {{ firstName }},\n\n{{ alertBody }}\n\nCordialement,\nNanoXplore RH',
    bodyHtml:  '',
    variables: ['firstName', 'alertTitle', 'alertBody'],
  },
  {
    slug:      'bulkReminder',
    subject:   '[NanoXplore RH] Rappel : évaluation en attente — {{ campaignName }}',
    bodyText:  'Bonjour {{ firstName }},\n\nVotre évaluation dans la campagne "{{ campaignName }}" est toujours en attente de complétion.\n{{ message }}\nMerci de vous connecter pour la finaliser.\n\nCordialement,\nNanoXplore RH',
    bodyHtml:  '',
    variables: ['firstName', 'campaignName', 'message'],
  },
]

async function seed() {
  await connect()
  console.log('[Seed] Connexion MongoDB établie')

  let created = 0
  let updated = 0

  for (const tpl of SEED_TEMPLATES) {
    const result = await MailTemplate.findOneAndUpdate(
      { slug: tpl.slug },
      { $setOnInsert: tpl },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
    if (result.createdAt?.getTime() === result.updatedAt?.getTime()) {
      created++
      console.log(`  [+] Créé : ${tpl.slug}`)
    } else {
      console.log(`  [~] Déjà existant (non modifié) : ${tpl.slug}`)
    }
  }

  console.log(`\n[Seed] Terminé — ${created} créé(s), ${SEED_TEMPLATES.length - created} déjà présent(s)`)
  process.exit(0)
}

seed().catch(err => {
  console.error('[Seed] Erreur :', err)
  process.exit(1)
})
