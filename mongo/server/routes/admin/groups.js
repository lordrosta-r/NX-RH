'use strict'

// =============================================================================
// routes/admin/groups.js — CRUD groupes d'utilisateurs
//
// GET    /api/admin/groups          — liste tous les groupes (membres peuplés)
// POST   /api/admin/groups          — créer un groupe
// GET    /api/admin/groups/:id      — détail d'un groupe (membres peuplés)
// PUT    /api/admin/groups/:id      — modifier nom/description
// DELETE /api/admin/groups/:id      — supprimer un groupe
// PATCH  /api/admin/groups/:id/members — ajouter ou retirer des membres
//
// Rôles autorisés : admin, hr (déclaré dans index.js)
// =============================================================================

const router    = require('express').Router()
const mongoose  = require('mongoose')
const UserGroup = require('../../models/UserGroup')

const MEMBER_FIELDS = '_id firstName lastName email role'

// GET / — liste tous les groupes
router.get('/', async (req, res, next) => {
  try {
    const groups = await UserGroup.find()
      .populate('members', MEMBER_FIELDS)
      .sort({ createdAt: -1 })
      .lean()
    res.json(groups)
  } catch (err) {
    next(err)
  }
})

// POST / — créer un groupe
router.post('/', async (req, res, next) => {
  try {
    const { name, description, memberIds } = req.body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Le champ "name" est requis' })
    }

    const members = Array.isArray(memberIds)
      ? memberIds.filter(id => mongoose.isValidObjectId(id))
      : []

    const group = await UserGroup.create({
      name: name.trim(),
      description: description ? String(description).trim() : '',
      members,
      createdBy: req.user.id,
    })

    const populated = await UserGroup.findById(group._id)
      .populate('members', MEMBER_FIELDS)
      .lean()

    res.status(201).json(populated)
  } catch (err) {
    next(err)
  }
})

// GET /:id — détail d'un groupe
router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }
    const group = await UserGroup.findById(req.params.id)
      .populate('members', MEMBER_FIELDS)
      .lean()
    if (!group) return res.status(404).json({ error: 'Groupe introuvable' })
    res.json(group)
  } catch (err) {
    next(err)
  }
})

// PUT /:id — modifier nom/description
router.put('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }
    const { name, description } = req.body
    const update = {}
    if (name !== undefined) update.name = String(name).trim()
    if (description !== undefined) update.description = String(description).trim()

    const group = await UserGroup.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    ).populate('members', MEMBER_FIELDS).lean()

    if (!group) return res.status(404).json({ error: 'Groupe introuvable' })
    res.json(group)
  } catch (err) {
    next(err)
  }
})

// DELETE /:id — supprimer un groupe
router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }
    const result = await UserGroup.deleteOne({ _id: req.params.id })
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Groupe introuvable' })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

// PATCH /:id/members — ajouter ou retirer des membres
router.patch('/:id/members', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const { action, userIds } = req.body

    if (!['add', 'remove'].includes(action)) {
      return res.status(400).json({ error: 'action doit être "add" ou "remove"' })
    }
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds doit être un tableau non vide' })
    }

    const validIds = userIds.filter(id => mongoose.isValidObjectId(id))
    if (validIds.length === 0) {
      return res.status(400).json({ error: 'Aucun ID valide fourni' })
    }

    const update = action === 'add'
      ? { $addToSet: { members: { $each: validIds } } }
      : { $pull:     { members: { $in: validIds }  } }

    const group = await UserGroup.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('members', MEMBER_FIELDS)
      .lean()

    if (!group) return res.status(404).json({ error: 'Groupe introuvable' })
    res.json(group)
  } catch (err) {
    next(err)
  }
})

module.exports = router
