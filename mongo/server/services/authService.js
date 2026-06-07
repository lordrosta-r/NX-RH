'use strict'

// =============================================================================
// services/authService.js — Logique métier d'authentification et préférences
// =============================================================================

const bcrypt    = require('bcrypt')
const jwt       = require('jsonwebtoken')
const User      = require('../models/User')
const AppError  = require('../utils/AppError')
const logger    = require('../utils/logger')
const ldapService = require('./ldapService')
const ldapSources = require('./ldapSources')
const { LOCALES, THEMES, NOTIF_PREF_KEYS, NOTIF_KEYS_BY_ROLE, BCRYPT_ROUNDS } = require('../config/constants')

// ── Helper ────────────────────────────────────────────────────────────────────

function makeError(message, status) {
  const err = new Error(message)
  err.status = status
  return err
}

// ── JWT helpers ───────────────────────────────────────────────────────────────

const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh'
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

function generateTokens(payload) {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  })
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, {
    algorithm: 'HS256',
    expiresIn: REFRESH_EXPIRES,
  })
  return { accessToken, refreshToken }
}

async function refreshAccessToken(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET, { algorithms: ['HS256'] })
    const user = await User.findById(decoded.id).select('+isActive +refreshTokens').lean()
    if (!user || !user.isActive) {
      throw makeError('Utilisateur introuvable ou inactif', 401)
    }
    // Allowlist : le refresh token doit être encore enregistré côté serveur.
    // Un token révoqué au logout (ou déjà tourné) est rejeté même si sa
    // signature JWT reste valide → protège contre le rejeu d'un token volé.
    if (!(user.refreshTokens || []).includes(refreshToken)) {
      throw makeError('Refresh token révoqué', 401)
    }
    const payload = { id: user._id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName }
    const tokens = generateTokens(payload)
    // Rotation : on retire l'ancien token et on enregistre le nouveau de façon
    // atomique pour qu'un refresh ne puisse être rejoué qu'une seule fois.
    await User.updateOne(
      { _id: user._id },
      { $pull: { refreshTokens: refreshToken } },
    )
    await User.updateOne(
      { _id: user._id },
      { $push: { refreshTokens: tokens.refreshToken } },
    )
    return tokens
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      throw makeError('Refresh token invalide ou expiré', 401)
    }
    throw err
  }
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
// Émet les tokens pour un utilisateur authentifié et enregistre le refresh token.
function issueTokens(user) {
  const payload = { id: user._id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName }
  const { accessToken, refreshToken } = generateTokens(payload)

  // Enregistre le refresh token pour pouvoir l'invalider au logout
  User.updateOne({ _id: user._id }, { $push: { refreshTokens: refreshToken } })
    .catch(err => logger.error('[auth] refreshToken push failed', { error: err.message }))

  return { user, accessToken, refreshToken }
}

// Tente une authentification contre chaque source LDAP activée.
// Au succès : upsert l'utilisateur (authSource:'ldap') et le renvoie. Sinon null.
async function tryLdapLogin(email, password) {
  let sources
  try {
    sources = await ldapSources.getEnabledSources()
  } catch (err) {
    logger.warn('[auth] LDAP sources unavailable', { error: err.message })
    return null
  }
  for (const source of sources) {
    try {
      const entry = await ldapService.authenticate(source, email, password)
      if (!entry) continue
      const user = await ldapService.upsertLdapUser(entry, source)
      if (user && user.isActive !== false) {
        logger.info('[auth] LDAP login ok', { email: email.toLowerCase(), source: source.id })
        return user
      }
    } catch (err) {
      logger.warn('[auth] LDAP source error', { source: source.id, error: err.message })
    }
  }
  return null
}

