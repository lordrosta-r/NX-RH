'use strict'

// =============================================================================
// services/mobilityService.js — Logique métier demandes de mobilité
// =============================================================================

const MobilityRequest = require('../models/MobilityRequest');
const AppError = require('../utils/AppError');
const { paginate } = require('../utils/paginate');

// ── Lecture ───────────────────────────────────────────────────────────────────

/**
 * Liste paginée des demandes.
 * Un employé ne voit que les siennes ; HR/admin voient tout.
 */
async function listRequests(user, { page = 1, limit = 20, status, type, category } = {}) {
  const filter = {};
  if (user.role === 'employee') filter.employeeId = user._id;
  // SÉCURITÉ (NoSQL / type-confusion) : ces filtres viennent de req.query et
  // doivent être des chaînes. On exige typeof === 'string' avant injection Mongo
  // pour empêcher qu'un objet (`?status[$ne]=…`) devienne un opérateur.
  if (typeof status === 'string' && status) filter.status = status;
  if (typeof type === 'string' && type) filter.requestType = type;
  if (typeof category === 'string' && category) filter.category = category;

  return paginate(MobilityRequest, filter, {
    page,
    limit,
    sort: { createdAt: -1 },
    populate: [
      { path: 'employeeId', select: 'firstName lastName email department position' },
      { path: 'reviewedBy', select: 'firstName lastName' },
    ],
  });
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
const REQUEST_CATEGORIES = ['mobilite', 'promotion', 'augmentation', 'formation', 'autre'];
// Catégories où un poste cible a du sens (et est requis).
const POSITION_CATEGORIES = ['mobilite', 'promotion'];

async function createRequest(
  { category, customCategory, targetPosition, targetDepartment, targetSite, requestType, motivation, priority, targetDate },
  user
) {
  const cat = category || 'mobilite';
  if (!REQUEST_CATEGORIES.includes(cat)) {
    throw AppError.badRequest('Catégorie de demande invalide');
  }
  // Validation conditionnelle selon la catégorie.
  if (POSITION_CATEGORIES.includes(cat)) {
    if (!targetPosition) throw AppError.badRequest('Le poste visé est requis pour une demande de mobilité/promotion');
  } else if (!motivation || !motivation.trim()) {
    throw AppError.badRequest('Une description est requise pour cette demande');
  }
  if (cat === 'autre' && (!customCategory || !customCategory.trim())) {
    throw AppError.badRequest('Précisez le type de demande (champ « Autre »)');
  }

  const request = await MobilityRequest.create({
    employeeId: user._id,
    category: cat,
    customCategory: cat === 'autre' ? customCategory.trim() : undefined,
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
      request.decision = {
        decidedAt: new Date(),
        decidedBy: user._id,
        comment: hrComment || request.hrComment,
      };
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

// ── Post-décision ─────────────────────────────────────────────────────────────

/**
 * Marque une demande approuvée comme entièrement implémentée (mobilité effective).
 * Réservé aux HR/admin.
 */
async function completeImplementation(requestId, data, user) {
  if (!['admin', 'hr'].includes(user.role)) throw AppError.forbidden('Accès refusé');

  const request = await MobilityRequest.findById(requestId);
  if (!request) throw AppError.notFound('Demande introuvable');
  if (request.status !== 'approved') {
    throw AppError.badRequest("Seules les demandes approuvées peuvent être marquées implémentées");
  }

  const now = new Date();
  request.implementation = {
    status: 'completed',
    startedAt: request.implementation?.startedAt || now,
    completedAt: now,
    notes: data?.notes || request.implementation?.notes,
  };

  if (data?.effectiveDate) {
    if (!request.decision) request.decision = {};
    request.decision.effectiveDate = new Date(data.effectiveDate);
  }

  await request.save();
  return request;
}

/**
 * Historique de toutes les demandes d'un employé (triées par date).
 * Un employé ne peut voir que ses propres demandes.
 */
async function getMobilityHistory(employeeId, user) {
  // SÉCURITÉ (NoSQL) : l'id vient de req.params, on exige une chaîne avant de
  // l'injecter dans le filtre Mongo.
  if (typeof employeeId !== 'string' || !employeeId) {
    throw AppError.badRequest('employeeId invalide');
  }
  if (user.role === 'employee' && user._id.toString() !== employeeId) {
    throw AppError.forbidden('Accès refusé');
  }

  return MobilityRequest.find({ employeeId })
    .populate('employeeId', 'firstName lastName email department position')
    .populate('reviewedBy', 'firstName lastName')
    .populate('decision.decidedBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Statistiques globales de mobilité : répartition par type/statut,
 * délai moyen de traitement, taux d'approbation.
 * Accès réservé aux HR/admin (garanti par la route).
 */
async function getMobilityStats() {
  const [byStatus, byType, total, avgProcessing] = await Promise.all([
    MobilityRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    MobilityRequest.aggregate([{ $group: { _id: '$requestType', count: { $sum: 1 } } }]),
    MobilityRequest.countDocuments(),
    MobilityRequest.aggregate([
      { $match: { reviewedAt: { $exists: true } } },
      {
        $project: {
          processingDays: {
            $divide: [{ $subtract: ['$reviewedAt', '$createdAt'] }, 86400000],
          },
        },
      },
      { $group: { _id: null, avgDays: { $avg: '$processingDays' } } },
    ]),
  ]);

  const approvedCount = byStatus.find(s => s._id === 'approved')?.count || 0;
  const approvalRate = total > 0 ? Math.round((approvedCount / total) * 100) : 0;

  return {
    total,
    byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
    byType: Object.fromEntries(byType.map(t => [t._id, t.count])),
    approvalRate,
    avgProcessingDays: avgProcessing.length > 0 && avgProcessing[0].avgDays !== null && avgProcessing[0].avgDays !== undefined
      ? Math.round(avgProcessing[0].avgDays)
      : null,
  };
}

/**
 * Relance une demande rejetée en créant un nouveau brouillon (pending).
 * Accessible par le propriétaire ou HR/admin.
 */
async function reopenRequest(requestId, user) {
  const original = await MobilityRequest.findById(requestId);
  if (!original) throw AppError.notFound('Demande introuvable');

  if (original.status !== 'rejected') {
    throw AppError.badRequest('Seules les demandes rejetées peuvent être relancées');
  }

  const isOwner = original.employeeId.toString() === user._id.toString();
  if (!isOwner && !['admin', 'hr'].includes(user.role)) {
    throw AppError.forbidden('Accès refusé');
  }

  const newRequest = await MobilityRequest.create({
    employeeId: original.employeeId,
    currentPosition: original.currentPosition,
    currentDepartment: original.currentDepartment,
    targetPosition: original.targetPosition,
    targetDepartment: original.targetDepartment,
    targetSite: original.targetSite,
    requestType: original.requestType,
    motivation: original.motivation,
    priority: original.priority,
    targetDate: original.targetDate,
    status: 'pending',
  });

  return newRequest.populate('employeeId', 'firstName lastName email');
}

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  listRequests,
  getRequestById,
  createRequest,
  updateRequest,
  deleteRequest,
  completeImplementation,
  getMobilityHistory,
  getMobilityStats,
  reopenRequest,
};
