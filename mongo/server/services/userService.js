'use strict'

// =============================================================================
// services/userService.js — Logique métier utilisateurs
// =============================================================================

const mongoose = require('mongoose')
const bcrypt   = require('bcrypt')
const crypto   = require('crypto')
const { User, Evaluation, AuditLog } = require('../models')
const { ROLES } = require('../config/constants')

// ── Helper ────────────────────────────────────────────────────────────────────

function makeError(message, status) {
  const err = new Error(message)
  err.status = status
  return err
}

// ── Création ──────────────────────────────────────────────────────────────────

/**
 * Crée un utilisateur avec un mot de passe temporaire.
 * @param {object} data — champs validés (firstName, lastName, email, role, ...)
 * @returns {Promise<object>} utilisateur créé (sans passwordHash/ldapDn) + tempPassword
 */
async function createUser(data) {
  const { firstName, lastName, email, role, department, position, managerId } = data

  if (!firstName || !lastName || !email) {
    throw makeError('firstName, lastName et email sont requis', 400)
  }
  if (role && !ROLES.includes(role)) {
    throw makeError(`Rôle invalide : ${role}`, 400)
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
  if (!mongoose.isValidObjectId(id)) throw makeError('ID invalide', 400)

  const user = await User.findById(id).select('-passwordHash -ldapDn').lean()
  if (!user) throw makeError('Utilisateur introuvable', 404)

  const { role, id: requesterId } = requestingUser

  if (role === 'manager') {
    const isSubordinate = user.managerId?.toString() === requesterId
    const isSelf = requesterId === id
    if (!isSubordinate && !isSelf) throw makeError('Permissions insuffisantes', 403)
  }

  if (role === 'employee' && requesterId !== id) {
    const self = await User.findById(requesterId, 'managerId').lean()
    const isDirectManager = self?.managerId?.toString() === id
    if (!isDirectManager) throw makeError('Permissions insuffisantes', 403)
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
  if (!mongoose.isValidObjectId(id)) throw makeError('ID invalide', 400)

  const { role, id: requesterId } = requestingUser
  const isAdmin = ['admin', 'hr'].includes(role)
  const isSelf  = requesterId === id

  if (!isAdmin && !isSelf) throw makeError('Permissions insuffisantes', 403)

  const ALLOWED = ['email', 'firstName', 'lastName', 'department', 'position', 'role', 'managerId', 'isActive', 'avatar', 'phone']
  const updates = {}
  for (const key of ALLOWED) {
    if (data[key] !== undefined) updates[key] = data[key]
  }

  if (!isAdmin) {
    const protectedFields = ['role', 'managerId', 'isActive', 'department', 'position', 'email']
    const forbidden = protectedFields.filter(f => data[f] !== undefined)
    if (forbidden.length > 0) {
      throw makeError(`Champs protégés non modifiables : ${forbidden.join(', ')}`, 403)
    }
  }

  const user = await User.findById(id)
  if (!user) throw makeError('Utilisateur introuvable', 404)

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
  if (!mongoose.isValidObjectId(id)) throw makeError('ID invalide', 400)
  if (requestingUserId === id) throw makeError('Impossible de se supprimer soi-même', 403)

  const user = await User.findById(id)
  if (!user) throw makeError('Utilisateur introuvable', 404)

  user.isActive = false
  await user.save()
}

// ── Offboarding ───────────────────────────────────────────────────────────────

/**
 * Prévisualise les impacts du départ d'un utilisateur.
 * @returns {Promise<{ user, pendingEvaluations, activeCampaigns }>}
 */
async function getOffboardPreview(userId) {
  if (!mongoose.isValidObjectId(userId)) throw makeError('ID invalide', 400)

  const user = await User.findById(userId).select('-passwordHash -ldapDn').lean()
  if (!user) throw makeError('Utilisateur introuvable', 404)

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
  if (!mongoose.isValidObjectId(userId)) throw makeError('ID invalide', 400)

  const { reason, effectiveDate } = body || {}

  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    throw makeError('Le champ reason est requis', 400)
  }
  if (!effectiveDate) {
    throw makeError('Le champ effectiveDate est requis', 400)
  }

  const user = await User.findById(userId)
  if (!user) throw makeError('Utilisateur introuvable', 404)

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
      console.warn('[offboard] Transactions non disponibles, exécution séquentielle')
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
  if (!mongoose.isValidObjectId(userId)) throw makeError('ID invalide', 400)

  const [user, evaluations] = await Promise.all([
    User.findById(userId).select('-passwordHash -ldapDn').lean(),
    Evaluation.find({ evaluateeId: userId })
      .populate('campaignId', 'name')
      .populate('formId', 'title formType')
      .lean(),
  ])

  if (!user) throw makeError('Utilisateur introuvable', 404)

  return { user, evaluations, exportedAt: new Date() }
}

/**
 * Anonymise les données personnelles (droit à l'effacement RGPD).
 * Bloque si des évaluations actives existent encore.
 */
async function gdprAnonymizeUser(userId) {
  if (!mongoose.isValidObjectId(userId)) throw makeError('ID invalide', 400)

  const user = await User.findById(userId)
  if (!user) throw makeError('Utilisateur introuvable', 404)

  const ACTIVE_STATUSES = ['assigned', 'in_progress', 'submitted']
  const activeCount = await Evaluation.countDocuments({
    evaluateeId: userId,
    status: { $in: ACTIVE_STATUSES },
  })
  if (activeCount > 0) {
    throw makeError(`Impossible d'anonymiser : ${activeCount} évaluation(s) en cours`, 409)
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
}
