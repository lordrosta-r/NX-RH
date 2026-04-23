'use strict'

// =============================================================================
// models/AuditLog.js — Piste d'audit des actions métier
//
// TTL : expire automatiquement après 2 ans (MongoDB TTL index)
// Index : userId + createdAt, targetId + createdAt
// =============================================================================

const { Schema, model } = require('mongoose')

const TWO_YEARS_SECONDS = 2 * 365 * 24 * 60 * 60  // 63 072 000 s

const auditLogSchema = new Schema({
  userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userRole:   { type: String },
  action:     { type: String, required: true },   // 'status_change', 'evaluation_update', 'campaign_create', …
  targetType: { type: String, required: true },   // 'Evaluation', 'Campaign', 'User'
  targetId:   { type: Schema.Types.ObjectId, required: true },
  meta:       { type: Schema.Types.Mixed, default: {} },
  createdAt:  { type: Date, default: Date.now, index: true },
}, { timestamps: false })

// TTL — MongoDB supprime automatiquement les documents après 2 ans
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: TWO_YEARS_SECONDS })

// Index composites pour les requêtes fréquentes
auditLogSchema.index({ userId:   1, createdAt: -1 })
auditLogSchema.index({ targetId: 1, createdAt: -1 })

module.exports = model('AuditLog', auditLogSchema)
