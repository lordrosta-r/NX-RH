// =============================================================================
// models/Evaluation.js — Évaluations (formulaires remplis)
//
// Une évaluation = un formulaire assigné à un évaluateur pour un évaluatee.
// Compound unique index : (campaignId, formId, evaluatorId, evaluateeId)
//   → un évaluateur ne peut remplir qu'une fois le même form pour la même personne.
//
// evaluatorId est TOUJOURS stocké (nécessaire pour l'index unique),
// mais les routes ne le retournent JAMAIS si form.isAnonymous = true.
//
// Lifecycle : assigned → in_progress → submitted → reviewed
//           → signed_evaluatee → signed_manager → signed_hr → validated
// =============================================================================

const { Schema, model }          = require('mongoose')
const { EVALUATION_STATUSES }    = require('../config/constants')

// Transitions autorisées par rôle — utilisées dans les routes PATCH
const VALID_TRANSITIONS = {
  assigned:        ['in_progress'],
  in_progress:     ['submitted'],
  submitted:       ['reviewed'],
  reviewed:        ['signed_evaluatee'],
  signed_evaluatee:['signed_manager'],
  signed_manager:  ['signed_hr'],       // RH signe avant la validation finale
  signed_hr:       ['validated'],
  validated:       [],  // terminal
  expired:         [],  // terminal — positionné par le scheduler
  rejected:        [],  // terminal — demande RH refusée
  archived:        [],  // terminal — évaluation annulée suite à un offboarding
}

// Transitions autorisées par rôle spécifique (hors admin)
// NOTE : 'admin' n'apparaît pas dans ROLE_TRANSITIONS — il peut effectuer
// n'importe quelle transition valide de VALID_TRANSITIONS.
// Les routes vérifient ADMIN_ROLES.includes(role) pour ce bypass.
const ROLE_TRANSITIONS = {
  employee:  {
    assigned:    ['in_progress'],
    in_progress: ['submitted'],
    reviewed:    ['signed_evaluatee'],   // l'employé signe après review du manager
  },
  manager:   {
    submitted:         ['reviewed'],
    signed_evaluatee:  ['signed_manager'],  // le manager co-signe après l'employé
  },
  director:  {
    submitted:        ['reviewed'],
    signed_evaluatee: ['signed_manager'],
  },
  // HR peut signer directement depuis reviewed OU signed_manager (bypass intentionnel :
  // permet à RH de valider même si l'employé ou le manager n'a pas encore signé).
  // HR peut aussi valider (signed_hr → validated) sans passer par l'admin.
  hr:        {
    reviewed:         ['signed_hr'],
    signed_evaluatee: ['signed_hr'],
    signed_manager:   ['signed_hr'],
    signed_hr:        ['validated'],
  },
}

const LOCKED_STATUSES = ['submitted', 'reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated', 'archived']

// Sous-schema d'une réponse — simple {questionId, value}
const answerSchema = new Schema({
  questionId: { type: String, required: true },
  value:      { type: Schema.Types.Mixed },
}, { _id: false })

