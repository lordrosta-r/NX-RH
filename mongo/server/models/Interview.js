// =============================================================================
// models/Interview.js — Entretiens (agrégation Manager/Évalué)
//
// Un entretien matérialise le « duo Manager/Évalué » au sein d'une campagne.
// Il agrège l'ensemble des évaluations partagées par (campaignId, evaluateeId).
//
// Index unique : { campaignId, evaluateeId } — un seul entretien par duo/campagne.
// =============================================================================

const { Schema, model } = require('mongoose')

// Sous-schéma : une entrée de discussion par question
const discussionItemSchema = new Schema({
  questionId:      { type: String },
  employeeComment: { type: String, default: '' },
  managerComment:  { type: String, default: '' },
  agreedAnswer:    { type: String, default: '' },
}, { _id: false })

// Sous-schéma : bilan d'un objectif de l'année passée
const objectiveReviewItemSchema = new Schema({
  label:   { type: String },
  status:  { type: String, enum: ['achieved', 'partial', 'not_achieved'] },
  comment: { type: String, default: '' },
}, { _id: false })

// Sous-schéma : objectif fixé pour l'année à venir
const nextYearObjectiveItemSchema = new Schema({
  text: { type: String },
}, { _id: false })

// Sous-schéma : signature électronique d'un participant à l'entretien
const interviewSignatureSchema = new Schema({
  role:      { type: String, enum: ['evaluatee', 'manager'], required: true },
  dataUrl:   { type: String, required: true },
  signedAt:  { type: Date, default: Date.now },
}, { _id: false })

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

  // Programmation du rendez-vous d'entretien (calendrier). Tant que scheduledAt
  // est null, l'entretien ne peut pas se dérouler (synthèse/signature bloquées).
  // L'évalué voit ici la date/heure et le lieu fixés par son manager.
  scheduledAt:       { type: Date, default: null },
  scheduledLocation: { type: String, default: '', maxlength: 200 },
  scheduledBy:       { type: Schema.Types.ObjectId, ref: 'User', default: null },

  // Discussion question par question (co-construction Manager + Évalué)
  discussion: {
    type: [discussionItemSchema],
    default: [],
  },

  // Bilan des objectifs de l'année écoulée
  objectivesReview: {
    type: [objectiveReviewItemSchema],
    default: [],
  },

  // Objectifs fixés pour la période N+1
  nextYearObjectives: {
    type: [nextYearObjectiveItemSchema],
    default: [],
  },

  // Synthèse narrative de l'entretien
  synthesis: {
    text: { type: String, default: '' },
  },

  // Signatures électroniques des participants
  signatures: {
    type: [interviewSignatureSchema],
    default: [],
  },

  // Désaccord formel exprimé par l'évalué
  disagreement: {
    flagged: { type: Boolean, default: false },
    by:      { type: Schema.Types.ObjectId, ref: 'User' },
    reason:  { type: String },
    at:      { type: Date },
  },

  // Statut du cycle de vie de l'entretien
  status: {
    type: String,
    enum: ['draft', 'signed', 'disputed', 'done'],
    default: 'draft',
  },

}, { timestamps: true, versionKey: false })

// Un seul entretien par duo (campagne, évaluatee)
interviewSchema.index({ campaignId: 1, evaluateeId: 1 }, { unique: true })

// Lookup par manager (tableau de bord manager)
interviewSchema.index({ managerId: 1, campaignId: 1 })

module.exports = { Interview: model('Interview', interviewSchema) }
