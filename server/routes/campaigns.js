'use strict'

// =============================================================================
// /api/campaigns — Performance review campaign lifecycle (admin managed)
// =============================================================================

const router = require('express').Router()
const db     = require('../config/db')

// GET /api/campaigns — list campaigns visible to the current user
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, u.first_name AS creator_first, u.last_name AS creator_last
       FROM campaigns c
       JOIN users u ON u.id = c.created_by
       ORDER BY c.start_date DESC`
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

// GET /api/campaigns/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM campaigns WHERE id = ?', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Campaign not found' })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
})

// POST /api/campaigns — create (admin only)
router.post('/', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' })

    const { name, description, start_date, end_date } = req.body
    const [result] = await db.query(
      'INSERT INTO campaigns (name, description, start_date, end_date, created_by) VALUES (?, ?, ?, ?, ?)',
      [name, description || null, start_date, end_date, req.user.id]
    )
    res.status(201).json({ id: result.insertId })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/campaigns/:id — update status or dates (admin only)
router.patch('/:id', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' })

    const allowed = ['name', 'description', 'status', 'start_date', 'end_date']
    const fields  = Object.keys(req.body).filter(k => allowed.includes(k))
    if (!fields.length) return res.status(400).json({ error: 'No valid fields provided' })

    const setClauses = fields.map(f => `${f} = ?`).join(', ')
    await db.query(
      `UPDATE campaigns SET ${setClauses} WHERE id = ?`,
      [...fields.map(f => req.body[f]), req.params.id]
    )
    res.json({ message: 'Campaign updated' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
