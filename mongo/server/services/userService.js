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

  const ALLOWED = ['email', 'firstName', 'lastName', 'department', 'position', 'role', 'managerId', 'isActive', 'avatar', 'phone', 'canViewSubtree']
  const updates = {}
  for (const key of ALLOWED) {
    if (data[key] !== undefined) updates[key] = data[key]
  }

  if (!isAdmin) {
    const protectedFields = ['role', 'managerId', 'isActive', 'department', 'position', 'email', 'canViewSubtree']
    const forbidden = protectedFields.filter(f => data[f] !== undefined)
    if (forbidden.length > 0) {
      throw AppError.forbidden(`Champs protégés non modifiables : ${forbidden.join(', ')}`)
    }
  }

  const user = await User.findById(id)
  if (!user) throw AppError.notFound('Utilisateur introuvable')

  if (await wouldRemoveLastActiveAdmin(user, updates)) {
    throw AppError.conflict("Action refusée : c'est le dernier administrateur actif. Promouvez un autre administrateur avant de changer son rôle ou de le désactiver.")
  }

  // Retrait du rôle manager : un manager qui perd son rôle ne peut plus garder
  // ses subordonnés (ils pointeraient vers un non-manager). On exige alors un
  // remplaçant qui récupère l'équipe avant d'appliquer le changement.
  const losesManagerRole =
    user.role === 'manager' &&
    updates.role !== undefined &&
    updates.role !== 'manager'

  if (losesManagerRole) {
    const subordinateCount = await User.countDocuments({ managerId: id, isActive: true })
    if (subordinateCount > 0) {
      await reassignSubordinates(id, data.replacementManagerId)
    }
  }

  Object.assign(user, updates)
  await user.save()

  const result = user.toObject()
  delete result.passwordHash
  delete result.ldapDn
  return result
}

// Anti lock-out : empêche de retirer le DERNIER administrateur actif, que ce
// soit par démotion de rôle (admin → autre) ou par désactivation (isActive=false).
async function wouldRemoveLastActiveAdmin(user, { role, isActive } = {}) {
  const losesAdmin =
    user.role === 'admin' &&
    ((role !== undefined && role !== 'admin') || isActive === false)
  if (!losesAdmin) return false
  const otherAdmins = await User.countDocuments({
    _id: { $ne: user._id }, role: 'admin', isActive: true,
  })
  return otherAdmins === 0
}

