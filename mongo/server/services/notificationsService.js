'use strict'

// =============================================================================
// services/notificationsService.js — CRUD notifications in-app
//
// Adaptée au schéma Notification existant :
//   userId, type, title, body, link, read, priority, createdAt
//
// Note: le champ "message" de l'API est mappé sur "body" dans le modèle.
// =============================================================================

const mongoose     = require('mongoose')
const Notification = require('../models/Notification')
const AppError     = require('../utils/AppError')

// ─── Lecture ──────────────────────────────────────────────────────────────────

/**
 * Récupère les notifications d'un utilisateur avec pagination.
 *
 * @param {string|ObjectId} userId
 * @param {{ page?, limit?, unreadOnly? }} options
 * @returns {Promise<{ data, total, unreadCount, page, limit }>}
 */
async function getNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
  const safeLimit = Math.min(parseInt(limit, 10) || 20, 100)
  const safePage  = Math.max(parseInt(page,  10) || 1,  1)
  const skip      = (safePage - 1) * safeLimit

  const filter = { userId }
  if (unreadOnly) filter.read = false

  const [data, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId, read: false }),
  ])

  return { data, total, unreadCount, page: safePage, limit: safeLimit }
}

/**
 * Retourne le nombre de notifications non lues d'un utilisateur.
 *
 * @param {string|ObjectId} userId
 * @returns {Promise<number>}
 */
async function getUnreadCount(userId) {
  return Notification.countDocuments({ userId, read: false })
}

// ─── Marquage ─────────────────────────────────────────────────────────────────

/**
 * Marque une notification comme lue.
 * Vérifie que la notification appartient à userId.
 *
 * @param {string} notificationId
 * @param {string|ObjectId} userId
 * @returns {Promise<{ id, read }>}
 * @throws {AppError} 400/404/403
 */
async function markAsRead(notificationId, userId) {
  if (!mongoose.isValidObjectId(notificationId)) {
    throw AppError.badRequest('ID de notification invalide')
  }

  const notification = await Notification.findById(notificationId)
  if (!notification) {
    throw AppError.notFound('Notification introuvable')
  }
  if (!notification.userId.equals(userId)) {
    throw AppError.forbidden('Accès refusé')
  }

  notification.read = true
  await notification.save()
  return { id: notification._id, read: notification.read }
}

/**
 * Marque toutes les notifications non lues d'un utilisateur comme lues.
 *
 * @param {string|ObjectId} userId
 * @returns {Promise<{ modifiedCount }>}
 */
async function markAllAsRead(userId) {
  const result = await Notification.updateMany(
    { userId, read: false },
    { $set: { read: true } },
  )
  return { modifiedCount: result.modifiedCount }
}

// ─── Création ─────────────────────────────────────────────────────────────────

/**
 * Crée une nouvelle notification.
 * "message" est accepté comme alias de "body" pour rester compatible
 * avec l'API décrite dans les tâches.
 *
 * @param {{ userId, type, title, message?, body?, data?, link?, priority? }} params
 * @returns {Promise<object>} Notification créée (lean)
 * @throws {AppError} 400 si champs obligatoires manquants
 */
async function createNotification({ userId, type, title, message, body, data = {}, link, priority = 'medium' }) {
  if (!userId || !type || !title) {
    throw AppError.badRequest('userId, type et title sont requis')
  }

  const bodyText = body || message || ''

  const notification = await Notification.create({
    userId,
    type,
    title,
    body:     bodyText,
    link:     link || null,
    priority,
    read:     false,
  })

  return notification.toObject()
}

// ─── Suppression ─────────────────────────────────────────────────────────────

/**
 * Supprime une notification.
 * Vérifie que la notification appartient à userId.
 *
 * @param {string} notificationId
 * @param {string|ObjectId} userId
 * @returns {Promise<void>}
 * @throws {AppError} 400/404/403
 */
async function deleteNotification(notificationId, userId) {
  if (!mongoose.isValidObjectId(notificationId)) {
    throw AppError.badRequest('ID de notification invalide')
  }

  const notification = await Notification.findById(notificationId).lean()
  if (!notification) {
    throw AppError.notFound('Notification introuvable')
  }
  if (!notification.userId.equals(userId)) {
    throw AppError.forbidden('Accès refusé')
  }

  await Notification.deleteOne({ _id: notificationId })
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
  deleteNotification,
}
