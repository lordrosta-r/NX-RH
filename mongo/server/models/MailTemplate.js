// =============================================================================
// models/MailTemplate.js — Templates de mails editables par l'admin
// Seeded avec les templates hardcodés de notificationService.js
// notificationService lit en DB d'abord, fallback sur les templates hardcodés
// =============================================================================

const { Schema, model } = require('mongoose')

const mailTemplateSchema = new Schema({
  slug: { type: String, required: true, unique: true, trim: true },
  subject: { type: String, required: true, trim: true, maxlength: 200 },
  bodyText: { type: String, required: true, maxlength: 10000 },
  bodyHtml: { type: String, default: '', maxlength: 50000 },
  variables: { type: [String], default: [] },  // ex: ['firstName','campaignName']
  lastEditedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })

module.exports = model('MailTemplate', mailTemplateSchema)
