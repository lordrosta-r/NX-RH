'use strict'

// =============================================================================
// services/userService.js — Logique métier utilisateurs
// =============================================================================

const mongoose = require('mongoose')
const bcrypt   = require('bcrypt')
const crypto   = require('crypto')
const { User, Evaluation, AuditLog } = require('../models')
const { ROLES, BCRYPT_ROUNDS } = require('../config/constants')
const AppError = require('../utils/AppError')
const logger   = require('../utils/logger')

// ── Création ──────────────────────────────────────────────────────────────────

/**
 * Crée un utilisateur avec un mot de passe temporaire.
 * @param {object} data — champs validés (firstName, lastName, email, role, ...)
 * @returns {Promise<object>} utilisateur créé (sans passwordHash/ldapDn) + tempPassword
 */
async function createUser(data) {
  const { firstName, lastName, email, role, department, position, managerId } = data

  if (!firstName || !lastName || !email) {
    throw AppError.badRequest('firstName, lastName et email sont requis')
  }
  if (role && !ROLES.includes(role)) {
    throw AppError.badRequest(`Rôle invalide : ${role}`)
  }

  const tempPassword = crypto.randomBytes(16).toString('hex')
  const passwordHash = await bcrypt.hash(tempPassword, 12)

  const user = new User({
    email,
    firstName,
    lastName,
    department:  department  || null,
    position:    position    || null,
    role:        ROLES.includes(role) ? role : 'employee',
    managerId:   managerId   || null,
    authSource:  'local',
    isActive:    true,
    passwordHash,
  })

  await user.save()

  const result = user.toObject()
  delete result.passwordHash
  delete result.ldapDn

  return { ...result, tempPassword }
}

// ── Lecture ────────────────────────────────────────────────────────────────────

/**
 * Retourne un utilisateur par son ID avec vérification RBAC.
 * @throws {Error} 400 si ID invalide, 403 si accès refusé, 404 si introuvable
 */
async function getUserById(id, requestingUser) {
  if (!mongoose.isValidObjectId(id)) throw AppError.badRequest('ID invalide')

  const user = await User.findById(id).select('-passwordHash -ldapDn').lean()
  if (!user) throw AppError.notFound('Utilisateur introuvable')

  const { role, id: requesterId } = requestingUser

  if (role === 'manager') {
    const isSubordinate = user.managerId?.toString() === requesterId
    const isSelf = requesterId === id
    if (!isSubordinate && !isSelf) throw AppError.forbidden('Permissions insuffisantes')
  }

  if (role === 'employee' && requesterId !== id) {
    const self = await User.findById(requesterId, 'managerId').lean()
    const isDirectManager = self?.managerId?.toString() === id
    if (!isDirectManager) throw AppError.forbidden('Permissions insuffisantes')
  }

  return user
}

// ── Modification ──────────────────────────────────────────────────────────────

/**
 * Met à jour un utilisateur (whitelist stricte des champs).
 * @param {string} id
 * @param {object} data — corps de la requête
 * @param {object} requestingUser — req.user
 * @returns {Promise<object>} utilisateur mis à jour (sans passwordHash/ldapDn)
 */
async function updateUser(id, data, requestingUser) {
  if (!mongoose.isValidObjectId(id)) throw AppError.badRequest('ID invalide')

  const { role, id: requesterId } = requestingUser
  const isAdmin = ['admin', 'hr'].includes(role)
  const isSelf  = requesterId === id

  if (!isAdmin && !isSelf) throw AppError.forbidden('Permissions insuffisantes')

  const ALLOWED = ['email', 'firstName', 'lastName', 'department', 'position', 'role', 'managerId', 'isActive', 'avatar', 'phone']
  const updates = {}
  for (const key of ALLOWED) {
    if (data[key] !== undefined) updates[key] = data[key]
  }

  if (!isAdmin) {
    const protectedFields = ['role', 'managerId', 'isActive', 'department', 'position', 'email']
    const forbidden = protectedFields.filter(f => data[f] !== undefined)
    if (forbidden.length > 0) {
      throw AppError.forbidden(`Champs protégés non modifiables : ${forbidden.join(', ')}`)
    }
  }

  const user = await User.findById(id)
  if (!user) throw AppError.notFound('Utilisateur introuvable')

  Object.assign(user, updates)
  await user.save()

  const result = user.toObject()
  delete result.passwordHash
  delete result.ldapDn
  return result
}

