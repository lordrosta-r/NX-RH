'use strict'

const mongoose = require('mongoose')
const router = require('express').Router()
const { User, Evaluation, AuditLog } = require('../models')
const { OffboardingRequest } = require('../models/OffboardingRequest')
const { ROLES, ADMIN_ROLES } = require('../config/constants')
const validate = require('../middleware/validate')
const { createUser: createUserValidator, updateUser: updateUserValidator } = require('../validators/userValidators')
const userService = require('../services/userService')
const { filterNotifPrefsByRole } = require('../services/authService')
const respond = require('../utils/response')
const apiResponse = require('../utils/apiResponse')
const { paginate } = require('../utils/paginate')

// GET /api/users/stats — Statistiques utilisateurs (admin/hr uniquement)
router.get('/stats', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permissions insuffisantes' })
    }
    const stats = await userService.getUserStats()
    apiResponse.success(res, stats)
  } catch (err) {
    next(err)
  }
})
router.get('/search', async (req, res, next) => {
  try {
    const allowed = ['admin', 'hr', 'manager']
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permissions insuffisantes' })
    }
    const { q, page, limit, role, department, isActive } = req.query
    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Paramètre q requis' })
    }
    const options = {
      page:       parseInt(page)  || 1,
      limit:      Math.min(100, parseInt(limit) || 20),
      role:       role       || undefined,
      department: department || undefined,
      isActive:   isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    }
    const result = await userService.searchUsers(q, options)
    respond.paginated(res, { data: result.users, total: result.total, page: result.page, limit: result.limit })
  } catch (err) {
    next(err)
  }
})

// GET /api/users — Liste les utilisateurs (scope par rôle)
router.get('/', async (req, res, next) => {
  try {
    const { role, department, search, sector } = req.query
    const filter = {}

    // Scope par rôle appelant
    if (req.user.role === 'manager') {
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
    if (sector && mongoose.isValidObjectId(sector)) filter.sectorId = sector
    if (search) {
      filter.$text = { $search: search.slice(0, 100) }
    }

    const result = await paginate(User, filter, {
      page:   req.query.page  || 1,
      limit:  req.query.limit || 50,
      sort:   { lastName: 1, firstName: 1 },
      select: '-passwordHash -ldapDn',
    })
    apiResponse.paginated(res, result)
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
      const cookieBase = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'Strict', path: '/' }
      res.clearCookie('accessToken', cookieBase)
      res.clearCookie('refreshToken', cookieBase)
      return res.status(401).json({ error: 'Session invalide' })
    }

    user.notificationPrefs = filterNotifPrefsByRole(user.notificationPrefs, user.role)

    const { _id, ...rest } = user
    apiResponse.success(res, { id: _id, ...rest })
  } catch (err) {
    next(err)
  }
})

// GET /api/users/:id — Retourne un utilisateur par son ID
router.get('/:id', async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id, req.user)
    respond.item(res, user)
  } catch (err) {
    next(err)
  }
})

// POST /api/users — Crée un utilisateur (admin/hr seulement)
router.post('/', validate(createUserValidator), async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permissions insuffisantes' })
    }

    const result = await userService.createUser(req.body)
    respond.created(res, result)
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.email) return res.status(409).json({ success: false, error: 'Email déjà utilisé', code: 'EMAIL_TAKEN' })
    if (err.code === 11000) return res.status(409).json({ success: false, error: 'Email déjà utilisé', code: 'DUPLICATE_KEY' })
    next(err)
  }
})

// PATCH /api/users/:id — Modifie un utilisateur
router.patch('/:id', validate(updateUserValidator), async (req, res, next) => {
  try {
    const result = await userService.updateUser(req.params.id, req.body, req.user)
    respond.item(res, result)
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
        return res.status(400).json({ error: "URL d'avatar invalide (max 500 car)" })
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { avatar: avatarUrl ?? null },
      { new: true, select: '_id avatar' }
    )
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

    apiResponse.success(res, { _id: user._id, avatar: user.avatar })
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

    const result = await userService.getOffboardPreview(req.params.id)
    apiResponse.success(res, result)
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

    const result = await userService.offboardUser(req.params.id, req.body)

    AuditLog.create({
      userId:     req.user.id,
      userRole:   req.user.role,
      action:     'offboard',
      targetType: 'User',
      targetId:   req.params.id,
      meta:       { reason: req.body.reason?.trim(), effectiveDate: req.body.effectiveDate },
    }).catch(() => {})

    apiResponse.success(res, result)
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
    apiResponse.success(res, result)
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
    apiResponse.success(res, result)
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

    const result = await userService.gdprExportUser(userId)
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="gdpr-export-${userId}.json"`)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// ─── DELETE /api/users/:id — Soft delete (désactivation) ────────────────────
// Admin uniquement — ne peut pas se supprimer soi-même

// DELETE /api/users/:id — Désactive un utilisateur (soft delete)
router.delete('/:id', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Réservé à l'administrateur" })
    }

    await userService.deleteUser(req.params.id, req.user.id)
    res.status(204).end()
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
      return res.status(403).json({ error: "Réservé à l'administrateur" })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    await userService.gdprAnonymizeUser(req.params.id)

    AuditLog.create({
      userId:     req.user.id,
      userRole:   req.user.role,
      action:     'gdpr_anonymize',
      targetType: 'User',
      targetId:   req.params.id,
      meta:       { anonymizedAt: new Date() },
    }).catch(() => {})

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

// GET /api/users/:id/offboarding-record — Retourne la demande d'offboarding liée à l'utilisateur (admin/hr)
router.get('/:id/offboarding-record', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permissions insuffisantes' })
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }
    const record = await OffboardingRequest.findOne({ userId: req.params.id })
      .sort({ createdAt: -1 })
      .lean()
    if (!record) return res.status(404).json({ error: "Aucune demande d'offboarding trouvée" })
    apiResponse.success(res, { ...record, id: record._id })
  } catch (err) { next(err) }
})

module.exports = router
