// =============================================================================
// models/User.js — Utilisateurs (employés, managers, directeurs, admins)
//
// Auth : locale (passwordHash) ou LDAP (ldapDn).
// Hiérarchie : managerId pointe vers un autre User (arbre manager/employé).
// =============================================================================

const { Schema, model } = require('mongoose')
const bcrypt = require('bcrypt')
const { ROLES, BCRYPT_ROUNDS, AUTH_SOURCES, LOCALES, THEMES, NOTIF_PREF_KEYS } = require('../config/constants')

// Defaults notifications — strict subset des clés autorisées
const DEFAULT_NOTIF_PREFS = {
  campaignLaunch:        true,
  evaluationAssigned:    true,
  evaluationSubmitted:   true,
  deadlineReminder:      true,
  managerActionRequired: true,
  systemAlerts:          false,
  bulkReminder:          true,
}

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email invalide'],
  },

  // Jamais retourné par défaut — select: false.
  // Null pour les utilisateurs LDAP (authSource: 'ldap').
  // Pour créer un utilisateur local : authSource: 'local' + passwordHash.
  passwordHash: {
    type: String,
    select: false,
    default: null,
  },

  firstName: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  lastName:  { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },

  // LDAP = AUTHENTIFICATION UNIQUEMENT.
  // Le rôle est TOUJOURS géré dans la base de données, jamais depuis LDAP.
  // Les utilisateurs LDAP reçoivent le rôle 'employee' par défaut à la création.
  // Un admin change le rôle via l'interface DB — jamais via l'annuaire LDAP.
  role: {
    type: String,
    required: true,
    enum: ROLES,
    default: 'employee',
  },

  // Département : liste gérée en DB (services/departmentsService) — pas d'enum figé
  // ici afin qu'un admin puisse ajouter un département sans redéploiement.
  // La validation se fait au niveau des routes (create/update/import) contre la liste courante.
  department: { type: String, trim: true, default: null },

  // Titre de poste (ex: "Responsable comptabilité", "Développeur senior").
  // Optionnel — utile pour les rapports RH et l'affichage dans les évaluations.
  position: { type: String, trim: true, default: null, maxlength: 150 },

  // Référence vers le manager direct (null pour les tops managers).
  // Index pour les requêtes "trouver l'équipe d'un manager".
  managerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },

  // Autorise un manager à voir TOUTE sa descendance hiérarchique (sous-équipes
  // incluses) sur GET /api/users, au lieu de ses seuls subordonnés directs.
  // Réglable uniquement par hr/admin (jamais par le client manager lui-même).
  canViewSubtree: { type: Boolean, default: false },

  // Managers fonctionnels / transverses (matriciel, n..n) — chefs de projet,
  // responsables transverses. Lien FONCTIONNEL, distinct du lien HIÉRARCHIQUE
  // (managerId) : ils obtiennent la VISIBILITÉ sur les évaluations de la
  // personne et peuvent être désignés évaluateurs, mais la signature
  // hiérarchique (signed_manager) reste au manager direct.
  dottedLineManagerIds: {
    type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    default: [],
    index: true,
  },

  sectorId: {
    type: Schema.Types.ObjectId,
    ref: 'Sector',
    default: null,
    index: true,
  },

  // Distingue les comptes locaux (créés en DB) des comptes LDAP.
  authSource: {
    type: String,
    enum: AUTH_SOURCES,
    default: 'local',
  },

  // DN LDAP complet — jamais retourné par défaut.
  // Pas de default null ici : le champ doit être ABSENT (undefined) pour les
  // comptes locaux afin que l'index partiel l'ignore correctement.
  ldapDn: {
    type: String,
    select: false,
  },

  // Identifiant de la SOURCE LDAP d'origine (config multi-annuaires).
  // null pour les comptes locaux. Permet de savoir contre quel annuaire
  // authentifier l'utilisateur et d'où il a été importé.
  ldapSource: {
    type: String,
    default: null,
  },

  // Préférences utilisateur — persistées en DB pour suivre l'utilisateur entre devices.
  // localStorage reste le cache anti-flash côté client.
  locale: { type: String, enum: LOCALES, default: 'fr' },
  theme:  { type: String, enum: THEMES,  default: 'dark' },

  // Préférences de notifications — sous-ensemble booléen de NOTIF_PREF_KEYS.
  // Validation stricte au PATCH côté route, defaults gérés ici.
  notificationPrefs: {
    type: Object,
    default: () => ({ ...DEFAULT_NOTIF_PREFS }),
    validate: {
      validator(v) {
        if (!v || typeof v !== 'object') return false
        return Object.keys(v).every(k => NOTIF_PREF_KEYS.includes(k) && typeof v[k] === 'boolean')
      },
      message: 'notificationPrefs invalides',
    },
  },

  // Date de dernière connexion — mise à jour au login (fire-and-forget).
  lastLoginAt: { type: Date, default: null },

  isActive: { type: Boolean, default: true },

  resetPasswordToken:  { type: String,  default: null, select: false },
  resetPasswordExpiry: { type: Date,    default: null, select: false },

  // Refresh tokens valides — alimenté par login(), purgé par logout().
  refreshTokens: { type: [String], select: false, default: [] },

  mustChangePassword: { type: Boolean, default: false },

  // Onboarding — suivi de l'intégration des nouveaux arrivants
  onboarding: {
    completed:   { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    steps: {
      type: [{
        step:   { type: String, required: true },
        done:   { type: Boolean, default: false },
        doneAt: { type: Date, default: null },
      }],
      default: () => [
        { step: 'Profil complété',             done: false },
        { step: 'Photo ajoutée',               done: false },
        { step: 'Présentation à l\'équipe',    done: false },
        { step: 'Accès systèmes vérifiés',     done: false },
        { step: 'Premier entretien planifié',  done: false },
      ],
    },
  },

  // Mis à true par le scheduler quand expiresAt est dans moins de 7 jours.
  // Coordonnées optionnelles — présentes pour l'annuaire interne et l'anonymisation RGPD.
  phone:  { type: String, trim: true, default: null, maxlength: 30 },
  avatar: { type: String, default: null },  // chemin relatif vers UPLOADS_DIR

  // Mis à jour lors de la completion d'un offboarding
  archivedAt: { type: Date, default: null },

  offboardingStatus: {
    type: String,
    enum: ['active', 'offboarding', 'offboarded'],
    default: 'active',
  },
  offboardingDate:   { type: Date,   default: null },
  offboardingReason: { type: String, default: null, maxlength: 2000 },

}, { timestamps: true, versionKey: false })

