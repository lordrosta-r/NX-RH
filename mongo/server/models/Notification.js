'use strict'

// =============================================================================
// models/Notification.js — Notifications in-app par utilisateur
// =============================================================================

const mongoose = require('mongoose')
const { NOTIFICATION_TYPES } = require('../config/constants')

const { Schema } = mongoose

const NotificationSchema = new Schema({
  userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type:     { type: String, enum: NOTIFICATION_TYPES, required: true },
  title:    { type: String, required: true, maxlength: 200 },
  body:     { type: String, default: '', maxlength: 1000 },
  link:     { type: String, default: null, maxlength: 500 },
  read:     { type: Boolean, default: false },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: false })

// Requête principale : notifications non lues d'un utilisateur, ordre anti-chrono
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 })
// Historique complet d'un utilisateur
NotificationSchema.index({ userId: 1, createdAt: -1 })
// TTL 90 jours
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 })

module.exports = mongoose.model('Notification', NotificationSchema)
