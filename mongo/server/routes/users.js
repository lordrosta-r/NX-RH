'use strict'

const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const router = require('express').Router()
const { User, Evaluation, AuditLog } = require('../models')
const { ROLES, ADMIN_ROLES, NOTIF_KEYS_BY_ROLE } = require('../config/constants')

function allowedNotifKeysFor(role) {
  return NOTIF_KEYS_BY_ROLE[role] || NOTIF_KEYS_BY_ROLE.employee
}
function filterNotifPrefsByRole(prefs, role) {
  const allowed = allowedNotifKeysFor(role)
  const out = {}
  for (const k of allowed) {
    if (prefs && Object.prototype.hasOwnProperty.call(prefs, k)) out[k] = !!prefs[k]
  }
  return out
}

// GET /api/users — Liste les utilisateurs (scope par rôle)
router.get('/', async (req, res, next) => {
  try {
    const { role, department, search } = req.query
    const filter = {}

    // Scope par rôle appelant
    if (req.user.role === 'manager' || req.user.role === 'director') {
      // Manager et director ne voient que leurs subordonnés directs
      filter.managerId = req.user.id
    } else if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Permissions insuffisantes' })
    }

    // Filtre isActive explicite : ?isActive=true|false (sinon : pas de filtre)
    if (req.query.isActive === 'true') filter.isActive = true
    else if (req.query.isActive === 'false') filter.isActive = false

    if (role && ROLES.includes(role)) filter.role = role
    if (department && typeof department === 'string' && department.length <= 100) {
      filter.department = department
    }
    if (search) {
      // Échapper les caractères spéciaux regex pour éviter ReDoS
      const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const safeSearch = escapeRegex(search.slice(0, 100)) // limiter à 100 chars aussi
      filter.$or = [
        { firstName: { $regex: safeSearch, $options: 'i' } },
        { lastName:  { $regex: safeSearch, $options: 'i' } },
        { email:     { $regex: safeSearch, $options: 'i' } },
      ]
    }

    const page  = Math.max(1, parseInt(req.query.page)  || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 50)
    const skip  = (page - 1) * limit
    const [users, total] = await Promise.all([
      User.find(filter).select('-passwordHash -ldapDn').sort({ lastName: 1, firstName: 1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ])
    res.json({ data: users, total, page, limit })
  } catch (err) {
    next(err)
  }
})

// GET /api/users/me — Alias de /api/auth/me (même comportement)
router.get('/me', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('firstName lastName email role department position isActive locale theme notificationPrefs lastLoginAt authSource managerId onboarding createdAt')
      .lean()

    if (!user || !user.isActive) {
      res.clearCookie('token', {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path:     '/',
      })
      return res.status(401).json({ error: 'Session invalide' })
    }

    user.notificationPrefs = filterNotifPrefsByRole(user.notificationPrefs, user.role)

    const { _id, ...rest } = user
    res.json({ id: _id, ...rest })
  } catch (err) {
    next(err)
  }
})

// GET /api/users/:id — Retourne un utilisateur par son ID
router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const user = await User.findById(req.params.id)
      .select('-passwordHash -ldapDn')
      .lean()

    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

    // Scope RBAC : manager voit lui-même ou ses subordonnés directs
    if (req.user.role === 'manager') {
      const isSubordinate = user.managerId?.toString() === req.user.id
      const isSelf = req.user.id === req.params.id
      if (!isSubordinate && !isSelf) {
        return res.status(403).json({ error: 'Permissions insuffisantes' })
      }
    }
    // director, admin, hr : accès complet
    // employee : seulement lui-même ou son manager direct (pour afficher le nom dans les paramètres)
    if (req.user.role === 'employee' && req.user.id !== req.params.id) {
      const self = await User.findById(req.user.id, 'managerId').lean()
      const isDirectManager = self?.managerId?.toString() === req.params.id
      if (!isDirectManager) {
        return res.status(403).json({ error: 'Permissions insuffisantes' })
      }
    }

    res.json(user)
  } catch (err) {
    next(err)
  }
})

