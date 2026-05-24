'use strict'

// =============================================================================
// services/authService.js — Logique métier d'authentification et préférences
// =============================================================================

const bcrypt = require('bcrypt')
const jwt    = require('jsonwebtoken')
const User   = require('../models/User')
const { LOCALES, THEMES, NOTIF_PREF_KEYS, NOTIF_KEYS_BY_ROLE } = require('../config/constants')

// ── Helper ────────────────────────────────────────────────────────────────────

function makeError(message, status) {
  const err = new Error(message)
  err.status = status
  return err
}

// ── Helpers notification (partagés avec routes/users.js) ─────────────────────

/**
 * Retourne les clés de notifications autorisées pour un rôle donné.
 * Source de vérité : NOTIF_KEYS_BY_ROLE dans config/constants.js.
 */
function allowedNotifKeysFor(role) {
  return NOTIF_KEYS_BY_ROLE[role] || NOTIF_KEYS_BY_ROLE.employee
}

/**
 * Filtre un objet notificationPrefs pour ne conserver que les clés
 * autorisées pour le rôle donné.
 */
function filterNotifPrefsByRole(prefs, role) {
  const allowed = allowedNotifKeysFor(role)
  const out = {}
  for (const k of allowed) {
    if (prefs && Object.prototype.hasOwnProperty.call(prefs, k)) out[k] = !!prefs[k]
  }
  return out
}

// ── Authentification ──────────────────────────────────────────────────────────

/**
 * Vérifie les identifiants et génère un JWT.
 *
 * @param {string}  email
 * @param {string}  password
 * @param {boolean} remember — true → expiry 30d, false → 8h (ou JWT_EXPIRES_IN)
 *
 * @returns {Promise<
 *   | { mustChangePassword: true, userId: ObjectId }
 *   | { user: object, token: string, maxAge: number }
 * >}
 *
 * @throws {Error} status 401 si identifiants invalides (err.loginFailed = true)
 */
async function login(email, password, remember) {
  const user = await User.findOne({ email: email.toLowerCase().trim(), isActive: true })
    .select('+passwordHash +authSource')
    .lean()

  if (!user || user.authSource !== 'local' || !user.passwordHash) {
    console.warn('[auth] Login failed — user not found or wrong authSource:', email.toLowerCase())
    const err = makeError('Identifiants invalides', 401)
    err.loginFailed = true
    throw err
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    console.warn('[auth] Login failed — wrong password for:', email.toLowerCase())
    const err = makeError('Identifiants invalides', 401)
    err.loginFailed = true
    throw err
  }

  if (user.mustChangePassword) {
    return { mustChangePassword: true, userId: user._id }
  }

  const jwtExpiry = remember ? '30d' : (process.env.JWT_EXPIRES_IN || '8h')
  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: jwtExpiry }
  )

  const maxAge = remember ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000

  return { user, token, maxAge }
}

// ── Préférences ────────────────────────────────────────────────────────────────

/**
 * Met à jour les préférences utilisateur (locale / theme / notificationPrefs).
 * Valide et merge avec l'existant.
 *
 * @param {string} userId
 * @param {string} role   — rôle de l'utilisateur (pour whitelist notifPrefs)
 * @param {object} body   — { locale?, theme?, notificationPrefs? }
 * @returns {Promise<{ locale, theme, notificationPrefs }>}
 */
async function updatePreferences(userId, role, body) {
  const { locale, theme, notificationPrefs } = body || {}
  const updates = {}

  if (locale !== undefined) {
    if (!LOCALES.includes(locale)) {
      throw makeError(`Locale invalide. Valeurs autorisées : ${LOCALES.join(', ')}`, 400)
    }
    updates.locale = locale
  }

  if (theme !== undefined) {
    if (!THEMES.includes(theme)) {
      throw makeError(`Thème invalide. Valeurs autorisées : ${THEMES.join(', ')}`, 400)
    }
    updates.theme = theme
  }

  if (notificationPrefs !== undefined) {
    if (!notificationPrefs || typeof notificationPrefs !== 'object' || Array.isArray(notificationPrefs)) {
      throw makeError('notificationPrefs doit être un objet', 400)
    }
    const allowedForRole = allowedNotifKeysFor(role)
    const cleaned = {}
    for (const [key, val] of Object.entries(notificationPrefs)) {
      if (!NOTIF_PREF_KEYS.includes(key)) {
        throw makeError(`Clé de notification inconnue : ${key}`, 400)
      }
      if (!allowedForRole.includes(key)) {
        throw makeError(`Clé de notification non autorisée pour votre rôle : ${key}`, 403)
      }
      if (typeof val !== 'boolean') {
        throw makeError(`notificationPrefs.${key} doit être booléen`, 400)
      }
      cleaned[key] = val
    }
    // Merge avec l'existant (ne pas écraser les autres clés)
    const current = await User.findById(userId).select('notificationPrefs').lean()
    updates.notificationPrefs = { ...(current?.notificationPrefs || {}), ...cleaned }
  }

  if (Object.keys(updates).length === 0) {
    throw makeError('Aucune préférence à mettre à jour', 400)
  }

  await User.updateOne({ _id: userId }, { $set: updates })
  const fresh = await User.findById(userId)
    .select('locale theme notificationPrefs')
    .lean()
  fresh.notificationPrefs = filterNotifPrefsByRole(fresh.notificationPrefs, role)
  return fresh
}

module.exports = {
  allowedNotifKeysFor,
  filterNotifPrefsByRole,
  login,
  updatePreferences,
}
