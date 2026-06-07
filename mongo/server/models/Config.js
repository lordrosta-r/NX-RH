'use strict'

// =============================================================================
// models/Config.js — Configuration applicative clé/valeur
//
// Stockage générique de configuration persistée (ex: config LDAP).
// Chaque entrée est identifiée par une clé unique.
// Le champ `value` accepte n'importe quel type JSON.
// =============================================================================

const { Schema, model } = require('mongoose')

const configSchema = new Schema({
  key:   { type: String, required: true, unique: true, trim: true },
  value: { type: Schema.Types.Mixed, default: null },
}, { timestamps: true, versionKey: false })

module.exports = model('Config', configSchema)
