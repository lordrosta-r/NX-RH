// =============================================================================
// models/Campaign.js — Campagnes d'évaluation
//
// Une campagne est le conteneur d'un cycle RH complet.
// Lifecycle : draft → active → closed → archived (irréversible).
// =============================================================================

const { Schema, model }                        = require('mongoose')
const { CAMPAIGN_STATUSES }                    = require('../config/constants')

// Transitions de statut autorisées — utilisées dans les routes PATCH
const VALID_TRANSITIONS = {
  draft:         ['active'],
  active:        ['closed'],
  closed:        ['archived'],
  archived:      [],            // terminal
}

const campaignSchema = new Schema({
  name:        { type: String, required: true, trim: true, minlength: 3, maxlength: 200 },
  description: { type: String, trim: true, default: '', maxlength: 2000 },

  startDate: { type: Date, required: true },
  endDate:   { type: Date, required: true },

  // Index pour filtrer rapidement par statut (dashboard RH, liste active)
  status: {
    type: String,
    enum: CAMPAIGN_STATUSES,
    default: 'draft',
    index: true,
  },

  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Échéances par phase (optionnelles)
  // Stockées comme Date UTC — affichées en local côté client.
  deadlineEmployee: { type: Date, default: null },
  deadlineManager:  { type: Date, default: null },

  // Départements concernés par cette campagne.
  // Vide = toute l'entreprise.
  // Exemple : ['RH', 'IT', 'Finance']
  // Utilisé pour pré-filtrer les employés lors de la création des évaluations.
  // Départements ciblés — validés contre la liste dynamique (services/departmentsService)
  // au niveau des routes ; ici on n'exige que des chaînes non vides.
  targetDepartments: {
    type: [String],
    default: [],
    validate: {
      validator: arr => arr.every(d => typeof d === 'string' && d.trim().length > 0),
      message: 'Département invalide',
    },
  },

  // ==========================================================================
  // VISIBILITÉ ÉTENDUE DES MANAGERS
  //
  // Par défaut, un manager voit uniquement les évaluations de ses subordonnés
  // directs (User.managerId === manager._id).
  //
  // Un admin ou le RH responsable peut accorder à certains managers une
  // visibilité étendue : ils voient aussi les évaluations des équipes des
  // managers qui leur sont rattachés dans l'arbre hiérarchique.
  //
  // Exemple : la responsable R&D manage 3 ingénieurs ET 2 team leads.
  //   - Sans visibilité étendue : elle voit seulement ses 3 ingénieurs directs.
  //   - Avec visibilité étendue : elle voit ses 3 ingénieurs + les équipes
  //     complètes des 2 team leads sous sa tutelle.
  //
  // La profondeur est récursive : si un team lead manage lui-même des
  // sous-leads, la responsable R&D voit tout l'arbre sous elle.
  //
  // Configuré lors de la création ou de la mise à jour de la campagne
  // (admin ou RH uniquement).
  // ==========================================================================
  extendedVisibility: {
    type: [{
      // Manager qui reçoit la visibilité étendue
      managerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      // Optionnel : limiter à certains sous-managers seulement.
      // Vide = tous les managers sous sa tutelle dans l'arbre User.managerId.
      // Renseigné = uniquement les équipes de ces managers spécifiques.
      restrictedToManagers: {
        type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        default: [],
      },
    }],
    default: [],
    _id: false,
  },

  // ── Contexte N-1 ────────────────────────────────────────────────────────────
  // Campagne de référence pour les données N-1.
  // null = auto-détection (dernière campagne clôturée avant startDate).
  previousCampaignId: {
    type: Schema.Types.ObjectId,
    ref: 'Campaign',
    default: null,
  },
  // Active/désactive l'affichage du contexte N-1 dans les formulaires.
  enableN1Context: {
    type: Boolean,
    default: true,
  },
  // Si false : le contexte N-1 n'est visible que par manager/hr/admin/director.
  n1VisibleToEmployee: {
    type: Boolean,
    default: true,
  },

  // Périmètre de la campagne : qui est concerné
  targetScope: {
    scopeType: {
      type: String,
      enum: ['all', 'department', 'sector', 'users', 'group'],
      default: 'all',
    },
    ids: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    _id: false,
  },

  // Formulaires liés à cette campagne (références directes, sans copie).
  // Contrainte d'unicité {campaignId, formType} appliquée côté route.
  formIds: {
    type: [{ type: Schema.Types.ObjectId, ref: 'Form' }],
    default: [],
  },

}, { timestamps: true, versionKey: false })

// Validation : la date de fin doit être après ou égale à la date de début
campaignSchema.pre('save', function (next) {
  if (this.endDate < this.startDate) {
    return next(new Error('endDate doit être postérieure ou égale à startDate'))
  }
  next()
})

campaignSchema.statics.VALID_TRANSITIONS = VALID_TRANSITIONS

// Index sur createdBy (dashboard RH "mes campagnes") et sur les dates (scheduler)
campaignSchema.index({ createdBy: 1 })
campaignSchema.index({ startDate: 1, endDate: 1 })
campaignSchema.index({ name: 'text', description: 'text' })
// Scheduler : campagnes actives dont la date de fin approche
campaignSchema.index({ status: 1, endDate: 1 })
// Liste des campagnes filtrée par statut, triée par date de début desc
campaignSchema.index({ status: 1, startDate: -1 })

module.exports = { Campaign: model('Campaign', campaignSchema), VALID_TRANSITIONS }
