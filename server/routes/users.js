'use strict'

// =============================================================================
// /api/users — User management (admin only for mutations)
// =============================================================================

const router = require('express').Router()
const bcrypt = require('bcrypt')
const db     = require('../config/db')

// GET /api/users — list all active users (managers see their direct reports)
router.get('/', async (req, res, next) => {
  try {
    let query  = 'SELECT id, email, first_name, last_name, role, department, job_title, manager_id FROM users WHERE is_active = TRUE'
    const params = []

    // Managers only see their own team
    if (req.user.role === 'manager') {
      query += ' AND manager_id = ?'
      params.push(req.user.id)
    }

    const [rows] = await db.query(query, params)
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

// GET /api/users/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT id, email, first_name, last_name, role, department, job_title, manager_id FROM users WHERE id = ? AND is_active = TRUE',
      [req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'User not found' })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
})

// POST /api/users — create user (admin only)
router.post('/', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' })

    const { email, password, first_name, last_name, role, department, job_title, manager_id } = req.body
    const hash = await bcrypt.hash(password, 12)

    const [result] = await db.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, role, department, job_title, manager_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [email, hash, first_name, last_name, role, department || null, job_title || null, manager_id || null]
    )

    res.status(201).json({ id: result.insertId })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/users/:id — partial update (admin only)
router.patch('/:id', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' })

    const allowed = ['first_name', 'last_name', 'role', 'department', 'job_title', 'manager_id', 'is_active']
    const fields  = Object.keys(req.body).filter(k => allowed.includes(k))
    if (!fields.length) return res.status(400).json({ error: 'No valid fields provided' })

    const setClauses = fields.map(f => `${f} = ?`).join(', ')
    const values     = fields.map(f => req.body[f])

    await db.query(`UPDATE users SET ${setClauses} WHERE id = ?`, [...values, req.params.id])
    res.json({ message: 'User updated' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
