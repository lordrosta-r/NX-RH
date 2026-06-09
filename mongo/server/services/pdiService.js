'use strict'

// =============================================================================
// services/pdiService.js — Couche métier pour les Plans de Développement
//                           Individuel (PDI)
// =============================================================================

const mongoose = require('mongoose')
const PDI      = require('../models/PDI')
const { User } = require('../models')
const AppError = require('../utils/AppError')

// ─── Helpers ─────────────────────────────────────────────────────────────────

function assertValidId(id) {
  if (!mongoose.isValidObjectId(id)) throw AppError.badRequest('ID invalide')
}

/**
 * Vérifie que le requérant est autorisé à accéder au PDI.
 * - employee : peut voir son propre PDI
 * - manager  : peut voir les PDIs qu'il gère
 * - admin/hr  : voient tout
 */
// Extrait l'id qu'employee/manager soit un ObjectId brut ou un doc populé.
function refId(ref) {
  return (ref && ref._id ? ref._id : ref).toString()
}

function assertCanRead(pdi, requesterId, requesterRole) {
  if (['admin', 'hr'].includes(requesterRole)) return
  const uid = requesterId.toString()
  if (refId(pdi.employee) === uid || refId(pdi.manager) === uid) return
  throw AppError.forbidden('Accès refusé à ce PDI')
}

/**
 * Vérifie que le requérant peut modifier le PDI (employee ou manager direct).
 */
function assertCanWrite(pdi, requesterId, requesterRole) {
  if (['admin', 'hr'].includes(requesterRole)) return
  const uid = requesterId.toString()
  if (refId(pdi.employee) === uid || refId(pdi.manager) === uid) return
  throw AppError.forbidden('Modification non autorisée')
}

// ─── Fonctions publiques ──────────────────────────────────────────────────────

/**
 * Crée un nouveau PDI.
 * Seuls admin, hr ou le manager direct peuvent créer un PDI pour un employé.
 */
async function createPDI(data, creatorId, creatorRole) {
  const { employee, manager, period, objectives, actions, notes, campaign, evaluation } = data

  if (!employee || !manager) throw AppError.badRequest('employee et manager sont requis')
  if (!period?.start || !period?.end) throw AppError.badRequest('La période est requise')

  // SÉCURITÉ (anti-IDOR/escalade) : seuls admin/hr peuvent créer un PDI pour
  // n'importe qui. Un manager ne peut créer un PDI que pour SES subordonnés
  // directs, en se désignant lui-même manager. Tout autre rôle est refusé.
  if (!['admin', 'hr'].includes(creatorRole)) {
    const uid = creatorId.toString()
    const target = await User.findById(employee, 'managerId').lean()
    const isDirectManager = target && target.managerId?.toString() === uid
    if (creatorRole !== 'manager' || manager.toString() !== uid || !isDirectManager) {
      throw AppError.forbidden('Création de PDI non autorisée')
    }
  }

  const pdi = await PDI.create({
    employee,
    manager,
    campaign:   campaign   || undefined,
    evaluation: evaluation || undefined,
    period,
    objectives: objectives || [],
    actions:    actions    || [],
    notes:      notes      || '',
  })

  return pdi.populate([
    { path: 'employee', select: 'firstName lastName email department position' },
    { path: 'manager',  select: 'firstName lastName email' },
  ])
}

/**
 * Récupère un PDI par son ID avec contrôle d'accès.
 */
async function getPDIById(id, requesterId, requesterRole) {
  assertValidId(id)

  const pdi = await PDI.findById(id)
    .populate('employee', 'firstName lastName email department position')
    .populate('manager',  'firstName lastName email')
    .lean()

  if (!pdi) throw AppError.notFound('PDI introuvable')
  assertCanRead(pdi, requesterId, requesterRole)
  return pdi
}

/**
 * Liste les PDIs selon le rôle du demandeur ET la perspective demandée :
 * - scope=mine → uniquement les PDIs dont le demandeur est le sujet (employee),
 *   quel que soit son rôle. Utilisé par « Mon espace › Suivi ».
 * - sinon (vue équipe / métier) :
 *   - admin/hr  → tous (filtrables par employee/manager)
 *   - manager   → les PDIs de son équipe (subordonnés directs) + les siens
 *   - employee  → les siens uniquement
 */
async function listPDIs(filter, requesterId, requesterRole) {
  const query = {}

  if (filter.scope === 'mine') {
    // Espace perso « Suivi » : seulement MON propre PDI (je suis le sujet).
    query.employee = requesterId
  } else if (['admin', 'hr'].includes(requesterRole)) {
    // SÉCURITÉ (NoSQL) : ces filtres viennent de req.query → exiger des chaînes
    // avant de les injecter dans le filtre Mongo (sinon `?employee[$ne]=…`
    // deviendrait un opérateur).
    if (typeof filter.employee === 'string' && filter.employee) query.employee = filter.employee
    if (typeof filter.manager  === 'string' && filter.manager)  query.manager  = filter.manager
  } else if (requesterRole === 'manager') {
    // Vue équipe : les PDIs de mes subordonnés directs + les miens.
    const directs = await User.find({ managerId: requesterId, isActive: true }, '_id').lean()
    const teamIds = directs.map(u => u._id)
    query.$or = [
      { manager:  requesterId },
      { employee: { $in: [requesterId, ...teamIds] } },
    ]
  } else {
    query.employee = requesterId
  }

  // SÉCURITÉ (NoSQL) : status vient de req.query → exiger une chaîne.
  if (typeof filter.status === 'string' && filter.status) query.status = filter.status

  return PDI.find(query)
    .sort({ createdAt: -1 })
    .populate('employee', 'firstName lastName email department position')
    .populate('manager',  'firstName lastName email')
    .lean()
}

