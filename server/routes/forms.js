'use strict'

// =============================================================================
// /api/forms — Evaluation form templates
// =============================================================================

const router = require('express').Router()
const db     = require('../config/db')

// GET /api/forms?campaign_id=<n>
router.get('/', async (req, res, next) => {
  try {
    const { campaign_id } = req.query
    let query  = 'SELECT * FROM forms WHERE is_active = TRUE'
    const params = []

    if (campaign_id) {
      query += ' AND campaign_id = ?'
      params.push(campaign_id)
    }

    const [rows] = await db.query(query, params)
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

// GET /api/forms/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM forms WHERE id = ?', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Form not found' })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
})

// POST /api/forms — create form template (admin only)
router.post('/', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' })

    const { campaign_id, title, description, form_type, structure } = req.body
    const [result] = await db.query(
      'INSERT INTO forms (campaign_id, title, description, form_type, structure, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [campaign_id, title, description || null, form_type, JSON.stringify(structure), req.user.id]
    )
    res.status(201).json({ id: result.insertId })
  } catch (err) {
    next(err)
  }
})

module.exports = router
