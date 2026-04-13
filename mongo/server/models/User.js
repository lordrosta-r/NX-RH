// =============================================================================
// models/User.js — Utilisateurs (employés, managers, directeurs, admins)
//
// Auth : locale (passwordHash) ou LDAP (ldapDn).
// Hiérarchie : managerId pointe vers un autre User (arbre manager/employé).
// =============================================================================

const { Schema, model } = require('mongoose')
const bcrypt = require('bcrypt')
const { ROLES, DEPARTMENTS, BCRYPT_ROUNDS, AUTH_SOURCES } = require('../config/constants')

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
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
  // sparse: true sur l'index explicite = ignore les null (comptes locaux).
  // BUG corrigé : sparse:true retiré du champ pour éviter un double index.
  ldapDn: {
    type: String,
    select: false,
    default: null,
  },

  isActive: { type: Boolean, default: true },

}, { timestamps: true })

// Index sparse unique sur ldapDn : un seul user par DN LDAP, null ignoré
userSchema.index({ ldapDn: 1 }, { unique: true, sparse: true })
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
    return next(new Error('Un utilisateur ne peut pas être son propre manager'))
  }
  if (this.managerId) {
    let current = this.managerId
    const visited = new Set([this._id.toString()])
    for (let depth = 0; depth < 20; depth++) {
      if (!current) break
      const key = current.toString()
      if (visited.has(key)) return next(new Error('Cycle hiérarchique détecté'))
      visited.add(key)
      const parent = await this.constructor.findById(current, 'managerId').lean()
      current = parent?.managerId ?? null
    }
  }
  next()
})

module.exports = model('User', userSchema)
