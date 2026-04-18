// =============================================================================
// models/User.js — Utilisateurs (employés, managers, directeurs, admins)
//
// Auth : locale (passwordHash) ou LDAP (ldapDn).
// Hiérarchie : managerId pointe vers un autre User (arbre manager/employé).
// =============================================================================

const { Schema, model } = require('mongoose')
const bcrypt = require('bcrypt')
const { ROLES, DEPARTMENTS, BCRYPT_ROUNDS, AUTH_SOURCES, LOCALES, THEMES, NOTIF_PREF_KEYS } = require('../config/constants')

// Defaults notifications — strict subset des clés autorisées
const DEFAULT_NOTIF_PREFS = {
  campaignLaunch:        true,
  evaluationAssigned:    true,
  evaluationSubmitted:   true,
  deadlineReminder:      true,
  managerActionRequired: true,
  systemAlerts:          false,
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

  department: { type: String, enum: [null, ...DEPARTMENTS], trim: true, default: null },

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

}, { timestamps: true })

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

module.exports = model('User', userSchema)
