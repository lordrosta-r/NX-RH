'use strict'

// =============================================================================
// routes/evaluations/helpers.js — Utilitaires partagés entre les sous-routes
// =============================================================================

const COMPLETED_STATUSES = [
  'submitted', 'reviewed',
  'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated',
]

/** Anonymise evaluatorId/Name si le formulaire est anonyme. */
function sanitizeAnonymity(doc) {
  if (doc.formId?.isAnonymous || doc.isAnonymous) {
    return { ...doc, evaluatorId: null, evaluatorName: 'Anonyme' }
  }
  return doc
}

/** Formate une réponse selon le type de question pour l'export PDF/CSV. */
function formatAnswer(value, question) {
  if (value === null || value === undefined) return '—'
  if (question.type === 'rating') {
    const scale = question.scale || 5
    return `${value}/${scale}`
  }
  if (question.type === 'yes_no') {
    return (value === true || value === 'true' || value === 1) ? 'Oui' : 'Non'
  }
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

module.exports = { COMPLETED_STATUSES, sanitizeAnonymity, formatAnswer }
