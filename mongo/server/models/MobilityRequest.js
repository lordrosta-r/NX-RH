'use strict'

const mongoose = require('mongoose');

const mobilityRequestSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Catégorie de demande (modèle unifié « Demandes »). Les anciennes demandes
  // sans catégorie sont implicitement 'mobilite' (default) → pas de migration.
  category: {
    type: String,
    enum: ['mobilite', 'promotion', 'augmentation', 'formation', 'autre'],
    default: 'mobilite',
    required: true,
    index: true,
  },
  // Libellé libre quand category === 'autre'.
  customCategory: { type: String, maxlength: 100 },

  currentPosition: { type: String },
  currentDepartment: { type: String },
  // Spécifique mobilité/promotion — optionnel pour les autres catégories.
  targetPosition: { type: String },
  targetDepartment: { type: String },
  targetSite: { type: String },
  // Sous-type de mobilité (conservé pour les demandes de catégorie mobilité).
  requestType: {
    type: String,
    enum: [
      'internal_transfer', 'promotion', 'lateral_move', 'role_change',
      'department_change', 'site_change', 'international', 'secondment',
    ],
    default: 'internal_transfer',
  },
  // Motivation / description de la demande (toutes catégories).
  motivation: { type: String, maxlength: 2000 },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'on_hold'],
    default: 'pending',
  },
  priority: { type: String, enum: ['low', 'medium', 'normal', 'high', 'urgent'], default: 'normal' },
  hrComment: { type: String },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  targetDate: { type: Date },
  // Détails de la décision
  decision: {
    decidedAt: { type: Date },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    effectiveDate: { type: Date },
    comment: { type: String },
  },
  // Suivi post-approbation
  implementation: {
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
    startedAt: { type: Date },
    completedAt: { type: Date },
    notes: { type: String },
  },
}, { timestamps: true });

mobilityRequestSchema.index({ employeeId: 1, status: 1 });
mobilityRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('MobilityRequest', mobilityRequestSchema);
