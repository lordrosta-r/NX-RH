// =============================================================================
// models/Resource.js — Documents publiés par RH
//
// Guides, grilles d'évaluation, livrets... visibles par les employés.
// Les fichiers sont stockés dans UPLOADS_DIR (configuré dans .env).
// =============================================================================

const { Schema, model } = require('mongoose')
const { ROLES, RESOURCE_TYPES } = require('../config/constants')

const VALID_TYPES = RESOURCE_TYPES

const resourceSchema = new Schema({
  title: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },

  // Courte description du document affichée dans la liste des ressources.
  description: { type: String, default: '', trim: true, maxlength: 2000 },

  // Type du fichier — pour afficher la bonne icône côté client
  type: { type: String, required: true, enum: VALID_TYPES },

  // Nom du fichier sur le disque (relatif à UPLOADS_DIR)
  filename: { type: String, required: true },

  // draft = brouillon visible seulement par admin ; published = visible par visibleTo
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft',
    index: true,
  },

  // Rôles qui peuvent voir ce document une fois publié.
  // Par défaut, tous les rôles y ont accès.
  visibleTo: {
    type: [String],
    enum: ROLES,
    default: ROLES,
  },

  // Rempli automatiquement quand status passe à 'published'
  publishedAt: { type: Date, default: null },

  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

}, { timestamps: true, versionKey: false })

// Horodate la publication automatiquement
resourceSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date()
  }
  next()
})

module.exports = model('Resource', resourceSchema)
