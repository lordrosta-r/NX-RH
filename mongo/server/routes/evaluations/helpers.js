'use strict'

// =============================================================================
// routes/evaluations/helpers.js — Utilitaires partagés entre les sous-routes
// =============================================================================

const COMPLETED_STATUSES = [
  'submitted', 'reviewed',
  'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated',
]

/** Renvoie l'id string d'un champ peuplé ou non ({_id} | ObjectId | string). */
function idOf(ref) {
  if (!ref) return null
  return (ref._id ?? ref).toString()
}

/** Anonymise evaluatorId/Name si le formulaire est anonyme.
 *  Sépare aussi les ids (evaluatorId/evaluateeId = string, attendu par le front)
 *  des objets peuplés (evaluator/evaluatee) — sinon `evaluatorId === user.id`
 *  côté client compare un objet à une string et le mode « remplir » ne se
 *  déclenche jamais pour l'évaluateur. */
function sanitizeAnonymity(doc) {
  const out = {
    ...doc,
    id:          idOf(doc._id),
    evaluatee:   doc.evaluateeId ?? null,
    evaluator:   doc.evaluatorId ?? null,
    form:        doc.formId ?? null,
    evaluateeId: idOf(doc.evaluateeId),
    evaluatorId: idOf(doc.evaluatorId),
    formId:      idOf(doc.formId),
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
