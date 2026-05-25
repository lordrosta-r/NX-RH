'use strict'

// =============================================================================
// mutations/create.js — POST / : Créer une évaluation individuelle
// =============================================================================

const mongoose = require('mongoose')
const { Evaluation, Form, Campaign } = require('../../../models')
const { ADMIN_ROLES, REQUEST_FORM_TYPES } = require('../../../config/constants')
const { notify: notifyInApp } = require('../../../services/notificationHelper')

/**
 * POST /
 * • admin/hr : création complète (campaignId, formId, evaluatorId, evaluateeId requis)
 * • autres rôles : demande standalone — formType doit être dans REQUEST_FORM_TYPES,
 *   evaluateeId et evaluatorId sont forcés à soi-même, campaignId est forcé à null.
 */
async function handleCreate(req, res, next) {
  try {
    const isAdminHr = ADMIN_ROLES.includes(req.user.role)

    if (!isAdminHr) {
      const { formId } = req.body
      if (!formId || !mongoose.isValidObjectId(formId)) {
        return res.status(400).json({ error: 'formId valide requis' })
      }

      const form = await Form.findById(formId).select('formType').lean()
      if (!form) return res.status(404).json({ error: 'Formulaire introuvable' })

      if (!REQUEST_FORM_TYPES.includes(form.formType)) {
        return res.status(403).json({ error: 'Accès interdit pour ce type de formulaire' })
      }

      // Forcer la demande en standalone : évaluateur = évalué = soi-même, pas de campagne
      req.body.evaluateeId = req.user._id.toString()
      req.body.evaluatorId = req.user._id.toString()
      req.body.campaignId  = null
    }

    const { campaignId, formId, evaluatorId, evaluateeId } = req.body

    if (isAdminHr) {
      if (!campaignId || !formId || !evaluatorId || !evaluateeId) {
        return res.status(400).json({ error: 'campaignId, formId, evaluatorId et evaluateeId sont requis' })
      }
      for (const [key, val] of Object.entries({ campaignId, formId, evaluatorId, evaluateeId })) {
        if (!mongoose.isValidObjectId(val)) {
          return res.status(400).json({ error: `${key} invalide` })
        }
      }
    }

    // Geler le formulaire si pas encore figé
    await Form.findByIdAndUpdate(formId, { $set: { frozenAt: new Date() } }, { timestamps: false })
      .where({ frozenAt: null })

    const campaign  = campaignId ? await Campaign.findById(campaignId, 'endDate name').lean() : null
    const expiresAt = campaign?.endDate
      ? new Date(new Date(campaign.endDate).getTime() + 30 * 24 * 60 * 60 * 1000)
      : null

    const evaluation = await Evaluation.create({ campaignId: campaignId || null, formId, evaluatorId, evaluateeId, expiresAt })
    res.status(201).json({ id: evaluation._id })

    // Notification in-app (fire-and-forget)
    notifyInApp(
      evaluateeId,
      'eval_assigned',
      'Évaluation assignée',
      campaign?.name || '',
      `/evaluations/${evaluation._id}`,
    ).catch(() => {})
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Cette évaluation existe déjà' })
    }
    next(err)
  }
}

module.exports = { handleCreate }
