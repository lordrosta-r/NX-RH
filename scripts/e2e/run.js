#!/usr/bin/env node
'use strict'

// =============================================================================
// run.js — Orchestrateur des tests E2E NanoXplore RH
//
// Usage : node scripts/e2e/run.js
//
// Prérequis : MongoDB accessible (docker compose --env-file .env -f docker/docker-compose.yml up -d mongo)
// =============================================================================

// ⚠️ CRITIQUE : définir les variables d'env AVANT tout require() de modules serveur
process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-test-secret-for-nanoxplore-that-is-32chars!!'
process.env.MONGO_URI  = process.env.MONGO_URI  || 'mongodb://localhost:27017/nanoxplore_e2e_test'
process.env.NODE_ENV   = 'test'

const mongoose = require('../../mongo/server/node_modules/mongoose')
const supertest = require('../../mongo/server/node_modules/supertest')

const seed    = require('./seed')
const { app }     = require('./app')

// ─── Modules de test ──────────────────────────────────────────────────────────
const testAuth           = require('./test-auth')
const testRbac           = require('./test-rbac')
const testUsers          = require('./test-users')
const testForms          = require('./test-forms')
const testCampaigns      = require('./test-campaigns')
const testEvaluations    = require('./test-evaluations')
const testHierarchy      = require('./test-hierarchy')
const testRestricted     = require('./test-restricted')
const testMultiForms     = require('./test-multi-forms')
const testEventsRes      = require('./test-events-resources')
const testSecurity       = require('./test-security')
const testValidations    = require('./test-validations')
const testCampaignStats  = require('./test-campaign-stats')
const testDeactivation   = require('./test-deactivation')
const testPagination     = require('./test-pagination')
const testAnswerLock     = require('./test-answer-lock')

// ─── Couleurs terminal ────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
}

function header(title) {
  const line = '─'.repeat(60)
  console.log(`\n${C.cyan}${C.bold}${line}`)
  console.log(`  ${title}`)
  console.log(`${line}${C.reset}`)
}

