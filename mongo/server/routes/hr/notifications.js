'use strict'

// =============================================================================
// routes/hr/notifications.js — Envoi groupé de rappels par email
//
// POST /api/hr/notifications/bulk-remind
//   Envoie un rappel à tous les participants d'une campagne active dont le
//   statut d'évaluation correspond aux filtres (targetStatuses / targetRoles).
//   Les destinataires sont dédupliqués : un user peut être à la fois évalué
//   et évaluateur sur des évaluations différentes.
//
// Rôles autorisés : admin, hr (déclaré dans index.js via authGuard)
// =============================================================================

const express = require('express')
const { Campaign }   = require('../../models/Campaign')
const { Evaluation } = require('../../models/Evaluation')
const User           = require('../../models/User')
const { notifyMany } = require('../../services/notificationService')

const router = express.Router()

// POST /api/hr/notifications/bulk-remind
router.post('/bulk-remind', async (req, res, next) => {
  try {
    const {
      campaignId,
      targetStatuses = ['assigned', 'in_progress'],
      targetRoles    = ['employee', 'manager'],
      message,
    } = req.body

    if (!campaignId) {
      return res.status(400).json({ error: 'campaignId est requis' })
    }

    const campaign = await Campaign.findById(campaignId).lean()
    if (!campaign) {
      return res.status(404).json({ error: 'Campagne introuvable' })
    }
    if (campaign.status !== 'active') {
      return res.status(404).json({ error: 'La campagne n\'est pas active' })
    }

    // Évaluations de la campagne correspondant aux statuts ciblés
    const evaluations = await Evaluation.find(
      { campaignId, status: { $in: targetStatuses } },
      'evaluateeId evaluatorId',
    ).lean()

    if (evaluations.length === 0) {
      return res.json({ sent: 0, skipped: 0, campaignId })
    }

    // Collecter les IDs destinataires selon les rôles ciblés (Set = dédup automatique)
    const recipientIdSet = new Set()
    for (const ev of evaluations) {
      if (targetRoles.includes('employee') && ev.evaluateeId) {
        recipientIdSet.add(ev.evaluateeId.toString())
      }
      if (targetRoles.includes('manager') && ev.evaluatorId) {
        recipientIdSet.add(ev.evaluatorId.toString())
      }
    }

    const recipientIds = [...recipientIdSet]
    if (recipientIds.length === 0) {
      return res.json({ sent: 0, skipped: 0, campaignId })
    }

    // Charger les utilisateurs actifs avec les champs nécessaires à notify()
    const users = await User.find(
      { _id: { $in: recipientIds }, isActive: true },
      'email firstName lastName role notificationPrefs',
    ).lean()

    // Destinataires avec email valide vs sans email / inactifs
    const validUsers = users.filter(u => u.email && u.email.includes('@'))
    const skipped    = recipientIds.length - validUsers.length

    const sent = await notifyMany('bulkReminder', validUsers, {
      campaignName: campaign.name,
      message,
    })

    return res.json({ sent, skipped: skipped + (validUsers.length - sent), campaignId })
  } catch (err) {
    next(err)
  }
})

module.exports = router
