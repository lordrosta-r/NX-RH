'use strict'

const express = require('express');
const router = express.Router();
const MobilityRequest = require('../models/MobilityRequest');
const { authenticate } = require('../middleware/auth');
const respond = require('../utils/response');

// GET /api/mobility — liste (HR/admin voit tout, employé voit les siennes)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const filter = {};
    if (req.user.role === 'employee') {
      filter.employeeId = req.user._id;
    }
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

    return respond.paginated(res, { data, total, page: +page, limit: +limit });
  } catch (err) { next(err); }
});

// POST /api/mobility — créer une demande
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { targetPosition, targetDepartment, targetSite, requestType, motivation, priority, targetDate } = req.body;
    if (!targetPosition) return res.status(400).json({ error: 'targetPosition est requis' });

    const request = await MobilityRequest.create({
      employeeId: req.user._id,
      currentPosition: req.user.position,
      currentDepartment: req.user.department,
      targetPosition,
      targetDepartment,
      targetSite,
      requestType: requestType || 'internal_transfer',
      motivation,
      priority: priority || 'normal',
      targetDate: targetDate ? new Date(targetDate) : undefined,
    });

    const populated = await request.populate('employeeId', 'firstName lastName email');
    return respond.created(res, populated);
  } catch (err) { next(err); }
});

// GET /api/mobility/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const request = await MobilityRequest.findById(req.params.id)
      .populate('employeeId', 'firstName lastName email department position')
      .populate('reviewedBy', 'firstName lastName')
      .lean();
    if (!request) return res.status(404).json({ error: 'Demande introuvable' });

    // RBAC : l'employé ne peut voir que ses propres demandes
    if (req.user.role === 'employee' && request.employeeId._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    return respond.item(res, request);
  } catch (err) { next(err); }
});

// PATCH /api/mobility/:id — update statut (HR/admin) ou motivation (employee)
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const request = await MobilityRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Demande introuvable' });

    const isHrAdmin = ['admin', 'hr'].includes(req.user.role);
    const isOwner = request.employeeId.toString() === req.user._id.toString();

    if (!isHrAdmin && !isOwner) return res.status(403).json({ error: 'Accès refusé' });

    if (isHrAdmin) {
      const { status, hrComment, priority } = req.body;
      if (status) { request.status = status; request.reviewedBy = req.user._id; request.reviewedAt = new Date(); }
      if (hrComment !== undefined) request.hrComment = hrComment;
      if (priority) request.priority = priority;
    } else if (isOwner && request.status === 'pending') {
      const { motivation, targetPosition, targetDepartment } = req.body;
      if (motivation !== undefined) request.motivation = motivation;
      if (targetPosition) request.targetPosition = targetPosition;
      if (targetDepartment !== undefined) request.targetDepartment = targetDepartment;
    }

    await request.save();
    return respond.item(res, request);
  } catch (err) { next(err); }
});

// DELETE /api/mobility/:id — annuler (owner si pending, admin toujours)
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const request = await MobilityRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Demande introuvable' });

    const isHrAdmin = ['admin', 'hr'].includes(req.user.role);
    const isOwner = request.employeeId.toString() === req.user._id.toString() && request.status === 'pending';

    if (!isHrAdmin && !isOwner) return res.status(403).json({ error: 'Accès refusé' });

    await request.deleteOne();
    return respond.deleted(res);
  } catch (err) { next(err); }
});

module.exports = router;