const evaluationSchema = new Schema({
  campaignId:  { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
  formId:      { type: Schema.Types.ObjectId, ref: 'Form',     required: true, index: true },
  evaluatorId: { type: Schema.Types.ObjectId, ref: 'User',     required: true, index: true },
  evaluateeId: { type: Schema.Types.ObjectId, ref: 'User',     required: true, index: true },

  status: {
    type: String,
    enum: EVALUATION_STATUSES,
    default: 'assigned',
    index: true,
  },

  // Réponses — embarquées (toujours lues avec l'évaluation)
  answers: {
    type: [answerSchema],
    default: [],
    validate: {
      validator: arr => arr.length <= 500,
      message: 'Maximum 500 réponses par évaluation',
    },
  },

  // Horodatage de la dernière sauvegarde des réponses.
  // Mis à jour automatiquement par pre-save à chaque modification d'answers.
  // Affiché côté client : "Dernière sauvegarde à 14h32".
  lastSavedAt: { type: Date, default: null },

  // Score global optionnel (0–100), ajouté par le reviewer
  reviewerScore: { type: Number, min: 0, max: 100, default: null },

  // Commentaire du reviewer (manager ou directeur)
  reviewerComment: { type: String, default: '', maxlength: 5000 },
  reviewedBy:      { type: Schema.Types.ObjectId, ref: 'User', default: null },

  // Objectifs pour la période N+1, saisis par le reviewer
  nextYearObjectives: { type: String, default: '', maxlength: 5000 },

  // Appréciation des objectifs par le reviewer — { [questionId]: 'achieved'|'partial'|'not_achieved' }
  objectiveRatings: { type: Schema.Types.Mixed, default: {} },

  // Réaction de l'évaluatee après lecture
  evaluateeComment: { type: String, default: '', maxlength: 5000 },
  disagreementFlag: { type: Boolean, default: false },

  // Horodatages des signatures
  signedByEvaluateeAt: { type: Date, default: null },
  signedByManagerAt:   { type: Date, default: null },
  signedByHrAt:        { type: Date, default: null },

  // Dernier rappel d'échéance envoyé (utilisé par le scheduler pour éviter les
  // doublons d'emails — on ne renvoie pas si un rappel a déjà été envoyé dans
  // les dernières 20h pour la même évaluation).
  lastReminderAt: { type: Date, default: null },

  // Date d'expiration automatique = campaign.endDate + 30 jours (définie à la création).
  // Passé cette date, le scheduler passe le statut à 'expired'.
  expiresAt: { type: Date, default: null },

  // Mis à true par le scheduler quand expiresAt est dans moins de 7 jours.
  // Utilisé par l'UI RH pour afficher un badge d'avertissement.
  nearExpiry: { type: Boolean, default: false },

  // Journal des actions RH sur l'évaluation (réaffectations, etc.)
  // Chaque entrée est immuable — append-only.
  auditLog: {
    type: [{
      _id:    false,
      action: { type: String, required: true },
      by:     { type: Schema.Types.ObjectId, ref: 'User' },
      at:     { type: Date, default: Date.now },
      meta:   { type: Schema.Types.Mixed, default: {} },
    }],
    default: [],
  },

}, { timestamps: true, versionKey: false })
evaluationSchema.index(
  { campaignId: 1, formId: 1, evaluatorId: 1, evaluateeId: 1 },
  { unique: true }
)
evaluationSchema.index({ campaignId: 1, status: 1 })
evaluationSchema.index({ evaluateeId: 1, campaignId: 1 })
evaluationSchema.index({ evaluatorId: 1, campaignId: 1 })
// N-1 : lookup direct (éval validée pour un évaluatee dans une campagne donnée)
evaluationSchema.index({ evaluateeId: 1, campaignId: 1, status: 1 }, { name: 'idx_eval_n1_direct' })
// N-1 : fallback auto (dernière éval validée d'un évaluatee, toutes campagnes)
evaluationSchema.index({ evaluateeId: 1, status: 1, updatedAt: -1 }, { name: 'idx_eval_n1_fallback' })

evaluationSchema.post('init', function() {
  this._originalStatus = this.status;
});

// Answer-lock : les réponses ne peuvent plus être modifiées une fois locked.
// FIX de l'ancienne version : on vérifie !isModified('status'), pas this.status.
//   → Si status ET answers changent ensemble (ex: soumission initiale), c'est autorisé.
//   → Si seules les answers changent alors qu'on est déjà locked, c'est bloqué.
//
// SAVE AUTOMATIQUE ("Enregistrer") :
//   En statut 'assigned' ou 'in_progress', les réponses sont librement modifiables.
//   À chaque save d'answers :
//     1. lastSavedAt est mis à jour (affiché côté client : "Dernière sauvegarde à 14h32")
//     2. Si status est encore 'assigned', il passe automatiquement à 'in_progress'
evaluationSchema.pre('save', function (next) {
  if (this._originalStatus && LOCKED_STATUSES.includes(this._originalStatus) && this.isModified('answers')) {
    return next(new Error('Answers locked after submission'))
  }

  if (this.isModified('answers')) {
    this.lastSavedAt = new Date()
    if (this.status === 'assigned') {
      this.status = 'in_progress'
    }
  }

  next()
})

evaluationSchema.statics.VALID_TRANSITIONS  = VALID_TRANSITIONS
evaluationSchema.statics.LOCKED_STATUSES    = LOCKED_STATUSES

module.exports = { Evaluation: model('Evaluation', evaluationSchema), VALID_TRANSITIONS, ROLE_TRANSITIONS, LOCKED_STATUSES }
