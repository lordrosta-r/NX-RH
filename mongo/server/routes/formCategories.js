'use strict'

// =============================================================================
// routes/formCategories.js — Catégories de formulaires (gérées en DB)
//
// GET  /api/form-categories   → liste courante (tout utilisateur authentifié)
// POST /api/form-categories   → ajoute une catégorie personnalisée (admin/RH)
// PUT  /api/form-categories   → remplace toute la liste (admin/RH)
//
// Monté avec `authenticated` ; la vérification admin/RH des mutations est inline.
// =============================================================================

const router = require('express').Router()
const {
  getCategories,
  setCategories,
  addCategory,
} = require('../services/formCategoriesService')
const { ADMIN_ROLES } = require('../config/constants')

function canManage(req, res) {
  if (!ADMIN_ROLES.includes(req.user.role)) {
    res.status(403).json({ error: 'Réservé aux administrateurs et RH' })
    return false
  }
  return true
}

// GET /api/form-categories
router.get('/', async (req, res, next) => {
  try {
    res.json({ categories: await getCategories() })
  } catch (err) {
    next(err)
  }
})

// POST /api/form-categories — admin/RH
router.post('/', async (req, res, next) => {
  try {
    if (!canManage(req, res)) return
    const saved = await addCategory(req.body.label)
    res.status(201).json({ categories: saved })
  } catch (err) {
    if (/requis|existe déjà|vide/.test(err.message)) {
      return res.status(400).json({ error: err.message })
    }
    next(err)
  }
})

// PUT /api/form-categories — admin/RH
router.put('/', async (req, res, next) => {
  try {
    if (!canManage(req, res)) return
    const saved = await setCategories(req.body.categories)
    res.json({ categories: saved })
  } catch (err) {
    if (/tableau|vide/.test(err.message)) {
      return res.status(400).json({ error: err.message })
    }
    next(err)
  }
})

module.exports = router
