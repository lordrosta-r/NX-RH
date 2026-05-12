// =============================================================================
// models/Form.js — Formulaires (templates de questions)
//
// Un form est autonome et réutilisable. Il peut être lié à plusieurs campagnes
// via Campaign.formIds (référence directe, sans copie).
// upward_feedback est TOUJOURS anonyme — forcé par pre-save.
//
// MODIFICATION DES QUESTIONS :
//   Une fois que la première évaluation existe sur ce form, les questions
//   sont gelées (frozenAt est renseigné). Modifier les IDs de questions après
//   coup rendrait les réponses existantes orphelines.
//   Les champs non-sensibles (title, description) restent modifiables.
// =============================================================================

const { Schema, model } = require('mongoose')
const { FORM_TYPES, QUESTION_TYPES } = require('../config/constants')

// Sous-schema d'une question — validé à chaque save
const questionSchema = new Schema({
  id:       { type: String, required: true },
  type:     { type: String, required: true, enum: QUESTION_TYPES },
  label:    { type: String, required: true, trim: true, maxlength: 500 },
  required: { type: Boolean, default: true },

  // Uniquement utilisé si type === 'rating'.
  // Définit l'échelle : 5 = étoiles 1-5, 10 = score /10, etc.
  scale: {
    type: Number,
    min: 2,
    max: 10,
    default: 5,
  },

  // Uniquement utilisé si type === 'choice'. Au moins 2 options requises.
  options: { type: [String], default: undefined },

  // Phase de l'évaluation dans laquelle cette question apparaît.
  // 'all' = présente dans toutes les phases.
  phase: {
    type: String,
    enum: ['self', 'n-1', 'objectives', 'aspirations', 'all'],
    default: 'all',
  },
}, { _id: false })  // pas d'ObjectId sur les sous-documents, l'id suffit

const formSchema = new Schema({
  title:    { type: String, required: true, trim: true, minlength: 3, maxlength: 200 },

  // Instructions affichées à l'utilisateur avant de remplir le formulaire.
  description: { type: String, default: '', trim: true, maxlength: 2000 },

  formType: { type: String, required: true, enum: FORM_TYPES },

  // true si les réponses sont anonymes.
  // upward_feedback → forcé true par pre-save, non modifiable ensuite.
  isAnonymous: { type: Boolean, default: false },

  // Questions — peuvent être vides à la création (ajoutées via FormBuilder)
  questions: {
    type: [questionSchema],
    default: [],
  },

  // Renseigné dès qu'une première évaluation est créée sur ce form.
  // Les routes doivent refuser les modifications de questions si frozenAt est défini.
  frozenAt: { type: Date, default: null },

  // Vrai quand le formulaire est gelé (empêche toute modification des questions).
  // Synchronisé avec frozenAt : freeze → isFrozen=true + frozenAt=Date, unfreeze → isFrozen=false + frozenAt=null.
  isFrozen: { type: Boolean, default: false },

  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

}, { timestamps: true, versionKey: false })

// upward_feedback est toujours anonyme — pas d'exception possible
formSchema.pre('save', function (next) {
  if (this.formType === 'upward_feedback') {
    this.isAnonymous = true
  }

  // Valider que tous les IDs de questions sont uniques dans ce formulaire.
  // Un doublon casserait le matching des réponses (Evaluation.answers référencent questionId).
  if (this.isModified('questions')) {
    const ids = this.questions.map(q => q.id)
    if (new Set(ids).size !== ids.length) {
      return next(new Error('Les IDs de questions doivent être uniques dans un formulaire'))
    }

    for (const q of this.questions) {
      // Les questions choice doivent proposer au moins 2 options
      if (q.type === 'choice') {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          return next(new Error(`La question "${q.id}" de type choice doit avoir au moins 2 options`))
        }
      }

      // Les questions rating doivent avoir une scale entre 2 et 10
      if (q.type === 'rating') {
        const scale = q.scale ?? 5
        if (scale < 2 || scale > 10) {
          return next(new Error(`La question "${q.id}" de type rating doit avoir une scale entre 2 et 10`))
        }
      }
    }
  }

  next()
})

formSchema.statics.VALID_FORM_TYPES = FORM_TYPES

module.exports = model('Form', formSchema)
