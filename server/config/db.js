'use strict'

// =============================================================================
// Database connection — mysql2 connection pool
//
// Uses a pool (not a single connection) so multiple concurrent requests
// can share connections without opening a new socket per request.
//
// Usage (in any route/controller):
//   const db = require('../config/db')
//   const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id])
// =============================================================================

const mysql = require('mysql2/promise')

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306', 10),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'nanoxplore_rh',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  // Return JS Date objects for DATE/DATETIME columns (not raw strings)
  dateStrings:        false,
})

// Verify connectivity on startup (non-fatal — server still starts)
pool.getConnection()
  .then((conn) => {
    console.log('[DB] MySQL connection pool ready')
    conn.release()
  })
  .catch((err) => {
    console.error('[DB] Could not connect to MySQL:', err.message)
  })

module.exports = pool
