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

    // 1. Charger l'évaluation courante avec sa campagne ET son formulaire
    //    (le formulaire courant porte la curation carryPrevious + la lignée
    //    parentQuestionId nécessaires à la résolution par question).
    const evaluation = await Evaluation.findById(req.params.id)
      .populate('campaignId', 'name startDate enableN1Context n1VisibleToEmployee previousCampaignId')
      .populate('formId', 'questions')
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
    } else if (role === 'manager') {
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
    let n1Evals = []

    const populateEval = q => q
      .populate('campaignId', 'name startDate endDate')
      .populate('formId',     'title formType questions')
      .lean()

    // 4a. Stratégie explicite : previousCampaignId renseigné → TOUTES les évals
    //     de la personne dans cette campagne (multi-formulaires).
    if (campaign?.previousCampaignId) {
      n1Evals = await populateEval(Evaluation.find({
        evaluateeId,
        campaignId: campaign.previousCampaignId,
        status:     { $in: N1_VALID_STATUSES },
      }))
    }

    // 4b. Fallback auto : campagne clôturée la plus récente avant startDate.
    //     On prend toutes les évals de la personne issues de CETTE campagne.
    if (!n1Evals.length) {
      const prevCampaigns = await Campaign.find(
        { status: { $in: ['closed', 'archived'] }, endDate: { $lt: campaign?.startDate } },
        '_id'
      ).lean()

      if (prevCampaigns.length > 0) {
        const all = await populateEval(Evaluation.find({
          evaluateeId,
          campaignId: { $in: prevCampaigns.map(c => c._id) },
          status:     { $in: N1_VALID_STATUSES },
        }).sort({ updatedAt: -1 }))

        if (all.length) {
          const targetCid = String(all[0].campaignId?._id ?? all[0].campaignId)
          n1Evals = all.filter(e => String(e.campaignId?._id ?? e.campaignId) === targetCid)
        }
      }
    }

    if (!n1Evals.length) return res.status(204).end()

    const primary = n1Evals[0]

    // 5. Agrégation des réponses et questions sur TOUS les formulaires de l'an
    //    dernier (un évalué a pu remplir plusieurs formulaires). Les ids de
    //    question sont uniques par formulaire → pas de collision à l'agrégation.
    const prevAnswerByQid = new Map()
    const prevQuestionById = new Map()
    for (const ev of n1Evals) {
      for (const a of ev.answers ?? []) {
        if (!prevAnswerByQid.has(a.questionId)) prevAnswerByQid.set(a.questionId, a.value)
      }
      for (const q of ev.formId?.questions ?? []) {
        if (!prevQuestionById.has(q.id)) prevQuestionById.set(q.id, q)
      }
    }

    // Bloc legacy (N1ImportView) : objectifs / n1_import sur l'ensemble.
    const objectivesAnswers = []
    for (const ev of n1Evals) {
      const qs = ev.formId?.questions ?? []
      const relevant = new Set(qs.filter(q => q.phase === 'objectives' || q.type === 'n1_import').map(q => q.id))
      for (const a of ev.answers ?? []) {
        if (!relevant.has(a.questionId)) continue
        const q = qs.find(q => q.id === a.questionId)
        objectivesAnswers.push({ questionId: a.questionId, questionLabel: q?.label ?? a.questionId, questionType: q?.type, value: a.value })
      }
    }

    // 5bis. Résolution PAR QUESTION pour l'accordéon « Édition précédente ».
    //   Pour chaque question du form COURANT marquée carryPrevious, on retrouve
    //   la réponse via la lignée parentQuestionId (fallback : même id), parmi
    //   TOUTES les réponses agrégées de l'an dernier.
    const currentQuestions = evaluation.formId?.questions ?? []
    const byQuestion = {}
    for (const cq of currentQuestions) {
      if (!cq.carryPrevious) continue
      const prevQid = cq.parentQuestionId || cq.id
      if (!prevAnswerByQid.has(prevQid)) continue
      const prevQ = prevQuestionById.get(prevQid)
      byQuestion[cq.id] = {
        value: prevAnswerByQid.get(prevQid),
        label: prevQ?.label ?? cq.label ?? null,
        type:  prevQ?.type  ?? null,
        scale: prevQ?.scale ?? null,
      }
    }

    // 6. Payload (pas d'evaluateeComment/disagreementFlag pour employee)
    const isEmployee = role === 'employee'
    const payload = {
      n1Campaign: {
        id:        primary.campaignId?._id,
        name:      primary.campaignId?.name,
        startDate: primary.campaignId?.startDate,
        endDate:   primary.campaignId?.endDate,
      },
      reviewerScore:    primary.reviewerScore    ?? null,
      reviewerComment:  primary.reviewerComment  ?? null,
      nextYearObjectives: primary.nextYearObjectives ?? null,
      objectiveRatings: primary.objectiveRatings  ?? {},
      status:           primary.status,
      objectivesAnswers,
      byQuestion,
      formTitle:  primary.formId?.title    ?? null,
      formType:   primary.formId?.formType ?? null,
      ...(isEmployee ? {} : {
        evaluateeComment: primary.evaluateeComment ?? null,
        disagreementFlag: primary.disagreementFlag  ?? false,
      }),
    }

    res.json(payload)
  } catch (err) {
    next(err)
  }
}

module.exports = { handleN1Context }
