'use strict'

// =============================================================================
// /api/evaluations — Evaluation CRUD + status transitions
// =============================================================================

const router = require('express').Router()
const db     = require('../config/db')

// GET /api/evaluations?campaign_id=<n>&evaluatee_id=<n>
// Employees see their own; managers see their team's; admins see all.
router.get('/', async (req, res, next) => {
  try {
    const conditions = []
    const params     = []

    if (req.query.campaign_id) {
      conditions.push('e.campaign_id = ?')
      params.push(req.query.campaign_id)
    }

    // Scope by role
    if (req.user.role === 'employee') {
      conditions.push('(e.evaluatee_id = ? OR e.evaluator_id = ?)')
      params.push(req.user.id, req.user.id)
    } else if (req.user.role === 'manager') {
      // manager sees evaluations of their direct reports
      conditions.push('(evaluatee.manager_id = ? OR e.evaluator_id = ?)')
      params.push(req.user.id, req.user.id)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [rows] = await db.query(
      `SELECT
         e.*,
         CONCAT(ev.first_name, ' ', ev.last_name) AS evaluator_name,
         CONCAT(ee.first_name, ' ', ee.last_name) AS evaluatee_name
       FROM evaluations e
       JOIN users ev      ON ev.id = e.evaluator_id
       JOIN users ee      ON ee.id = e.evaluatee_id  -- aliased for WHERE scope
       JOIN users evaluatee ON evaluatee.id = e.evaluatee_id
       ${where}
       ORDER BY e.created_at DESC`,
      params
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

// GET /api/evaluations/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM evaluations WHERE id = ?', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Evaluation not found' })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
})

// POST /api/evaluations — create/assign evaluation (admin or manager)
router.post('/', async (req, res, next) => {
  try {
    if (req.user.role === 'employee') return res.status(403).json({ error: 'Forbidden' })

    const { campaign_id, form_id, evaluator_id, evaluatee_id } = req.body
    const [result] = await db.query(
      'INSERT INTO evaluations (campaign_id, form_id, evaluator_id, evaluatee_id) VALUES (?, ?, ?, ?)',
      [campaign_id, form_id, evaluator_id, evaluatee_id]
    )
    res.status(201).json({ id: result.insertId })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/evaluations/:id — save answers or advance status
// Employees can save/submit; managers can review/validate.
router.patch('/:id', async (req, res, next) => {
  try {
    const { answers, status, manager_comment, score } = req.body
    const allowed = ['answers', 'status', 'manager_comment', 'score']
    const updates = {}

    if (answers   !== undefined) updates.answers          = JSON.stringify(answers)
    if (score     !== undefined) updates.score            = score
    if (manager_comment !== undefined) updates.manager_comment = manager_comment

    // Status transitions with timestamps
    if (status === 'submitted') {
      updates.status       = 'submitted'
      updates.submitted_at = new Date()
    } else if (status === 'reviewed' || status === 'validated') {
      if (req.user.role === 'employee') return res.status(403).json({ error: 'Forbidden' })
      updates.status      = status
      updates.reviewed_at = new Date()
    } else if (status === 'in_progress') {
      updates.status = 'in_progress'
    }

    if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nothing to update' })

    const fields     = Object.keys(updates)
    const setClauses = fields.map(f => `${f} = ?`).join(', ')
    await db.query(
      `UPDATE evaluations SET ${setClauses} WHERE id = ?`,
      [...fields.map(f => updates[f]), req.params.id]
    )
    res.json({ message: 'Evaluation updated' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
