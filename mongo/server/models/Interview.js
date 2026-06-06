// =============================================================================
// models/Interview.js — Entretiens (agrégation Manager/Évalué)
//
// Un entretien matérialise le « duo Manager/Évalué » au sein d'une campagne.
// Il agrège l'ensemble des évaluations partagées par (campaignId, evaluateeId).
//
// Index unique : { campaignId, evaluateeId } — un seul entretien par duo/campagne.
// =============================================================================

const { Schema, model } = require('mongoose')

const interviewSchema = new Schema({
  campaignId: {
    type: Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
    index: true,
  },

  evaluateeId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Manager de l'évaluatee au moment de la création — résolu depuis User.managerId
  managerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },

  // IDs des évaluations qui composent cet entretien
  evaluationIds: {
    type: [{ type: Schema.Types.ObjectId, ref: 'Evaluation' }],
    default: [],
  },

}, { timestamps: true, versionKey: false })

// Un seul entretien par duo (campagne, évaluatee)
interviewSchema.index({ campaignId: 1, evaluateeId: 1 }, { unique: true })

// Lookup par manager (tableau de bord manager)
interviewSchema.index({ managerId: 1, campaignId: 1 })

module.exports = { Interview: model('Interview', interviewSchema) }