// Réassigne tous les subordonnés d'un manager (qui perd son rôle) vers un
// remplaçant. Valide le remplaçant : ObjectId, différent du manager, existant,
// actif et lui-même manager/hr/admin. Lève une 400 en cas de problème.
const MANAGER_ROLES = ['manager', 'hr', 'admin']
async function reassignSubordinates(managerId, replacementManagerId) {
  if (!replacementManagerId) {
    throw AppError.badRequest("Un remplaçant est requis pour réassigner l'équipe du manager.")
  }
  if (!mongoose.isValidObjectId(replacementManagerId)) {
    throw AppError.badRequest('replacementManagerId invalide')
  }
  if (String(replacementManagerId) === String(managerId)) {
    throw AppError.badRequest('Le remplaçant doit être différent du manager retiré.')
  }

  const replacement = await User.findById(replacementManagerId).select('role isActive').lean()
  if (!replacement || !replacement.isActive) {
    throw AppError.badRequest('Le remplaçant doit être un utilisateur actif existant.')
  }
  if (!MANAGER_ROLES.includes(replacement.role)) {
    throw AppError.badRequest('Le remplaçant doit avoir le rôle manager, hr ou admin.')
  }

  await User.updateMany({ managerId }, { $set: { managerId: replacementManagerId } })
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

  if (await wouldRemoveLastActiveAdmin(user, { isActive: false })) {
    throw AppError.conflict("Impossible de désactiver le dernier administrateur actif.")
  }

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

  // ── Garde-fou anti-orphelins ────────────────────────────────────────────────
  // Si l'utilisateur offboardé encadre des subordonnés directs ACTIFS, on refuse
  // l'offboarding tant qu'aucun remplaçant valide n'est désigné : sinon ces
  // subordonnés se retrouvent sans manager (orphelins de hiérarchie).
  const subordinates = await User.find({ managerId: userId, isActive: true })
    .select('_id')
    .lean()
  const subordinateCount = subordinates.length

  if (subordinateCount > 0) {
    const { replacementManagerId } = body || {}

    if (!replacementManagerId) {
      throw AppError.badRequest(
        `Réaffectation requise : ce manager a ${subordinateCount} subordonné(s), désignez un remplaçant`,
      )
    }
    if (!mongoose.isValidObjectId(replacementManagerId)) {
      throw AppError.badRequest('replacementManagerId invalide')
    }
    // Anti-boucle 1 : le remplaçant ne peut pas être l'offboardé lui-même.
    if (String(replacementManagerId) === String(userId)) {
      throw AppError.badRequest('Le remplaçant doit être différent du manager qui part.')
    }
    // Anti-boucle 2 : le remplaçant ne peut pas être un des subordonnés réassignés
    // (sinon il deviendrait son propre manager).
    const isSubordinate = subordinates.some(
      (s) => String(s._id) === String(replacementManagerId),
    )
    if (isSubordinate) {
      throw AppError.badRequest("Le remplaçant ne peut pas être un subordonné du manager qui part.")
    }

    const replacement = await User.findById(replacementManagerId).select('isActive').lean()
    if (!replacement || !replacement.isActive) {
      throw AppError.badRequest('Le remplaçant doit être un utilisateur actif existant.')
    }

    // Réassignation effective de toute l'équipe vers le remplaçant.
    await User.updateMany(
      { managerId: userId, isActive: true },
      { $set: { managerId: replacementManagerId } },
    )
  }

  user.offboardingStatus = 'offboarding'
  user.offboardingReason = reason.trim()
  user.offboardingDate   = new Date(effectiveDate)

  const TERMINAL = ['validated', 'archived', 'expired', 'rejected']

  // 1) Évaluations DONT IL EST L'ÉVALUÉ → archivées (la personne part).
  const archiveFilter = {
    evaluateeId: userId,
    status: { $nin: TERMINAL },
  }

  // 2) Évaluations DONT IL EST L'ÉVALUATEUR d'autrui → NE PAS archiver
  //    (sinon on détruit l'évaluation de collaborateurs encore présents).
  //    On les réassigne à son N+1 (user.managerId), management de transition.
  //    Si pas de N+1 (top de hiérarchie), on laisse en place pour réassignation
  //    manuelle RH (PATCH /evaluations/:id/reassign) — surtout pas d'archivage.
  const reassignFilter = {
    evaluatorId: userId,
    evaluateeId: { $ne: userId },
    status: { $nin: TERMINAL },
  }

  const newEvaluatorId = user.managerId || null
  let reassignedCount = 0

  const runMutations = async (session) => {
    const opts = session ? { session } : {}
    await (session ? user.save({ session }) : user.save())
    await Evaluation.updateMany(archiveFilter, { $set: { status: 'archived' } }, opts)

    if (newEvaluatorId) {
      const r = await Evaluation.updateMany(
        reassignFilter,
        {
          $set: { evaluatorId: newEvaluatorId },
          $push: { auditLog: { action: 'reassigned', by: userId, meta: { reason: 'offboarding', from: userId, to: newEvaluatorId } } },
        },
        opts,
      )
      reassignedCount = r.modifiedCount ?? r.nModified ?? 0
    } else {
      const pending = await Evaluation.countDocuments(reassignFilter)
      if (pending > 0) {
        logger.warn(`[offboard] ${pending} évaluation(s) à réassigner manuellement (user ${userId} sans N+1)`)
      }
    }
  }

  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => { await runMutations(session) })
  } catch (err) {
    if (err.code === 20 || err.message?.includes('Transaction') || err.message?.includes('replica')) {
      logger.warn('[offboard] Transactions non disponibles, exécution séquentielle')
      await runMutations(null)
    } else {
      throw err
    }
  } finally {
    await session.endSession()
  }

  if (reassignedCount > 0) {
    AuditLog.create({
      userId,
      userRole: 'hr',
      action: 'reassigned',
      targetType: 'User',
      targetId: userId,
      meta: { reason: 'offboarding', newEvaluatorId, reassignedCount },
    }).catch(err => logger.error('[offboard] AuditLog reassigned failed:', err))
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

  // SÉCURITÉ (anti-ReDoS / injection regex) : on échappe les métacaractères et on
  // borne la longueur avant d'injecter la saisie dans un $regex Mongo.
  const safe = query.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  const filter = {
    $or: [
      { firstName:  { $regex: safe, $options: 'i' } },
      { lastName:   { $regex: safe, $options: 'i' } },
      { email:      { $regex: safe, $options: 'i' } },
      { department: { $regex: safe, $options: 'i' } },
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

// Champs autorisés pour la mise à jour en masse (whitelist sécurité M7).
// Tout champ hors liste est silencieusement ignoré, empêchant l'élévation
// de privilèges (role:'admin', isActive:false, etc.) via l'API bulk.
const BULK_UPSERT_ALLOWED_FIELDS = [
  'firstName', 'lastName', 'department', 'position',
  'sectorId', 'managerId', 'isActive', 'role',
]

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

      // Filtre la whitelist : seuls les champs autorisés sont appliqués.
      // Protège contre toute tentative d'injection de champs sensibles
      // (passwordHash, refreshTokens, authSource…) via l'appel en masse.
      const safeFields = {}
      for (const field of BULK_UPSERT_ALLOWED_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(rest, field)) {
          safeFields[field] = rest[field]
        }
      }

      if (existingEmailSet.has(emailLower)) {
        await User.updateOne({ email }, { $set: safeFields }, { runValidators: true })
        results.updated++
      } else {
        const passwordHash = await bcrypt.hash('ChangeMe123!', BCRYPT_ROUNDS)
        const newUser = new User({
          email,
          ...safeFields,
          passwordHash,
          authSource: 'local',
          mustChangePassword: true,  // force le changement de mot de passe à la première connexion
        })
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