// POST /api/users — Crée un utilisateur (admin/hr seulement)
router.post('/', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permissions insuffisantes' })
    }

    const { firstName, lastName, email, role, department, position, managerId } = req.body
    const tempPassword = require('crypto').randomBytes(16).toString('hex')
    const passwordHash = await bcrypt.hash(tempPassword, 12)

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'firstName, lastName et email sont requis' })
    }
    if (role && !ROLES.includes(role)) {
      return res.status(400).json({ error: `Rôle invalide : ${role}` })
    }

    const user = new User({
      email,
      firstName,
      lastName,
      department:   department  || null,
      position:     position    || null,
      role:         ROLES.includes(role) ? role : 'employee',
      managerId:    managerId   || null,
      authSource:   'local',
      isActive:     true,
      passwordHash,
    })
    await user.save()

    const result = user.toObject()
    delete result.passwordHash
    delete result.ldapDn

    // tempPassword exposé une seule fois à la création
    res.status(201).json({ ...result, tempPassword })
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email déjà utilisé' })
    next(err)
  }
})

// PATCH /api/users/:id — Modifie un utilisateur
router.patch('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const isAdmin = ADMIN_ROLES.includes(req.user.role)
    const isSelf = req.user.id === req.params.id

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Permissions insuffisantes' })
    }

    // Whitelist des champs modifiables — authSource, passwordHash, ldapDn ne peuvent jamais être modifiés ici
    const ALLOWED = ['email', 'firstName', 'lastName', 'department', 'position', 'role', 'managerId', 'isActive', 'avatar', 'phone']
    const updates = {}
    for (const key of ALLOWED) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }

    // Les non-admins ne peuvent pas changer leur rôle, manager, statut, département ni poste
    if (!isAdmin) {
      const protectedFields = ['role', 'managerId', 'isActive', 'department', 'position', 'email']
      const forbidden = protectedFields.filter(f => req.body[f] !== undefined)
      if (forbidden.length > 0) {
        return res.status(403).json({ error: `Champs protégés non modifiables : ${forbidden.join(', ')}` })
      }
    }

    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })
    Object.assign(user, updates)
    await user.save()
    const result = user.toObject()
    delete result.passwordHash
    delete result.ldapDn
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// PATCH /api/users/:id/avatar — Mettre à jour l'URL d'avatar (ou supprimer)
router.patch('/:id/avatar', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }
    const isSelf  = req.user.id === req.params.id
    const isAdmin = ADMIN_ROLES.includes(req.user.role)
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Accès refusé' })
    }

    const { avatarUrl } = req.body
    // null = supprimer l'avatar (retour aux initiales)
    if (avatarUrl !== null && avatarUrl !== undefined) {
      if (typeof avatarUrl !== 'string' || avatarUrl.length > 500) {
        return res.status(400).json({ error: 'URL d\'avatar invalide (max 500 car)' })
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { avatar: avatarUrl ?? null },
      { new: true, select: '_id avatar' }
    )
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

    res.json({ _id: user._id, avatar: user.avatar })
  } catch (err) {
    next(err)
  }
})

// GET /api/users/:id/offboard-preview — Prévisualise les impacts avant départ (admin/hr)
router.get('/:id/offboard-preview', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permissions insuffisantes' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }
    const userId = req.params.id

    const user = await User.findById(userId).select('-passwordHash -ldapDn').lean()
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

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

    res.json({ user, pendingEvaluations, activeCampaigns })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/users/:id/offboard — Déclenche le processus de départ (admin/hr)
router.patch('/:id/offboard', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permissions insuffisantes' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const { reason, effectiveDate } = req.body
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ error: 'Le champ reason est requis' })
    }
    if (!effectiveDate) {
      return res.status(400).json({ error: 'Le champ effectiveDate est requis' })
    }

    const userId = req.params.id
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

    user.offboardingStatus = 'offboarding'
    user.offboardingReason = reason.trim()
    user.offboardingDate   = new Date(effectiveDate)
    await user.save()

    await Evaluation.updateMany(
      {
        $or: [{ evaluateeId: userId }, { evaluatorId: userId }],
        status: { $nin: ['validated', 'archived'] },
      },
      { $set: { status: 'archived' } }
    )

    AuditLog.create({
      userId:     req.user.id,
      userRole:   req.user.role,
      action:     'offboard',
      targetType: 'User',
      targetId:   userId,
      meta:       { reason: reason.trim(), effectiveDate },
    }).catch(() => {})

    const result = user.toObject()
    delete result.passwordHash
    delete result.ldapDn
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/users/:id/onboarding/complete — marquer l'onboarding terminé ─
// Accessible : self ou hr/admin
// ⚠️ Doit être déclaré AVANT /:id/onboarding/:stepIndex pour éviter que
//    "complete" soit capturé comme stepIndex par Express.