// ── Suppression (soft delete) ─────────────────────────────────────────────────

/**
 * Désactive un utilisateur (soft delete). Admin uniquement, ne peut pas se supprimer soi-même.
 */
async function deleteUser(id, requestingUserId) {
  if (!mongoose.isValidObjectId(id)) throw AppError.badRequest('ID invalide')
  if (requestingUserId === id) throw AppError.forbidden('Impossible de se supprimer soi-même')

  const user = await User.findById(id)
  if (!user) throw AppError.notFound('Utilisateur introuvable')

  user.isActive = false
  await user.save()
}

// ── Offboarding ───────────────────────────────────────────────────────────────

/**
 * Prévisualise les impacts du départ d'un utilisateur.
 * @returns {Promise<{ user, pendingEvaluations, activeCampaigns }>}
 */
async function getOffboardPreview(userId) {
  if (!mongoose.isValidObjectId(userId)) throw AppError.badRequest('ID invalide')

  const user = await User.findById(userId).select('-passwordHash -ldapDn').lean()
  if (!user) throw AppError.notFound('Utilisateur introuvable')

  const pendingFilter = {
    $or: [{ evaluateeId: userId }, { evaluatorId: userId }],
    status: { $nin: ['validated', 'archived'] },
  }

  const [pendingEvaluations, evals] = await Promise.all([
    Evaluation.countDocuments(pendingFilter),
    Evaluation.find(pendingFilter).populate('campaignId', 'name').lean(),
  ])

  const seen = new Set()
  const activeCampaigns = []
  for (const ev of evals) {
    const name = ev.campaignId?.name
    if (name && !seen.has(name)) {
      seen.add(name)
      activeCampaigns.push(name)
    }
  }

  return { user, pendingEvaluations, activeCampaigns }
}

/**
 * Déclenche le processus de départ : archive les évaluations en cours (transaction).
 * @returns {Promise<object>} utilisateur mis à jour (sans passwordHash/ldapDn)
 */
async function offboardUser(userId, body) {
  if (!mongoose.isValidObjectId(userId)) throw AppError.badRequest('ID invalide')

  const { reason, effectiveDate } = body || {}

  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    throw AppError.badRequest('Le champ reason est requis')
  }
  if (!effectiveDate) {
    throw AppError.badRequest('Le champ effectiveDate est requis')
  }

  const user = await User.findById(userId)
  if (!user) throw AppError.notFound('Utilisateur introuvable')

  user.offboardingStatus = 'offboarding'
  user.offboardingReason = reason.trim()
  user.offboardingDate   = new Date(effectiveDate)

  const evalFilter = {
    $or: [{ evaluateeId: userId }, { evaluatorId: userId }],
    status: { $nin: ['validated', 'archived'] },
  }

  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      await user.save({ session })
      await Evaluation.updateMany(evalFilter, { $set: { status: 'archived' } }, { session })
    })
  } catch (err) {
    if (err.code === 20 || err.message?.includes('Transaction') || err.message?.includes('replica')) {
      logger.warn('[offboard] Transactions non disponibles, exécution séquentielle')
      await user.save()
      await Evaluation.updateMany(evalFilter, { $set: { status: 'archived' } })
    } else {
      throw err
    }
  } finally {
    await session.endSession()
  }

  const result = user.toObject()
  delete result.passwordHash
  delete result.ldapDn
  return result
}

// ── RGPD ──────────────────────────────────────────────────────────────────────

/**
 * Exporte les données personnelles RGPD d'un utilisateur.
 * @returns {Promise<{ user, evaluations, exportedAt }>}
 */
async function gdprExportUser(userId) {
  if (!mongoose.isValidObjectId(userId)) throw AppError.badRequest('ID invalide')

  const [user, evaluations] = await Promise.all([
    User.findById(userId).select('-passwordHash -ldapDn').lean(),
    Evaluation.find({ evaluateeId: userId })
      .populate('campaignId', 'name')
      .populate('formId', 'title formType')
      .lean(),
  ])

  if (!user) throw AppError.notFound('Utilisateur introuvable')

  return { user, evaluations, exportedAt: new Date() }
}

/**
 * Anonymise les données personnelles (droit à l'effacement RGPD).
 * Bloque si des évaluations actives existent encore.
 */
