'use strict'

// =============================================================================
// routes/evaluations/n1Context.js
//
// GET /api/evaluations/:id/n1-context
//
// Retourne les données de l'évaluation N-1 de l'évaluatee pour affichage
// contextuel pendant la saisie de l'évaluation courante.
//
// Stratégie de lookup :
//   1. campaign.previousCampaignId renseigné → lookup direct
//   2. Fallback : dernière éval validée de l'évaluatee avant campaign.startDate
//   3. campaign.enableN1Context === false → 204 No Content
// =============================================================================

const mongoose = require('mongoose')
const { Evaluation, Campaign } = require('../../models')
const { getVisibleUserIds }    = require('../../services/managerVisibility')

const N1_VALID_STATUSES = ['validated', 'signed_hr', 'signed_manager', 'reviewed']

async function handleN1Context(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    // 1. Charger l'évaluation courante avec sa campagne
    const evaluation = await Evaluation.findById(req.params.id)
      .populate('campaignId', 'name startDate enableN1Context n1VisibleToEmployee previousCampaignId')
      .lean()

    if (!evaluation) return res.status(404).json({ error: 'Évaluation introuvable' })

    const uid      = req.user.id.toString()
    const role     = req.user.role
    const campaign = evaluation.campaignId

    // 2. RBAC
    if (role === 'employee') {
      const isOwn =
        evaluation.evaluatorId?.toString() === uid ||
        evaluation.evaluateeId?.toString() === uid
      if (!isOwn) return res.status(403).json({ error: 'Accès refusé' })
      if (campaign?.n1VisibleToEmployee === false) return res.status(204).end()
    } else if (role === 'manager' || role === 'director') {
      const visibleIds = await getVisibleUserIds(req.user.id, campaign)
      const eveeId = evaluation.evaluateeId?.toString()
      const evorId = evaluation.evaluatorId?.toString()
      if (
        !visibleIds.includes(eveeId) && !visibleIds.includes(evorId) &&
        uid !== eveeId && uid !== evorId
      ) {
        return res.status(403).json({ error: 'Accès refusé' })
      }
    }
    // admin / hr : accès total

    // 3. Feature activée ?
    if (campaign?.enableN1Context === false) return res.status(204).end()

    const evaluateeId = new mongoose.Types.ObjectId(evaluation.evaluateeId)
    let n1Eval = null

    // 4a. Stratégie explicite : previousCampaignId renseigné
    if (campaign?.previousCampaignId) {
      n1Eval = await Evaluation.findOne({
        evaluateeId,
        campaignId: campaign.previousCampaignId,
        status:     { $in: N1_VALID_STATUSES },
      })
        .populate('campaignId', 'name startDate endDate')
        .populate('formId',     'title formType questions')
        .lean()
    }

    // 4b. Fallback auto : dernière campagne clôturée avant startDate
    if (!n1Eval) {
      const prevCampaigns = await Campaign.find(
        { status: { $in: ['closed', 'archived'] }, endDate: { $lt: campaign?.startDate } },
        '_id'
      ).lean()

      if (prevCampaigns.length > 0) {
        n1Eval = await Evaluation.findOne({
          evaluateeId,
          campaignId: { $in: prevCampaigns.map(c => c._id) },
          status:     { $in: N1_VALID_STATUSES },
        })
          .sort({ updatedAt: -1 })
          .populate('campaignId', 'name startDate endDate')
          .populate('formId',     'title formType questions')
          .lean()
      }
    }

    if (!n1Eval) return res.status(204).end()

    // 5. Filtrer les réponses : phase objectives ou type n1_import uniquement
    const questions = n1Eval.formId?.questions ?? []
    const relevantQIds = new Set(
      questions
        .filter(q => q.phase === 'objectives' || q.type === 'n1_import')
        .map(q => q.id)
    )

    const objectivesAnswers = (n1Eval.answers ?? [])
      .filter(a => relevantQIds.has(a.questionId))
      .map(a => {
        const q = questions.find(q => q.id === a.questionId)
        return { questionId: a.questionId, questionLabel: q?.label ?? a.questionId, questionType: q?.type, value: a.value }
      })

    // 6. Payload (pas d'evaluateeComment/disagreementFlag pour employee)
    const isEmployee = role === 'employee'
    const payload = {
      n1Campaign: {
        id:        n1Eval.campaignId?._id,
        name:      n1Eval.campaignId?.name,
        startDate: n1Eval.campaignId?.startDate,
        endDate:   n1Eval.campaignId?.endDate,
      },
      score:            n1Eval.score            ?? null,
      reviewerComment:  n1Eval.reviewerComment  ?? null,
      nextObjectives:   n1Eval.nextObjectives    ?? null,
      objectiveRatings: n1Eval.objectiveRatings  ?? {},
      status:           n1Eval.status,
      objectivesAnswers,
      formTitle:  n1Eval.formId?.title    ?? null,
      formType:   n1Eval.formId?.formType ?? null,
      ...(isEmployee ? {} : {
        evaluateeComment: n1Eval.evaluateeComment ?? null,
        disagreementFlag: n1Eval.disagreementFlag  ?? false,
      }),
    }

    res.json(payload)
  } catch (err) {
    next(err)
  }
}

module.exports = { handleN1Context }
