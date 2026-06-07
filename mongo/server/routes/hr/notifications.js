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
const { notifyMany } = require('../../services/mailNotificationService')

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

    // If no campaignId, target all active campaigns
    let campaigns
    if (campaignId) {
      const campaign = await Campaign.findById(campaignId).lean()
      if (!campaign) {
        return res.status(404).json({ error: 'Campagne introuvable' })
      }
      if (campaign.status !== 'active') {
        return res.status(400).json({ error: 'La campagne n\'est pas active' })
      }
      campaigns = [campaign]
    } else {
      campaigns = await Campaign.find({ status: 'active' }, '_id name').lean()
      if (campaigns.length === 0) {
        return res.json({ sent: 0, skipped: 0, campaignCount: 0 })
      }
    }

    const campaignIds = campaigns.map(c => c._id)
    const campaignMap = Object.fromEntries(campaigns.map(c => [c._id.toString(), c.name]))

    // Évaluations de toutes les campagnes ciblées correspondant aux statuts ciblés
    const evaluations = await Evaluation.find(
      { campaignId: { $in: campaignIds }, status: { $in: targetStatuses } },
      'evaluateeId evaluatorId campaignId',
    ).lean()

    if (evaluations.length === 0) {
      return res.json({ sent: 0, skipped: 0, campaignCount: campaigns.length })
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
      return res.json({ sent: 0, skipped: 0, campaignCount: campaigns.length })
    }

    // Charger les utilisateurs actifs avec les champs nécessaires à notify()
    const users = await User.find(
      { _id: { $in: recipientIds }, isActive: true },
      'email firstName lastName role notificationPrefs',
    ).lean()

    // Destinataires avec email valide vs sans email / inactifs
    const validUsers = users.filter(u => u.email && u.email.includes('@'))
    const skipped    = recipientIds.length - validUsers.length

    // Use campaign name for single campaign, generic label for multi
    const campaignName = campaigns.length === 1
      ? campaigns[0].name
      : `${campaigns.length} campagnes actives`

    const sent = await notifyMany('bulkReminder', validUsers, {
      campaignName,
      message,
    })

    return res.json({
      sent,
      skipped: skipped + (validUsers.length - sent),
      campaignCount: campaigns.length,
      ...(campaignId ? { campaignId } : {}),
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