async function gdprAnonymizeUser(userId) {
  if (!mongoose.isValidObjectId(userId)) throw AppError.badRequest('ID invalide')

  const user = await User.findById(userId)
  if (!user) throw AppError.notFound('Utilisateur introuvable')

  const ACTIVE_STATUSES = ['assigned', 'in_progress', 'submitted']
  const activeCount = await Evaluation.countDocuments({
    evaluateeId: userId,
    status: { $in: ACTIVE_STATUSES },
  })
  if (activeCount > 0) {
    throw AppError.conflict(`Impossible d'anonymiser : ${activeCount} évaluation(s) en cours`)
  }

  user.firstName       = 'Anonyme'
  user.lastName        = 'Anonyme'
  user.email           = `anonyme-${userId}@deleted.local`
  user.phone           = null
  user.avatar          = null
  user.isActive        = false
  user.offboardingStatus = 'offboarded'
  await user.save()
}

module.exports = {
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  getOffboardPreview,
  offboardUser,
  gdprExportUser,
  gdprAnonymizeUser,
  searchUsers,
  bulkUpsertUsers,
  getUserStats,
}

// ── Recherche ─────────────────────────────────────────────────────────────────

/**
 * Recherche full-text par regex sur nom / prénom / email / département.
 * @param {string} query — terme de recherche
 * @param {object} options — { page, limit, role, department, isActive }
 */
async function searchUsers(query, options = {}) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw AppError.badRequest('Paramètre de recherche requis')
  }

  const { page = 1, limit = 20, role, department, isActive } = options

  const filter = {
    $or: [
      { firstName:  { $regex: query, $options: 'i' } },
      { lastName:   { $regex: query, $options: 'i' } },
      { email:      { $regex: query, $options: 'i' } },
      { department: { $regex: query, $options: 'i' } },
    ],
  }

  if (role)              filter.role       = role
  if (department)        filter.department = department
  if (isActive !== undefined) filter.isActive = isActive

  const skip = (page - 1) * limit

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash -refreshTokens')
      .sort({ lastName: 1, firstName: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ])

  return { users, total, page, limit, pages: Math.ceil(total / limit) }
}

// ── Import en masse ───────────────────────────────────────────────────────────

/**
 * Crée ou met à jour des utilisateurs en masse (upsert par email).
 * @param {Array<object>} usersData — tableau de { email, firstName, lastName, role, department, ... }
 * @returns {Promise<{ created, updated, errors }>}
 */
async function bulkUpsertUsers(usersData) {
  if (!Array.isArray(usersData) || usersData.length === 0) {
    throw AppError.badRequest('usersData doit être un tableau non vide')
  }

  const results = { created: 0, updated: 0, errors: [] }

  // Pre-fetch all existing emails in a single query (replaces N findOne calls)
  const emails = usersData.map(u => (u.email || '').toLowerCase()).filter(Boolean)
  const existingUsers = emails.length
    ? await User.find({ email: { $in: emails } }, 'email').lean()
    : []
  const existingEmailSet = new Set(existingUsers.map(u => u.email.toLowerCase()))

  for (const userData of usersData) {
    try {
      const { email, ...rest } = userData
      const emailLower = (email || '').toLowerCase()

      if (existingEmailSet.has(emailLower)) {
        await User.updateOne({ email }, { $set: rest }, { runValidators: true })
        results.updated++
      } else {
        const passwordHash = await bcrypt.hash('ChangeMe123!', BCRYPT_ROUNDS)
        const newUser = new User({ email, ...rest, passwordHash, authSource: 'local' })
        await newUser.save()
        results.created++
      }
    } catch (err) {
      results.errors.push({ email: userData.email, error: err.message })
    }
  }

  return results
}

// ── Statistiques ──────────────────────────────────────────────────────────────

/**
 * Retourne les statistiques utilisateurs pour le dashboard admin.
 * @returns {Promise<{ total, byRole, byDept, inactive }>}
 */
async function getUserStats() {
  const [total, byRole, byDept, inactive] = await Promise.all([
    User.countDocuments(),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.aggregate([{ $group: { _id: '$department', count: { $sum: 1 } } }]),
    User.countDocuments({ isActive: false }),
  ])

  return { total, byRole, byDept, inactive }
}
