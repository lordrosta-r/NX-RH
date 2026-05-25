'use strict'

// =============================================================================
// routes/evaluations/mutations.js — Barrel : re-exporte les handlers des sous-modules
//
// POST /              → créer une évaluation           → mutations/create.js
// PATCH /:id          → sauvegarder / modifier statut  → mutations/update.js
// PATCH /:id/reassign → réaffecter l'évaluateur        → mutations/reassign.js
// POST  /:id/sign     → signature électronique         → mutations/sign.js
// POST  /:id/expire   → expiration manuelle            → mutations/expire.js
// =============================================================================

const { handleCreate }   = require('./mutations/create')
const { handleUpdate }   = require('./mutations/update')
const { handleReassign } = require('./mutations/reassign')
const { handleSign }     = require('./mutations/sign')
const { handleExpire }   = require('./mutations/expire')


module.exports = { handleCreate, handleUpdate, handleReassign, handleExpire, handleSign }