async function login(email, password, remember) {
  const user = await User.findOne({ email: email.toLowerCase().trim(), isActive: true })
    .select('+passwordHash +authSource')
    .lean()

  // ── 1. Authentification locale ────────────────────────────────────────────
  if (user && user.authSource === 'local' && user.passwordHash) {
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (valid) {
      if (user.mustChangePassword) {
        return { mustChangePassword: true, userId: user._id }
      }
      return issueTokens(user)
    }
  }

  // ── 2. Authentification LDAP (compte LDAP existant OU inconnu localement) ──
  if (!user || user.authSource === 'ldap') {
    const ldapUser = await tryLdapLogin(email, password)
    if (ldapUser) return issueTokens(ldapUser)
  }

  // ── 3. Échec ──────────────────────────────────────────────────────────────
  logger.warn('[auth] Login failed', { email: email.toLowerCase() })
  const err = makeError('Identifiants invalides', 401)
  err.loginFailed = true
  // Pour l'audit : on ne peut tracer en base qu'un échec sur un compte CONNU
  // (AuditLog exige userId/targetId). Email inconnu → seulement dans les logs.
  if (user) { err.auditUserId = user._id; err.auditUserRole = user.role }
  throw err
}

// ── Déconnexion ───────────────────────────────────────────────────────────────

/**
 * Invalide un refresh token en le retirant de la liste des tokens valides.
 * Silencieux si le token n'est pas en base (déjà révoqué ou login antérieur).
 *
 * @param {string|ObjectId} userId
 * @param {string}          refreshToken
 */
async function logout(userId, refreshToken) {
  if (!userId) return
  try {
    await User.updateOne(
      { _id: userId },
      { $pull: { refreshTokens: refreshToken } },
    )
  } catch (err) {
    logger.error('[auth] logout token revocation failed', { userId, error: err.message })
  }
}

/**
 * Révoque un refresh token à partir du token seul (cookie de logout).
 * Décode l'ID utilisateur depuis le token puis retire le token de l'allowlist.
 * Silencieux : un token absent/invalide n'empêche pas la déconnexion.
 *
 * @param {string} refreshToken
 */
async function revokeRefreshToken(refreshToken) {
  if (!refreshToken) return
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET, { algorithms: ['HS256'] })
    await logout(decoded.id, refreshToken)
  } catch {
    // Token expiré/invalide : rien à révoquer côté serveur, on ignore.
  }
}

// ── Inscription ───────────────────────────────────────────────────────────────

/**
 * Crée un nouvel utilisateur local.
 *
 * @param {{ email, password, firstName, lastName, role? }} userData
 * @returns {Promise<object>} Utilisateur créé (sans passwordHash)
 * @throws {AppError} 409 si l'email est déjà pris
 */
async function register({ email, password, firstName, lastName, role = 'employee' }) {
  if (!email || !password || !firstName || !lastName) {
    throw AppError.badRequest('email, password, firstName et lastName sont requis')
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() }).lean()
  if (existing) {
    throw AppError.conflict('Cet email est déjà utilisé', 'EMAIL_TAKEN')
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

  const user = await User.create({
    email:       email.toLowerCase().trim(),
    passwordHash,
    firstName:   firstName.trim(),
    lastName:    lastName.trim(),
    role,
    authSource:  'local',
  })

  const { passwordHash: _, ...userObj } = user.toObject()
  return userObj
}

// ── Validation credentials ────────────────────────────────────────────────────

/**
 * Vérifie les identifiants email/password d'un utilisateur local.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} Utilisateur lean (sans passwordHash)
 * @throws {AppError} 401 si identifiants invalides ou compte inactif
 */
async function validateUser(email, password) {
  if (!email || !password) {
    throw AppError.unauthorized('Identifiants requis')
  }

  const user = await User.findOne({
    email:      email.toLowerCase().trim(),
    authSource: 'local',
  })
    .select('+passwordHash')
    .lean()

  if (!user || !user.passwordHash) {
    throw AppError.unauthorized('Identifiants invalides', 'INVALID_CREDENTIALS')
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    throw AppError.unauthorized('Identifiants invalides', 'INVALID_CREDENTIALS')
  }

  if (!user.isActive) {
    throw AppError.unauthorized('Ce compte est désactivé', 'ACCOUNT_DISABLED')
  }

  const { passwordHash: _, ...userObj } = user
  return userObj
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
  generateTokens,
  refreshAccessToken,
  login,
  logout,
  revokeRefreshToken,
  register,
  validateUser,
  updatePreferences,
}
