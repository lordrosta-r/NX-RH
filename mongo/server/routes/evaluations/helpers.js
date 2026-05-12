'use strict'

// =============================================================================
// routes/evaluations/helpers.js — Utilitaires partagés entre les sous-routes
// =============================================================================

const COMPLETED_STATUSES = [
  'submitted', 'reviewed',
  'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated',
]

/** Anonymise evaluatorId/Name si le formulaire est anonyme.
 *  Ajoute aussi les alias evaluatee/evaluator pour la cohérence frontend. */
function sanitizeAnonymity(doc) {
  const out = {
    ...doc,
    evaluatee: doc.evaluateeId ?? null,
    evaluator: doc.evaluatorId ?? null,
  }
  if (doc.formId?.isAnonymous || doc.isAnonymous) {
    return { ...out, evaluatorId: null, evaluator: null, evaluatorName: 'Anonyme' }
  }
  return out
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
