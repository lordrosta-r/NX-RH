'use strict'

// =============================================================================
// authGuard middleware
//
// Validates a JWT from either:
//   - Authorization: Bearer <token>  header  (API clients / fetch calls)
//   - token cookie                           (browser page navigation)
//
// Usage:
//   authGuard()                     → any authenticated user
//   authGuard(['admin'])            → admin only
//   authGuard(['admin', 'manager']) → admin or manager
// =============================================================================

const jwt = require('jsonwebtoken')

/**
 * @param {string[]} [allowedRoles] - If provided, only these roles may pass.
 */
const authGuard = (allowedRoles = []) => (req, res, next) => {
  // 1. Extract token
  const authHeader = req.headers['authorization'] || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  const token = bearerToken || req.cookies?.token

  if (!token) {
    // For API routes return 401 JSON; for page routes redirect to login
    if (req.path.startsWith('/api')) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    return res.redirect('/')
  }

  // 2. Verify signature & expiry
  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    if (req.path.startsWith('/api')) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    return res.redirect('/')
  }

  // 3. Check role authorization
  if (allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
    if (req.path.startsWith('/api')) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    return res.redirect('/dashboard') // redirect to a safe page
  }

  // 4. Attach user info to request for downstream handlers
  req.user = payload
  next()
}

module.exports = { authGuard }