// Index partiel unique sur ldapDn : seuls les vrais DN LDAP (strings) sont indexés.
// partialFilterExpression est préférable à sparse:true car default:null cause
// l'indexation des null avec sparse, créant des conflits de doublon.
userSchema.index(
  { ldapDn: 1 },
  { unique: true, partialFilterExpression: { ldapDn: { $type: 'string' } } }
)
userSchema.index({ department: 1 })
userSchema.index({ managerId: 1, isActive: 1 })
userSchema.index({ managerId: 1, role: 1, isActive: 1 })
userSchema.index({ isActive: 1, role: 1 })
userSchema.index({ firstName: 'text', lastName: 'text', email: 'text', position: 'text' })

// Hash le mot de passe avant sauvegarde si modifié et pas déjà hashé
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) return next()
  const isBcrypt = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(this.passwordHash)
  if (!isBcrypt) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, BCRYPT_ROUNDS)
  }
  next()
})

// Sécurité : un utilisateur ne peut pas être son propre manager
userSchema.pre('save', async function (next) {
  if (this.managerId && this.managerId.equals(this._id)) {
    const err = new Error('Un utilisateur ne peut pas être son propre manager')
    err.status = 400
    return next(err)
  }
  if (this.managerId) {
    let current = this.managerId
    const visited = new Set([this._id.toString()])
    for (let depth = 0; depth < 20; depth++) {
      if (!current) break
      const key = current.toString()
      if (visited.has(key)) {
        const err = new Error('Cycle hiérarchique détecté')
        err.status = 400
        return next(err)
      }
      visited.add(key)
      const parent = await this.constructor.findById(current, 'managerId').lean()
      current = parent?.managerId ?? null
    }
  }
  next()
})

// Validation des managers transverses : pas d'auto-référence, pas de doublon
// avec le manager direct, dédoublonnage. (Pas de contrainte d'acyclicité : le
// lien transverse est fonctionnel et n'entre pas dans l'arbre de signature.)
userSchema.pre('save', function (next) {
  if (this.dottedLineManagerIds && this.dottedLineManagerIds.length) {
    const self = this._id.toString()
    const direct = this.managerId ? this.managerId.toString() : null
    const seen = new Set()
    const cleaned = []
    for (const m of this.dottedLineManagerIds) {
      const k = m.toString()
      if (k === self) {
        const err = new Error('Un utilisateur ne peut pas être son propre responsable transverse')
        err.status = 400
        return next(err)
      }
      if (k === direct) {
        const err = new Error('Le responsable transverse ne peut pas être le manager direct')
        err.status = 400
        return next(err)
      }
      if (!seen.has(k)) { seen.add(k); cleaned.push(m) }
    }
    this.dottedLineManagerIds = cleaned
  }
  next()
})

module.exports = model('User', userSchema)
