'use strict'

const jwt  = require('jsonwebtoken')
const User = require('../models/User')

// Middleware Express: vérifie le JWT (cookie httpOnly uniquement),
// contrôle le rôle, vérifie isActive en DB, attache req.user.
const authGuard = (allowedRoles = []) => async (req, res, next) => {
  const token = req.cookies?.token

  const isApi = req.originalUrl.startsWith('/api')

  if (!token) {
    if (isApi) return res.status(401).json({ error: 'Authentication required' })
    return res.redirect('/')
  }

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
  } catch (err) {
    let message = 'Token invalide'
    if (err instanceof jwt.TokenExpiredError) message = 'Session expirée'
    if (isApi) return res.status(401).json({ error: message })
    return res.redirect('/')
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
    if (isApi) return res.status(403).json({ error: 'Insufficient permissions' })
    return res.redirect('/dashboard')
  }

  // Vérification DB : compte toujours actif
  try {
    const dbUser = await User.findById(payload.id, 'isActive').lean()
    if (!dbUser || !dbUser.isActive) {
      res.clearCookie('token', { path: '/' })
      if (isApi) return res.status(401).json({ error: 'Compte désactivé' })
      return res.redirect('/')
    }
  } catch (err) {
    return next(err)
  }

  req.user = payload
  next()
}

module.exports = { authGuard }
