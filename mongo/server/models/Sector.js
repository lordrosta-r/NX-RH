// =============================================================================
// models/Sector.js — Secteurs organisationnels (regroupements d'équipes au-dessus du département)
// Créés par HR/admin pour structurer l'organigramme
// Un secteur = ex: "BU France", "Ingénierie", "Commercial"
// =============================================================================

const { Schema, model } = require('mongoose')

const sectorSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
    unique: true,
  },
  description: { type: String, default: '', trim: true, maxlength: 500 },
  color: {
    type: String,
    default: '#17A8D4',
    match: /^#[0-9A-Fa-f]{6}$/,
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

module.exports = model('Sector', sectorSchema)