async function main() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════════╗`)
  console.log(`║        NanoXplore RH — Tests E2E fonctionnels        ║`)
  console.log(`╚══════════════════════════════════════════════════════╝${C.reset}\n`)

  // ── 1. Connexion MongoDB ───────────────────────────────────────────────────
  console.log(`${C.dim}Connexion à ${process.env.MONGO_URI}...${C.reset}`)
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    console.log(`${C.green}✓ MongoDB connecté${C.reset}`)
  } catch (err) {
    console.error(`${C.red}✗ Impossible de se connecter à MongoDB: ${err.message}${C.reset}`)
    console.error(`${C.yellow}  Vérifiez que MongoDB est démarré : docker compose --env-file .env -f docker/docker-compose.yml up -d mongo${C.reset}`)
    process.exit(1)
  }

  // ── 1b. Sync indexes (Mongoose 8 race condition fix) ──────────────────────
  const { User, Campaign, Form, Evaluation } = require('../../mongo/server/models')
  await Promise.all([
    User.syncIndexes(),
    Campaign.syncIndexes(),
    Form.syncIndexes(),
    Evaluation.syncIndexes(),
  ])

  // ── 2. Seeding ─────────────────────────────────────────────────────────────
  console.log(`\n${C.dim}Initialisation des données de test...${C.reset}`)
  let fixtures
  try {
    fixtures = await seed.run()
    console.log(`${C.green}✓ Données de test créées (${Object.keys(fixtures).length} entités)${C.reset}`)
  } catch (err) {
    console.error(`${C.red}✗ Erreur lors du seeding: ${err.message}${C.reset}`)
    console.error(err.stack)
    await mongoose.disconnect()
    process.exit(1)
  }

  // ── 3. Supertest instance ──────────────────────────────────────────────────
  const request = supertest(app)

  // ── 4. Exécution des modules ───────────────────────────────────────────────
  const modules = [
    { name: '🔐 Authentification',                  mod: testAuth          },
    { name: '🛡️  RBAC & Autorisations',              mod: testRbac          },
    { name: '👤 Utilisateurs (CRUD)',                mod: testUsers         },
    { name: '📋 Formulaires',                        mod: testForms         },
    { name: '📅 Campagnes',                          mod: testCampaigns     },
    { name: '📊 Évaluations (workflow 8 statuts)',   mod: testEvaluations   },
    { name: '🌳 Hiérarchie & visibilité étendue',    mod: testHierarchy     },
    { name: '🔒 Visibilité restreinte',              mod: testRestricted    },
    { name: '📝 Formulaires multiples & anonymat',   mod: testMultiForms    },
    { name: '📆 Événements & Ressources',            mod: testEventsRes     },
    { name: '🔴 Sécurité (injections, JWT)',         mod: testSecurity      },
    { name: '✅ Validations métier',                 mod: testValidations   },
    { name: '📈 Statistiques campagnes',             mod: testCampaignStats },
    { name: '🚫 Désactivation utilisateur',          mod: testDeactivation  },
    { name: '📑 Pagination',                         mod: testPagination    },
    { name: '🔐 Verrouillage des réponses',          mod: testAnswerLock    },
  ]

  const results = []
  let totalPassed = 0
  let totalFailed = 0
  const failures = []

  for (const { name, mod } of modules) {
    header(name)
    try {
      const result = await mod.run(request, fixtures)
      results.push({ name, ...result })
      totalPassed += result.passed
      totalFailed += result.failed
      if (result.errors && result.errors.length > 0) {
        failures.push({ module: name, errors: result.errors })
      }
    } catch (err) {
      console.error(`${C.red}  ✗ Module ${name} a planté: ${err.message}${C.reset}`)
      console.error(`${C.dim}${err.stack}${C.reset}`)
      results.push({ name, passed: 0, failed: 1 })
      totalFailed++
      failures.push({ module: name, errors: [{ test: 'module crash', error: err.message }] })
    }
  }

  // ── 5. Rapport final ───────────────────────────────────────────────────────
  const separator = '═'.repeat(60)
  console.log(`\n${C.bold}${C.cyan}╔${separator}╗`)
  console.log(`║${' '.repeat(20)}RAPPORT FINAL${' '.repeat(27)}║`)
  console.log(`╚${separator}╝${C.reset}\n`)

  // Tableau par module
  console.log(`${C.bold}Module                                  │ Passés │ Échoués${C.reset}`)
  console.log('─'.repeat(60))
  for (const r of results) {
    const name = r.name.padEnd(40)
    const passed = String(r.passed).padStart(6)
    const failed = String(r.failed).padStart(7)
    const failColor = r.failed > 0 ? C.red : C.green
    console.log(`${name} │${C.green}${passed}${C.reset} │${failColor}${failed}${C.reset}`)
  }
  console.log('─'.repeat(60))
  const totalColor = totalFailed > 0 ? C.red : C.green
  console.log(
    `${'TOTAL'.padEnd(40)} │${C.green}${String(totalPassed).padStart(6)}${C.reset} │${totalColor}${String(totalFailed).padStart(7)}${C.reset}`
  )

  // Détail des échecs
  if (failures.length > 0) {
    console.log(`\n${C.red}${C.bold}╔══ DÉTAIL DES ÉCHECS ═══════════════════════════════╗${C.reset}`)
    for (const { module, errors } of failures) {
      console.log(`\n${C.red}  Module : ${module}${C.reset}`)
      for (const { test, error } of errors) {
        console.log(`${C.red}    ✗ ${test}${C.reset}`)
        console.log(`${C.dim}      ${error}${C.reset}`)
      }
    }
    console.log()
  }

  // Verdict final
  const total = totalPassed + totalFailed
  const score = total > 0 ? Math.round((totalPassed / total) * 100) : 0
  console.log()
  if (totalFailed === 0) {
    console.log(`${C.green}${C.bold}  🎉 TOUS LES TESTS PASSENT — ${totalPassed}/${total} (${score}%)${C.reset}\n`)
  } else {
    console.log(`${C.yellow}${C.bold}  ⚠️  ${totalPassed}/${total} tests passent (${score}%) — ${totalFailed} échec(s)${C.reset}\n`)
  }

  // ── 6. Nettoyage ──────────────────────────────────────────────────────────
  try {
    await seed.cleanup()
    console.log(`${C.dim}✓ Données de test nettoyées${C.reset}`)
  } catch (err) {
    console.error(`${C.yellow}⚠️  Erreur lors du nettoyage: ${err.message}${C.reset}`)
  }

  await mongoose.disconnect()
  console.log(`${C.dim}✓ Connexion MongoDB fermée${C.reset}\n`)

  process.exit(totalFailed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error(`${C.red}Erreur fatale: ${err.message}${C.reset}`)
  console.error(err.stack)
  process.exit(1)
})
