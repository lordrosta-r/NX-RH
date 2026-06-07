'use strict'

// =============================================================================
// mutations/notifications.js — Notifications internes sur changement de statut
// =============================================================================

const { Campaign, User } = require('../../../models')
const { notify }               = require('../../../services/mailNotificationService')
const { notify: notifyInApp }  = require('../../../services/notificationHelper')

/**
 * Envoie les notifications email + in-app suite à une transition de statut.
 * Fire-and-forget : toute erreur est silencieuse pour ne jamais bloquer la réponse HTTP.
 */
async function _sendStatusNotifications(evaluation, newStatus) {
  try {
    const campaign = evaluation.campaignId
      ? await Campaign.findById(evaluation.campaignId, 'name').lean()
      : null
    const cName = campaign?.name || ''

    if (newStatus === 'submitted') {
      const evaluatee = await User.findById(evaluation.evaluateeId, 'managerId firstName').lean()
      if (evaluatee?.managerId) {
        const manager = await User.findById(evaluatee.managerId).lean()
        if (manager) await notify('evaluationSubmitted', manager, { evaluatorName: evaluatee.firstName, campaignName: cName })
      }
      notifyInApp(evaluation.evaluatorId, 'eval_submitted', 'Évaluation soumise', cName).catch(() => {})

    } else if (newStatus === 'reviewed') {
      const evaluatee = await User.findById(evaluation.evaluateeId).lean()
      if (evaluatee) await notify('managerActionRequired', evaluatee, { campaignName: cName })
      notifyInApp(evaluation.evaluateeId, 'eval_reviewed', 'Évaluation complétée', cName).catch(() => {})

    } else if (newStatus === 'disputed') {
      // Litige déposé par l'évalué → alerte RH/admin (arbitrage requis) + manager.
      const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] }, isActive: true }).select('_id').lean()
      for (const hrUser of hrUsers) {
        notifyInApp(hrUser._id, 'system', 'Litige sur une évaluation', `Un désaccord a été signalé — arbitrage requis (${cName})`, `/evaluations/${evaluation._id}`).catch(() => {})
      }
      const evaluatee = await User.findById(evaluation.evaluateeId, 'managerId').lean()
      if (evaluatee?.managerId) {
        notifyInApp(evaluatee.managerId, 'system', 'Litige sur une évaluation', `L'évalué a contesté l'évaluation (${cName})`, `/evaluations/${evaluation._id}`).catch(() => {})
      }

    } else if (newStatus === 'signed_evaluatee') {
      const evaluatee = await User.findById(evaluation.evaluateeId, 'managerId firstName').lean()
      if (evaluatee?.managerId) {
        const manager = await User.findById(evaluatee.managerId).lean()
        if (manager) await notify('evaluationSubmitted', manager, { evaluatorName: evaluatee.firstName, campaignName: cName })
      }
      notifyInApp(evaluation.evaluatorId, 'eval_signed_evaluatee', "Évaluation signée par l'évalué", cName).catch(() => {})

    } else if (newStatus === 'signed_manager') {
      const { notifyMany } = require('../../../services/mailNotificationService')
      const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] }, isActive: true }).lean()
      if (hrUsers.length) await notifyMany('evaluationSubmitted', hrUsers, { evaluatorName: 'Manager', campaignName: cName })
      for (const hrUser of hrUsers) {
        notifyInApp(hrUser._id, 'eval_signed_manager', 'Évaluation signée par le manager', cName).catch(() => {})
      }

    } else if (newStatus === 'signed_hr') {
      const evaluatee = await User.findById(evaluation.evaluateeId).lean()
      if (evaluatee) await notify('managerActionRequired', evaluatee, { campaignName: cName })
      if (evaluatee?.managerId) {
        const manager = await User.findById(evaluatee.managerId).lean()
        if (manager) await notify('evaluationSubmitted', manager, { evaluatorName: evaluatee.firstName, campaignName: cName })
      }
      notifyInApp(evaluation.evaluateeId, 'eval_signed_hr', 'Évaluation signée par le RH', cName).catch(() => {})
    }
  } catch (_) { /* notification failure must never block the response */ }
}

module.exports = { _sendStatusNotifications }
