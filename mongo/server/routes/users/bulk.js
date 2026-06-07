'use strict'

// =============================================================================
// routes/users/bulk.js — Actions en masse sur les utilisateurs
//
// POST /api/users/bulk
//   body: { action, userIds, payload }
//
//   action = 'deactivate' → isActive: false
//   action = 'activate'   → isActive: true
//   action = 'changeRole' → role: payload.role
//   action = 'assignGroup'→ ajoute les utilisateurs au groupe payload.groupId
//
// Rôles autorisés : admin, hr (déclaré dans index.js)
// =============================================================================

const router    = require('express').Router()
const mongoose  = require('mongoose')
const { User }  = require('../../models')
const UserGroup = require('../../models/UserGroup')

const VALID_ROLES   = ['employee', 'manager', 'hr', 'admin']
const VALID_ACTIONS = ['deactivate', 'activate', 'changeRole', 'assignGroup']

router.post('/', async (req, res, next) => {
  try {
    const { action, userIds, payload = {} } = req.body

    if (!VALID_ACTIONS.includes(action)) {
      return res.status(400).json({ error: `action invalide. Valeurs autorisées : ${VALID_ACTIONS.join(', ')}` })
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds doit être un tableau non vide' })
    }

    const validIds = userIds.filter(id => mongoose.isValidObjectId(id))
    if (validIds.length === 0) {
      return res.status(400).json({ error: 'Aucun ID utilisateur valide fourni' })
    }

    if (action === 'deactivate') {
      const result = await User.updateMany({ _id: { $in: validIds } }, { $set: { isActive: false } })
      return res.json({ modified: result.modifiedCount })
    }

    if (action === 'activate') {
      const result = await User.updateMany({ _id: { $in: validIds } }, { $set: { isActive: true } })
      return res.json({ modified: result.modifiedCount })
    }

    if (action === 'changeRole') {
      const { role } = payload
      if (!role || !VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: `role invalide. Valeurs autorisées : ${VALID_ROLES.join(', ')}` })
      }
      const result = await User.updateMany({ _id: { $in: validIds } }, { $set: { role } })
      return res.json({ modified: result.modifiedCount })
    }

    if (action === 'assignGroup') {
      const { groupId } = payload
      if (!groupId || !mongoose.isValidObjectId(groupId)) {
        return res.status(400).json({ error: 'payload.groupId invalide ou manquant' })
      }
      const group = await UserGroup.findById(groupId)
      if (!group) return res.status(404).json({ error: 'Groupe introuvable' })

      await UserGroup.updateOne(
        { _id: groupId },
        { $addToSet: { members: { $each: validIds } } }
      )
      return res.json({ groupId, added: validIds.length })
    }
  } catch (err) {
    next(err)
  }
})

module.exports = router
