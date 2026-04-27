'use strict'

// =============================================================================
// models/OffboardingRequest.js — Demandes de départ (offboarding)
//
// Une demande par utilisateur (unique sur userId).
// Créée par hr/admin, complétée quand toutes les étapes de la checklist sont faites.
// La completion met user.archivedAt et user.isActive = false.
// =============================================================================

const { Schema, model } = require('mongoose')

const DEFAULT_CHECKLIST = [
  { item: 'Révocation accès systèmes',         done: false },
  { item: 'Récupération matériel',              done: false },
  { item: 'Archivage évaluations',              done: false },
  { item: 'Solde de tout compte',               done: false },
  { item: 'Entretien de départ (optionnel)',    done: false },
]

const checklistItemSchema = new Schema({
  item:   { type: String, required: true },
  done:   { type: Boolean, default: false },
  doneAt: { type: Date, default: null },
  doneBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { _id: true })

const offboardingRequestSchema = new Schema({
  userId: {
    type:     Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    unique:   true,
  },
  requestedBy: {
    type:     Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },
  reason: {
    type:     String,
    enum:     ['resignation', 'termination', 'retirement', 'other'],
    required: true,
  },
  lastDay: {
    type:     Date,
    required: true,
  },
  status: {
    type:    String,
    enum:    ['pending', 'in_progress', 'completed'],
    default: 'pending',
  },
  checklist: {
    type:    [checklistItemSchema],
    default: () => DEFAULT_CHECKLIST.map(c => ({ ...c })),
  },
  notes: {
    type:    String,
    default: null,
    maxlength: 2000,
  },
}, { timestamps: true })

offboardingRequestSchema.index({ status: 1 })
offboardingRequestSchema.index({ lastDay: 1 })

module.exports = { model: model('OffboardingRequest', offboardingRequestSchema), DEFAULT_CHECKLIST }
