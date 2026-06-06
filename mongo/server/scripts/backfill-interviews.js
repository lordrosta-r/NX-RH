'use strict'

// =============================================================================
// scripts/backfill-interviews.js
//
// Parcourt toutes les évaluations existantes et crée/met à jour l'Interview
// correspondant via interviewService.upsertInterviewForEvaluation.
// Opération idempotente : peut être relancée sans risque ($addToSet).
//
// Usage (dans le conteneur app, MONGO_URI fournie par l'environnement) :
//   node scripts/backfill-interviews.js
// =============================================================================

const mongoose = require('mongoose')
const { Evaluation } = require('../models')
const { upsertInterviewForEvaluation } = require('../services/interviewService')

async function main() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    console.error('❌  MONGO_URI absente de l\'environnement')
    process.exit(1)
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 10000 })
  console.log('Connecté à MongoDB.')

  const evaluations = await Evaluation.find({}).lean()
  console.log(`${evaluations.length} évaluation(s) trouvée(s).`)

  let created = 0
  let errors  = 0

  for (const evaluation of evaluations) {
    try {
      const result = await upsertInterviewForEvaluation(evaluation)
      if (result) created++
    } catch (err) {
      errors++
      console.error(`  ✗ Évaluation ${evaluation._id} — ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.log(`\n✅  ${created} Interview(s) créés/mis à jour, ${errors} erreur(s).`)
  await mongoose.disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
