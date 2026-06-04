'use strict'

// =============================================================================
// routes/departments.js — Liste des départements (gérée en DB)
//
// GET /api/departments        → liste courante (tout utilisateur authentifié)
// PUT /api/departments        → remplace la liste (admin uniquement)
//
// Monté avec `authenticated` ; la vérification admin du PUT est faite inline.
// =============================================================================

const router = require('express').Router()
const { getDepartments, setDepartments } = require('../services/departmentsService')

// GET /api/departments
router.get('/', async (req, res, next) => {
  try {
    res.json({ departments: await getDepartments() })
  } catch (err) {
    next(err)
  }
})

// PUT /api/departments — admin only
router.put('/', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Réservé aux administrateurs' })
    }
    const saved = await setDepartments(req.body.departments)
    res.json({ departments: saved })
  } catch (err) {
    if (/tableau|vide/.test(err.message)) return res.status(400).json({ error: err.message })
    next(err)
  }
})

module.exports = router
