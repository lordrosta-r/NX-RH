'use strict'

// =============================================================================
// routes/search.js — Recherche globale multi-collections
//
// GET /api/search?q=terme — recherche dans Users, Campaigns, Forms
//
// Rôles autorisés : admin, hr, manager, employee (déclaré dans index.js)
// =============================================================================

const router = require('express').Router()
const { User, Campaign, Form } = require('../models')

router.get('/', async (req, res, next) => {
  try {
    const q = req.query.q
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.status(400).json({ error: 'Le paramètre q doit contenir au moins 2 caractères' })
    }

    // Échapper les caractères spéciaux regex pour éviter ReDoS
    const escaped = q.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = { $regex: escaped, $options: 'i' }

    const [users, campaigns, forms] = await Promise.all([
      User.find({ $or: [{ firstName: regex }, { lastName: regex }, { email: regex }] })
        .limit(5)
        .select('firstName lastName email role')
        .lean(),
      Campaign.find({ $or: [{ name: regex }, { description: regex }] })
        .limit(5)
        .select('name status startDate')
        .lean(),
      Form.find({ $or: [{ title: regex }, { description: regex }] })
        .limit(5)
        .select('title formType')
        .lean(),
    ])

    res.json({ users, campaigns, forms })
  } catch (err) {
    next(err)
  }
})

module.exports = router
