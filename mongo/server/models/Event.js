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

  description: { type: String, trim: true, default: '', maxlength: 2000 },

  location: { type: String, trim: true, default: '', maxlength: 200 },

  // Index pour les requêtes calendrier (filtrage par plage de dates)
  date: { type: Date, required: true, index: true },

  // Date de fin optionnelle (événements multi-jours ou blocs horaires)
  endDate: { type: Date, default: null },

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

  // true une fois que le rappel (J-1 ou J-7) a été envoyé par le scheduler
  reminderSent: { type: Boolean, default: false },

  // Réponses des participants (RSVP) : chaque utilisateur peut accepter, décliner
  // ou se déclarer incertain. Une seule réponse par utilisateur (upsert côté route).
  responses: {
    type: [{
      userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
      status:      { type: String, enum: ['accepted', 'declined', 'tentative'], required: true },
      respondedAt: { type: Date, default: Date.now },
    }],
    default: [],
    _id: false,
  },

  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

}, { timestamps: true, versionKey: false })

// Validation : endDate doit être postérieure à date si renseignée
eventSchema.pre('save', function (next) {
  if (this.endDate && this.endDate < this.date) {
    return next(new Error('endDate doit être postérieure à date'))
  }
  next()
})

// Index pour filtrer par créateur et par campagne
eventSchema.index({ createdBy: 1, date: -1 })
eventSchema.index({ campaignId: 1, date: 1 })

module.exports = model('Event', eventSchema)
