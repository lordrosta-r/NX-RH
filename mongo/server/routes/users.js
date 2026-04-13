'use strict'

const mongoose = require('mongoose')
const router = require('express').Router()
const { User } = require('../models')
const { ROLES, ADMIN_ROLES } = require('../config/constants')

// GET /api/users — liste des utilisateurs (scope par rôle)
router.get('/', async (req, res, next) => {
  try {
    const { role, department, search } = req.query
    const filter = {}

    // Scope par rôle appelant
    if (req.user.role === 'manager') {
      // Un manager ne voit que ses subordonnés directs
      filter.managerId = req.user.id
    } else if (!['admin', 'hr', 'director'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

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

    if (req.query.page) {
      const page  = Math.max(1, parseInt(req.query.page)  || 1)
      const limit = Math.min(100, parseInt(req.query.limit) || 50)
      const skip  = (page - 1) * limit
      const [users, total] = await Promise.all([
        User.find(filter).select('-passwordHash -ldapDn').sort({ lastName: 1, firstName: 1 }).skip(skip).limit(limit).lean(),
        User.countDocuments(filter),
      ])
      return res.json({ data: users, total, page, limit })
    }

    const users = await User.find(filter)
      .select('-passwordHash -ldapDn')
      .sort({ lastName: 1, firstName: 1 })
      .limit(100)
      .lean()

    res.json(users)
  } catch (err) {
    next(err)
  }
})

// GET /api/users/:id
router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const user = await User.findById(req.params.id)
      .select('-passwordHash -ldapDn')
      .lean()

    if (!user) return res.status(404).json({ error: 'User not found' })

    // Scope RBAC : manager voit lui-même ou ses subordonnés directs
    if (req.user.role === 'manager') {
      const isSubordinate = user.managerId?.toString() === req.user.id
      const isSelf = req.user.id === req.params.id
      if (!isSubordinate && !isSelf) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }
    }
    // director, admin, hr : accès complet
    // employee : seulement lui-même
    if (req.user.role === 'employee' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    res.json(user)
  } catch (err) {
    next(err)
  }
})

// POST /api/users — créer un utilisateur (admin/hr seulement)
router.post('/', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const { firstName, lastName, email, role, department, position, managerId } = req.body
    const tempPassword = require('crypto').randomBytes(16).toString('hex')

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
      passwordHash: tempPassword,
    })
    await user.save()

    const result = user.toObject()
    delete result.passwordHash
    delete result.ldapDn

    // tempPassword exposé une seule fois à la création
    res.status(201).json({ ...result, tempPassword })
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already exists' })
    next(err)
  }
})

// PATCH /api/users/:id — modifier un utilisateur
router.patch('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const isAdmin = ADMIN_ROLES.includes(req.user.role)
    const isSelf = req.user.id === req.params.id

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    // Whitelist des champs modifiables — authSource, passwordHash, ldapDn ne peuvent jamais être modifiés ici
    const ALLOWED = ['email', 'firstName', 'lastName', 'department', 'position', 'role', 'managerId', 'isActive']
    const updates = {}
    for (const key of ALLOWED) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }

    // Les non-admins ne peuvent pas changer leur rôle, manager, statut, département ni poste
    if (!isAdmin) {
      delete updates.role
      delete updates.managerId
      delete updates.isActive
      delete updates.department
      delete updates.position
      delete updates.email
    }

    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
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

module.exports = router
