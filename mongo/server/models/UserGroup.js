'use strict'

// =============================================================================
// models/UserGroup.js — Groupes d'utilisateurs personnalisés
//
// Permet de cibler un ensemble arbitraire d'utilisateurs dans une campagne
// (scopeType = 'group') ou pour des actions bulk.
// =============================================================================

const { Schema, model } = require('mongoose')

const userGroupSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, versionKey: false })

module.exports = model('UserGroup', userGroupSchema)
