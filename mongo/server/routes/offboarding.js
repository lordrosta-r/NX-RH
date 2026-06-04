'use strict'

// =============================================================================
// routes/offboarding.js — CRUD demandes de départ
//
// Toutes les routes nécessitent hr ou admin (monté dans index.js avec authGuard).
// DELETE est réservé admin uniquement.
// =============================================================================

const mongoose = require('mongoose')
const router   = require('express').Router()
const { OffboardingRequest } = require('../models/OffboardingRequest')
const User     = require('../models/User')
const { Evaluation } = require('../models/Evaluation')
const AuditLog = require('../models/AuditLog')
const { paginate } = require('../utils/paginate')

const { ADMIN_ROLES: HR_ROLES } = require('../config/constants')
const ADMIN_ROLES = ['admin'] // admin-only — pas de constante équivalente dans constants.js

// POST /api/offboarding — Créer une demande de départ (hr/admin)
router.post('/', async (req, res, next) => {
  try {
    if (!HR_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' })
    }

    const { userId, reason, lastDay, notes } = req.body
    if (!userId || !reason || !lastDay) {
      return res.status(400).json({ error: 'userId, reason et lastDay sont requis' })
    }
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: 'userId invalide' })
    }

    const VALID_REASONS = ['resignation', 'termination', 'retirement', 'other']
    if (!VALID_REASONS.includes(reason)) {
      return res.status(400).json({ error: `reason invalide : ${reason}` })
    }

    const user = await User.findById(userId).select('_id firstName lastName isActive').lean()
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

    const request = await OffboardingRequest.create({
      userId,
      requestedBy: req.user.id,
      reason,
      lastDay:     new Date(lastDay),
      notes:       notes?.trim() || null,
    })

    AuditLog.create({
      userId:     req.user.id,
      userRole:   req.user.role,
      action:     'offboarding_create',
      targetType: 'OffboardingRequest',
      targetId:   request._id,
      meta:       { userId, reason, lastDay },
    }).catch(() => {})

    res.status(201).json(request)
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Une demande de départ existe déjà pour cet utilisateur' })
    }
    next(err)
  }
})

// GET /api/offboarding — Liste des demandes de départ (hr/admin/manager lecture seule)
router.get('/', async (req, res, next) => {
  try {
    const READ_ROLES = [...HR_ROLES, 'manager']
    if (!READ_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' })
    }

    const filter = {}
    const VALID_STATUSES = ['pending', 'in_progress', 'completed']
    if (req.query.status && VALID_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status
    }

    // Managers only see offboardings for their direct reports
    if (req.user.role === 'manager') {
      const teamMembers = await User.find({ managerId: req.user._id }).select('_id').lean()
      filter.userId = { $in: teamMembers.map(u => u._id) }
    }

    const result = await paginate(OffboardingRequest, filter, {
      page:  req.query.page  || 1,
      limit: req.query.limit || 50,
      sort:  { createdAt: -1 },
      populate: [
        { path: 'userId',      select: 'firstName lastName email department position role' },
        { path: 'requestedBy', select: 'firstName lastName' },
      ],
    })
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// GET /api/offboarding/:id — Détail d'une demande de départ (hr/admin/manager lecture seule)
router.get('/:id', async (req, res, next) => {
  try {
    const READ_ROLES = [...HR_ROLES, 'manager']
    if (!READ_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const request = await OffboardingRequest.findById(req.params.id)
      .populate('userId',      'firstName lastName email department position role')
      .populate('requestedBy', 'firstName lastName')
      .lean()

    if (!request) return res.status(404).json({ error: 'Demande introuvable' })
    res.json(request)
  } catch (err) {
    next(err)
  }
})

// PATCH /api/offboarding/:id — Mettre à jour le statut ou les notes (hr/admin)
router.patch('/:id', async (req, res, next) => {
  try {
    if (!HR_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const request = await OffboardingRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ error: 'Demande introuvable' })

    const ALLOWED_STATUSES = ['pending', 'in_progress', 'completed']
    if (req.body.status !== undefined) {
      if (!ALLOWED_STATUSES.includes(req.body.status)) {
        return res.status(400).json({ error: `status invalide : ${req.body.status}` })
      }
      request.status = req.body.status

      // Archiver l'utilisateur ET ses évaluations en cours quand le départ est complété
      if (req.body.status === 'completed') {
        await User.findByIdAndUpdate(request.userId, {
          isActive:   false,
          archivedAt: new Date(),
          offboardingStatus: 'offboarded',
        })
        // Les évaluations non terminales (où l'user est évalué OU évaluateur)
        // sont annulées → 'archived' pour ne pas rester bloquées en campagne.
        await Evaluation.updateMany(
          {
            $or: [{ evaluateeId: request.userId }, { evaluatorId: request.userId }],
            status: { $nin: ['validated', 'archived'] },
          },
          { $set: { status: 'archived' } },
        )
      }
    }

    if (req.body.notes !== undefined) {
      request.notes = req.body.notes?.trim() || null
    }

    await request.save()

    AuditLog.create({
      userId:     req.user.id,
      userRole:   req.user.role,
      action:     'offboarding_update',
      targetType: 'OffboardingRequest',
      targetId:   request._id,
      meta:       { status: request.status },
    }).catch(() => {})

    const populated = await OffboardingRequest.findById(request._id)
      .populate('userId',      'firstName lastName email department position role')
      .populate('requestedBy', 'firstName lastName')
      .lean()

    res.json(populated)
  } catch (err) {
    next(err)
  }
})

// PATCH /api/offboarding/:id/checklist/:itemIndex — Cocher un item de la checklist (hr/admin)
router.patch('/:id/checklist/:itemIndex', async (req, res, next) => {
  try {
    if (!HR_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const idx = parseInt(req.params.itemIndex, 10)
    if (isNaN(idx) || idx < 0) {
      return res.status(400).json({ error: 'itemIndex invalide' })
    }

    const request = await OffboardingRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ error: 'Demande introuvable' })
    if (idx >= request.checklist.length) {
      return res.status(400).json({ error: 'itemIndex hors limites' })
    }

    const done = req.body.done !== false
    request.checklist[idx].done   = done
    request.checklist[idx].doneAt = done ? new Date() : null
    request.checklist[idx].doneBy = done ? req.user.id : null

    // Passer automatiquement en in_progress dès le premier item coché
    if (done && request.status === 'pending') {
      request.status = 'in_progress'
    }

    await request.save()

    const populated = await OffboardingRequest.findById(request._id)
      .populate('userId',      'firstName lastName email department position role')
      .populate('requestedBy', 'firstName lastName')
      .lean()

    res.json(populated)
  } catch (err) {
    next(err)
  }
})

// DELETE /api/offboarding/:id — Supprimer une demande de départ (admin uniquement)
router.delete('/:id', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé à l\'administrateur' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const request = await OffboardingRequest.findByIdAndDelete(req.params.id)
    if (!request) return res.status(404).json({ error: 'Demande introuvable' })

    AuditLog.create({
      userId:     req.user.id,
      userRole:   req.user.role,
      action:     'offboarding_delete',
      targetType: 'OffboardingRequest',
      targetId:   req.params.id,
      meta:       {},
    }).catch(() => {})

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

module.exports = router
