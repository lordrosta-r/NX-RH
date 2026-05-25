'use strict'

// =============================================================================
// services/mobilityService.js — Logique métier demandes de mobilité
// =============================================================================

const MobilityRequest = require('../models/MobilityRequest');
const AppError = require('../utils/AppError');

// ── Lecture ───────────────────────────────────────────────────────────────────

/**
 * Liste paginée des demandes.
 * Un employé ne voit que les siennes ; HR/admin voient tout.
 */
async function listRequests(user, { page = 1, limit = 20, status, type } = {}) {
  const filter = {};
  if (user.role === 'employee') filter.employeeId = user._id;
  if (status) filter.status = status;
  if (type) filter.requestType = type;

  const [data, total] = await Promise.all([
    MobilityRequest.find(filter)
      .populate('employeeId', 'firstName lastName email department position')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(+limit)
      .lean(),
    MobilityRequest.countDocuments(filter),
  ]);

  return { data, total, page: +page, limit: +limit };
}

/**
 * Récupère une demande par ID avec contrôle d'accès RBAC.
 * Un employé ne peut accéder qu'à ses propres demandes.
 */
async function getRequestById(id, user) {
  const request = await MobilityRequest.findById(id)
    .populate('employeeId', 'firstName lastName email department position')
    .populate('reviewedBy', 'firstName lastName')
    .lean();

  if (!request) throw AppError.notFound('Demande introuvable');

  if (
    user.role === 'employee' &&
    request.employeeId._id?.toString() !== user._id.toString()
  ) {
    throw AppError.forbidden('Accès refusé');
  }

  return request;
}

// ── Création ──────────────────────────────────────────────────────────────────

/**
 * Crée une nouvelle demande de mobilité pour l'utilisateur connecté.
 */
async function createRequest(
  { targetPosition, targetDepartment, targetSite, requestType, motivation, priority, targetDate },
  user
) {
  if (!targetPosition) throw AppError.badRequest('targetPosition est requis');

  const request = await MobilityRequest.create({
    employeeId: user._id,
    currentPosition: user.position,
    currentDepartment: user.department,
    targetPosition,
    targetDepartment,
    targetSite,
    requestType: requestType || 'internal_transfer',
    motivation,
    priority: priority || 'normal',
    targetDate: targetDate ? new Date(targetDate) : undefined,
  });

  return request.populate('employeeId', 'firstName lastName email');
}

// ── Modification ──────────────────────────────────────────────────────────────

/**
 * Met à jour une demande selon les droits de l'utilisateur :
 * - HR/admin : statut, commentaire RH, priorité
 * - Propriétaire (si pending) : motivation, poste cible, département cible
 */
async function updateRequest(id, body, user) {
  const request = await MobilityRequest.findById(id);
  if (!request) throw AppError.notFound('Demande introuvable');

  const isHrAdmin = ['admin', 'hr'].includes(user.role);
  const isOwner = request.employeeId.toString() === user._id.toString();

  if (!isHrAdmin && !isOwner) throw AppError.forbidden('Accès refusé');

  if (isHrAdmin) {
    const { status, hrComment, priority } = body;
    if (status) {
      request.status = status;
      request.reviewedBy = user._id;
      request.reviewedAt = new Date();
    }
    if (hrComment !== undefined) request.hrComment = hrComment;
    if (priority) request.priority = priority;
  } else if (isOwner && request.status === 'pending') {
    const { motivation, targetPosition, targetDepartment } = body;
    if (motivation !== undefined) request.motivation = motivation;
    if (targetPosition) request.targetPosition = targetPosition;
    if (targetDepartment !== undefined) request.targetDepartment = targetDepartment;
  }

  await request.save();
  return request;
}

// ── Suppression ───────────────────────────────────────────────────────────────

/**
 * Supprime une demande.
 * - Admin/HR : toujours autorisé
 * - Propriétaire : uniquement si statut pending
 */
async function deleteRequest(id, user) {
  const request = await MobilityRequest.findById(id);
  if (!request) throw AppError.notFound('Demande introuvable');

  const isHrAdmin = ['admin', 'hr'].includes(user.role);
  const isOwner =
    request.employeeId.toString() === user._id.toString() &&
    request.status === 'pending';

  if (!isHrAdmin && !isOwner) throw AppError.forbidden('Accès refusé');

  await request.deleteOne();
}

// ─────────────────────────────────────────────────────────────────────────────

module.exports = { listRequests, getRequestById, createRequest, updateRequest, deleteRequest };