// PATCH /api/users/:id/onboarding/complete — Marque l'onboarding terminé
router.patch('/:id/onboarding/complete', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const userId = req.params.id
    const isSelf = req.user.id === userId
    const isAdmin = ADMIN_ROLES.includes(req.user.role)

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Permissions insuffisantes' })
    }

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

    user.onboarding.completed   = true
    user.onboarding.completedAt = new Date()
    await user.save()

    const result = user.toObject()
    delete result.passwordHash
    delete result.ldapDn
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/users/:id/onboarding/:stepIndex — cocher une étape ───────────
// Accessible : self (employee) ou hr/admin

// PATCH /api/users/:id/onboarding/:stepIndex — Coche une étape d'onboarding
router.patch('/:id/onboarding/:stepIndex', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const userId = req.params.id
    const isSelf = req.user.id === userId
    const isAdmin = ADMIN_ROLES.includes(req.user.role)

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Permissions insuffisantes' })
    }

    const idx = parseInt(req.params.stepIndex, 10)
    if (isNaN(idx) || idx < 0) {
      return res.status(400).json({ error: 'stepIndex invalide' })
    }

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })
    if (idx >= (user.onboarding?.steps?.length ?? 0)) {
      return res.status(400).json({ error: 'stepIndex hors limites' })
    }

    const done = req.body.done !== false
    user.onboarding.steps[idx].done   = done
    user.onboarding.steps[idx].doneAt = done ? new Date() : null

    await user.save()

    const result = user.toObject()
    delete result.passwordHash
    delete result.ldapDn
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// ─── GET /api/users/:id/gdpr-export ──────────────────────────────────────────

// GET /api/users/:id/gdpr-export — Exporte les données personnelles RGPD
router.get('/:id/gdpr-export', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const userId = req.params.id
    const isSelf = req.user.id === userId
    if (!ADMIN_ROLES.includes(req.user.role) && !isSelf) {
      return res.status(403).json({ error: 'Permissions insuffisantes' })
    }

    const [user, evaluations] = await Promise.all([
      User.findById(userId).select('-passwordHash -ldapDn').lean(),
      Evaluation.find({ evaluateeId: userId })
        .populate('campaignId', 'name')
        .populate('formId', 'title formType')
        .lean(),
    ])

    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="gdpr-export-${userId}.json"`)
    res.json({ user, evaluations, exportedAt: new Date() })
  } catch (err) {
    next(err)
  }
})

// ─── DELETE /api/users/:id/gdpr-anonymize ────────────────────────────────────
// Anonymisation RGPD — droit à l'effacement (admin uniquement)

// DELETE /api/users/:id/gdpr-anonymize — Anonymise un utilisateur (droit à l'effacement)
router.delete('/:id/gdpr-anonymize', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Réservé à l\'administrateur' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const userId = req.params.id
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

    const ACTIVE_STATUSES = ['assigned', 'in_progress', 'submitted']
    const activeCount = await Evaluation.countDocuments({
      evaluateeId: userId,
      status: { $in: ACTIVE_STATUSES },
    })
    if (activeCount > 0) {
      return res.status(409).json({
        error: `Impossible d'anonymiser : ${activeCount} évaluation(s) en cours`,
      })
    }

    user.firstName       = 'Anonyme'
    user.lastName        = 'Anonyme'
    user.email           = `anonyme-${userId}@deleted.local`
    user.phone           = null
    user.avatar          = null
    user.isActive        = false
    user.offboardingStatus = 'offboarded'
    await user.save()

    AuditLog.create({
      userId:     req.user.id,
      userRole:   req.user.role,
      action:     'gdpr_anonymize',
      targetType: 'User',
      targetId:   userId,
      meta:       { anonymizedAt: new Date() },
    }).catch(() => {})

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

module.exports = router
