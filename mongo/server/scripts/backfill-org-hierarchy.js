'use strict'

// =============================================================================
// scripts/backfill-org-hierarchy.js
//
// Remplit les managerId MANQUANTS pour que l'organigramme (/api/org/tree)
// affiche un véritable arbre au lieu d'une rangée plate de racines.
//
// Non destructif & idempotent : ne touche QUE les utilisateurs actifs (hors
// admin) qui n'ont pas déjà de managerId. Les rattachements existants sont
// préservés. Hiérarchie cible : hr (racines) ← manager ← employee.
// Aucun cycle possible (le sens hr→manager→employee est strict).
//
// Usage (dans le conteneur app, MONGO_URI fournie par l'environnement) :
//   node scripts/backfill-org-hierarchy.js            # dry-run (n'écrit rien)
//   node scripts/backfill-org-hierarchy.js --apply    # applique les écritures
// =============================================================================

const mongoose = require('mongoose')
const User = require('../models/User')

async function main() {
  const apply = process.argv.includes('--apply')
  const uri = process.env.MONGO_URI
  if (!uri) {
    console.error('❌  MONGO_URI absente de l\'environnement')
    process.exit(1)
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 10000 })

  const users = await User.find({ isActive: true, role: { $ne: 'admin' } })
    .select('_id firstName lastName role department managerId')
    .lean()

  const hrs = users.filter(u => u.role === 'hr')
  const managers = users.filter(u => u.role === 'manager')
  const others = users.filter(u => !['hr', 'manager'].includes(u.role)) // employee + assimilés

  const inDept = (list, dept) => (dept ? list.filter(u => u.department === dept) : [])
  const sameId = (a, b) => String(a) === String(b)

  const updates = [] // { u, managerId, why }

  // manager sans manager → rattaché à un hr (même département si possible, sinon 1er hr)
  const fallbackHr = hrs[0]
  for (const m of managers) {
    if (m.managerId) continue
    const target = inDept(hrs, m.department)[0] || fallbackHr
    if (target && !sameId(target._id, m._id)) {
      updates.push({ u: m, managerId: target._id, why: `→ HR ${target.firstName} ${target.lastName}` })
    }
  }

  // employee (et autres) sans manager → un manager (même département sinon round-robin)
  let rr = 0
  for (const e of others) {
    if (e.managerId) continue
    let target = inDept(managers, e.department)[0]
    if (!target && managers.length) {
      target = managers[rr % managers.length]
      rr++
    }
    if (target && !sameId(target._id, e._id)) {
      updates.push({ u: e, managerId: target._id, why: `→ manager ${target.firstName} ${target.lastName}` })
    }
  }

  console.log(`Utilisateurs actifs (hors admin): ${users.length}  | hr=${hrs.length} manager=${managers.length} autres=${others.length}`)
  console.log(`managerId manquants à remplir: ${updates.length}`)
  for (const up of updates) {
    console.log(`  • ${up.u.firstName} ${up.u.lastName} (${up.u.role}/${up.u.department || '—'}) ${up.why}`)
  }

  if (!apply) {
    console.log('\n(dry-run) — relancer avec --apply pour écrire en base.')
  } else if (updates.length) {
    const ops = updates.map(up => ({
      updateOne: { filter: { _id: up.u._id }, update: { $set: { managerId: up.managerId } } },
    }))
    const r = await User.bulkWrite(ops)
    console.log(`\n✅  ${r.modifiedCount} utilisateur(s) mis à jour.`)
  } else {
    console.log('\nRien à faire — la hiérarchie est déjà complète.')
  }

  await mongoose.disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