/**
 * Ajoute une action à un PDI existant.
 */
async function addAction(pdiId, actionData, requesterId) {
  assertValidId(pdiId)

  const pdi = await PDI.findById(pdiId)
  if (!pdi) throw AppError.notFound('PDI introuvable')

  const requesterRole = 'employee' // sera écrasé si admin/hr — on délègue à la route
  // Ici le contrôle se fait via le rôle passé en contexte : on autorise employee & manager
  const uid = requesterId.toString()
  if (
    pdi.employee.toString() !== uid &&
    pdi.manager.toString()  !== uid
  ) throw AppError.forbidden('Ajout non autorisé')

  if (!actionData.title) throw AppError.badRequest('Le titre de l\'action est requis')

  pdi.actions.push(actionData)
  await pdi.save()

  return pdi.populate([
    { path: 'employee', select: 'firstName lastName email' },
    { path: 'manager',  select: 'firstName lastName email' },
  ])
}

/**
 * Met à jour une action d'un PDI.
 */
async function updateAction(pdiId, actionId, update, requesterId) {
  assertValidId(pdiId)
  assertValidId(actionId)

  const pdi = await PDI.findById(pdiId)
  if (!pdi) throw AppError.notFound('PDI introuvable')

  const uid = requesterId.toString()
  if (
    pdi.employee.toString() !== uid &&
    pdi.manager.toString()  !== uid
  ) throw AppError.forbidden('Modification non autorisée')

  const action = pdi.actions.id(actionId)
  if (!action) throw AppError.notFound('Action introuvable')

  const allowed = ['title', 'type', 'description', 'targetDate', 'status', 'completedAt', 'comment']
  allowed.forEach(field => {
    if (update[field] !== undefined) action[field] = update[field]
  })

  if (update.status === 'completed' && !action.completedAt) {
    action.completedAt = new Date()
  }

  await pdi.save()
  return pdi.populate([
    { path: 'employee', select: 'firstName lastName email' },
    { path: 'manager',  select: 'firstName lastName email' },
  ])
}

/**
 * Signe le PDI (côté employee ou manager).
 * @param {'employee'|'manager'} role
 */
async function signPDI(pdiId, requesterId, role) {
  assertValidId(pdiId)

  const pdi = await PDI.findById(pdiId)
  if (!pdi) throw AppError.notFound('PDI introuvable')

  const uid = requesterId.toString()

  if (role === 'employee' || role === 'manager') {
    // Vérifier que l'utilisateur est bien celui qu'il prétend être
    if (role === 'employee' && pdi.employee.toString() !== uid) {
      throw AppError.forbidden('Vous n\'êtes pas l\'employé de ce PDI')
    }
    if (role === 'manager' && pdi.manager.toString() !== uid) {
      throw AppError.forbidden('Vous n\'êtes pas le manager de ce PDI')
    }
  } else {
    // admin/hr peuvent signer des deux côtés — on utilise le rôle passé en paramètre
  }

  if (role === 'employee') {
    if (pdi.employeeSignedAt) throw AppError.conflict('Déjà signé par l\'employé')
    pdi.employeeSignedAt = new Date()
  } else {
    if (pdi.managerSignedAt) throw AppError.conflict('Déjà signé par le manager')
    pdi.managerSignedAt = new Date()
  }

  // Passer à 'active' si encore en draft et une signature existe
  if (pdi.status === 'draft' && (pdi.employeeSignedAt || pdi.managerSignedAt)) {
    pdi.status = 'active'
  }

  await pdi.save()
  return pdi.populate([
    { path: 'employee', select: 'firstName lastName email' },
    { path: 'manager',  select: 'firstName lastName email' },
  ])
}

/**
 * Archive un PDI (admin/hr ou manager uniquement).
 */
async function archivePDI(pdiId, requesterId, requesterRole) {
  assertValidId(pdiId)

  const pdi = await PDI.findById(pdiId)
  if (!pdi) throw AppError.notFound('PDI introuvable')

  if (!['admin', 'hr'].includes(requesterRole)) {
    const uid = requesterId.toString()
    if (pdi.manager.toString() !== uid) {
      throw AppError.forbidden('Archivage non autorisé')
    }
  }

  if (pdi.status === 'archived') throw AppError.conflict('PDI déjà archivé')

  pdi.status = 'archived'
  await pdi.save()
  return pdi.populate([
    { path: 'employee', select: 'firstName lastName email' },
    { path: 'manager',  select: 'firstName lastName email' },
  ])
}

module.exports = { createPDI, getPDIById, listPDIs, addAction, updateAction, signPDI, archivePDI }
