// =============================================================================
// models/Event.js — Événements calendrier
//
// Entretiens, réunions, deadlines manuelles créés par RH ou managers.
// Les dates de campagne (start/end) sont affichées directement depuis la
// collection campaigns — pas besoin de créer un Event pour ça.
// =============================================================================

const { Schema, model } = require('mongoose')
const { ROLES, EVENT_TYPES } = require('../config/constants')

const VALID_TYPES = EVENT_TYPES

const eventSchema = new Schema({
  title: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },

  // Index pour les requêtes calendrier (filtrage par plage de dates)
  date: { type: Date, required: true, index: true },

  type: { type: String, required: true, enum: VALID_TYPES },

  // Lien optionnel vers une campagne (pour les entretiens liés à une campagne)
  campaignId: {
    type: Schema.Types.ObjectId,
    ref: 'Campaign',
    default: null,
  },

  // Rôles qui voient cet événement dans leur calendrier.
  // Par défaut, visible par tous.
  targetRoles: {
    type: [String],
    enum: ROLES,
    default: ROLES,
  },

  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

}, { timestamps: true, versionKey: false })

module.exports = model('Event', eventSchema)
