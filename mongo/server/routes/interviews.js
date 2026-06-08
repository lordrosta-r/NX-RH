'use strict'

// =============================================================================
// routes/interviews.js — /api/interviews
//
// GET  /api/interviews?campaignId=&evaluateeId=
//   Retourne l'entretien (Interview) pour un duo (campagne, évaluatee),
//   avec toutes les évaluations peuplées.
//
// PATCH /api/interviews/synthesis
//   Enregistre le score et le commentaire du manager (synthèse d'entretien).
//   body : { campaignId, evaluateeId, reviewerScore?, reviewerComment }
//
// PATCH /api/interviews/state
//   Sauvegarde partielle de l'état éditorial de l'entretien.
//   body : { campaignId, evaluateeId, discussion?, objectivesReview?, nextYearObjectives?, synthesis? }
//
// POST /api/interviews/sign
//   Enregistre la signature d'un participant (évalué ou manager).
//   body : { campaignId, evaluateeId, role, dataUrl }
//
// POST /api/interviews/disagreement
//   Enregistre un désaccord formel de l'évalué.
//   body : { campaignId, evaluateeId, reason }
//
// RBAC :
//   - admin/hr : accès total
//   - manager  : seulement si l'évaluatee est dans sa visibilité
//   - employee : GET autorisé sur lui-même ; PATCH /state + POST /sign autorisés
//               sur lui-même ; PATCH /synthesis et POST /disagreement → selon rôle
// =============================================================================

const express  = require('express')
const mongoose = require('mongoose')
const { getInterview, saveSynthesis, saveState, addSignature, flagDisagreement } = require('../services/interviewService')
const { getVisibleUserIds } = require('../services/managerVisibility')
const { Campaign, Interview, Event, Evaluation } = require('../models')

const router = express.Router()

/**
 * GET /api/interviews?campaignId=&evaluateeId=
 */
router.get('/', async (req, res, next) => {
  try {
    const { campaignId, evaluateeId } = req.query

    if (!campaignId || !mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({ error: 'campaignId valide requis' })
    }
    if (!evaluateeId || !mongoose.isValidObjectId(evaluateeId)) {
      return res.status(400).json({ error: 'evaluateeId valide requis' })
    }

    const role = req.user.role
    const uid  = req.user.id.toString()

    // RBAC
    if (role === 'employee') {
      if (uid !== evaluateeId) {
        return res.status(403).json({ error: 'Accès refusé' })
      }
    } else if (role === 'manager') {
      const campaign = await Campaign.findById(campaignId, 'extendedVisibility').lean()
      const visibleIds = await getVisibleUserIds(req.user.id, campaign)
      if (!visibleIds.includes(evaluateeId)) {
        return res.status(403).json({ error: 'Accès refusé' })
      }
    }
    // admin / hr : accès total

    const interview = await getInterview(campaignId, evaluateeId)
    if (!interview) {
      return res.status(404).json({ error: 'Entretien introuvable' })
    }

    res.json(interview)
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/interviews/team-objectives — Suivi des objectifs de l'équipe.
 * Manager : objectifs des entretiens de son équipe ; RH/admin : tous.
 * Retourne, par collaborateur, les objectifs N+1 et le bilan des objectifs passés.
 */
router.get('/team-objectives', async (req, res, next) => {
  try {
    const role = req.user.role
    const uid  = req.user.id.toString()

    const filter = {}
    if (role === 'manager') {
      filter.managerId = uid
    } else if (!['admin', 'hr'].includes(role)) {
      return res.status(403).json({ error: 'Accès refusé' })
    }

    const interviews = await Interview.find(filter)
      .populate('evaluateeId', 'firstName lastName email')
      .populate('campaignId', 'name startDate')
      .select('evaluateeId campaignId nextYearObjectives objectivesReview scheduledAt')
      .sort({ updatedAt: -1 })
      .lean()

    const data = interviews.map(i => ({
      evaluatee: i.evaluateeId,
      campaign: i.campaignId,
      nextYearObjectives: (i.nextYearObjectives || []).map(o => o.text).filter(Boolean),
      objectivesReview: i.objectivesReview || [],
      scheduledAt: i.scheduledAt || null,
    }))

    res.json({ data })
  } catch (err) {
    next(err)
  }
})

/**
 * PATCH /api/interviews/synthesis
 * body : { campaignId, evaluateeId, reviewerScore (number|null)?, reviewerComment (string) }
 */
router.patch('/synthesis', async (req, res, next) => {
  try {
    const { campaignId, evaluateeId, reviewerScore, reviewerComment } = req.body

    // ── Validation ──────────────────────────────────────────────────────────
    if (!campaignId || !mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({ error: 'campaignId valide requis' })
    }
    if (!evaluateeId || !mongoose.isValidObjectId(evaluateeId)) {
      return res.status(400).json({ error: 'evaluateeId valide requis' })
    }
    if (reviewerScore !== undefined && reviewerScore !== null) {
      if (typeof reviewerScore !== 'number' || reviewerScore < 0 || reviewerScore > 100) {
        return res.status(400).json({ error: 'reviewerScore doit être un nombre entre 0 et 100' })
      }
    }
    if (reviewerComment !== undefined) {
      if (typeof reviewerComment !== 'string' || reviewerComment.length > 5000) {
        return res.status(400).json({ error: 'reviewerComment invalide (max 5000 chars)' })
      }
    }

    // ── RBAC ────────────────────────────────────────────────────────────────
    const role = req.user.role
    const uid  = req.user.id.toString()

    if (role === 'employee') {
      return res.status(403).json({ error: 'Accès refusé' })
    }
    if (role === 'manager') {
      const campaign = await Campaign.findById(campaignId, 'extendedVisibility').lean()
      const visibleIds = await getVisibleUserIds(req.user.id, campaign)
      if (!visibleIds.includes(evaluateeId)) {
        return res.status(403).json({ error: 'Accès refusé' })
      }
    }
    // admin / hr : accès total

    const result = await saveSynthesis(campaignId, evaluateeId, {
      reviewerScore,
      reviewerComment: reviewerComment ?? '',
      reviewedBy: uid,
    })

    res.json({ ok: true, evaluationId: result.evaluationId })
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message })
    }
    next(err)
  }
})

// ── Helper RBAC mutualisé ──────────────────────────────────────────────────────
/**
 * Vérifie que l'utilisateur courant peut accéder à l'évaluatee donné.
 * - admin/hr : toujours autorisé
 * - manager  : évaluatee dans getVisibleUserIds
 * - employee : uniquement lui-même
 *
 * @returns {boolean} true si accès autorisé
 */
async function canAccessEvaluatee(req, campaignId, evaluateeId) {
  const role = req.user.role
  const uid  = req.user.id.toString()

  if (role === 'admin' || role === 'hr') return true

  if (role === 'manager') {
    const campaign = await Campaign.findById(campaignId, 'extendedVisibility').lean()
    const visibleIds = await getVisibleUserIds(req.user.id, campaign)
    return visibleIds.includes(evaluateeId)
  }

  // employee
  return uid === evaluateeId
}

/**
 * PATCH /api/interviews/state
 * body : { campaignId, evaluateeId, discussion?, objectivesReview?, nextYearObjectives?, synthesis? }
 */
router.patch('/state', async (req, res, next) => {
  try {
    const { campaignId, evaluateeId, discussion, objectivesReview, nextYearObjectives, synthesis } = req.body

    if (!campaignId || !mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({ error: 'campaignId valide requis' })
    }
    if (!evaluateeId || !mongoose.isValidObjectId(evaluateeId)) {
      return res.status(400).json({ error: 'evaluateeId valide requis' })
    }

    const allowed = await canAccessEvaluatee(req, campaignId, evaluateeId)
    if (!allowed) return res.status(403).json({ error: 'Accès refusé' })

    await saveState(campaignId, evaluateeId, { discussion, objectivesReview, nextYearObjectives, synthesis })

    res.json({ ok: true })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
})

/**
 * POST /api/interviews/sign
 * body : { campaignId, evaluateeId, role, dataUrl }
 */
router.post('/sign', async (req, res, next) => {
  try {
    const { campaignId, evaluateeId, dataUrl } = req.body

    if (!campaignId || !mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({ error: 'campaignId valide requis' })
    }
    if (!evaluateeId || !mongoose.isValidObjectId(evaluateeId)) {
      return res.status(400).json({ error: 'evaluateeId valide requis' })
    }
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
      return res.status(400).json({ error: "dataUrl invalide (doit être un data URI image)" })
    }

    const allowed = await canAccessEvaluatee(req, campaignId, evaluateeId)
    if (!allowed) return res.status(403).json({ error: 'Accès refusé' })

    // Gating : l'entretien ne peut être signé que s'il a été programmé sur le
    // calendrier (un rendez-vous a été fixé par le manager/RH).
    const scheduled = await Interview.findOne({ campaignId, evaluateeId }).select('scheduledAt').lean()
    if (!scheduled?.scheduledAt) {
      return res.status(409).json({ error: "L'entretien doit d'abord être programmé sur le calendrier" })
    }

    // SÉCURITÉ (anti-forgery) : le slot de signature est DÉDUIT du rôle réel de
    // l'appelant, jamais accepté depuis le body. L'évalué ne peut signer que le
    // slot 'evaluatee' ; un employé ne peut pas apposer la signature manager.
    const isEvaluatee = req.user.id.toString() === evaluateeId.toString()
    if (!isEvaluatee && req.user.role === 'employee') {
      return res.status(403).json({ error: 'Accès refusé' })
    }
    const role = isEvaluatee ? 'evaluatee' : 'manager'

    const interview = await addSignature(campaignId, evaluateeId, { role, dataUrl })

    res.json({ ok: true, status: interview.status })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
})

/**
 * PATCH /api/interviews/schedule — Programmer le rendez-vous d'entretien.
 * body : { campaignId, evaluateeId, scheduledAt (ISO), location? }
 *
 * Réservé au manager (de l'évalué) / RH / admin — jamais l'évalué lui-même.
 * Précondition : l'évaluation que le manager remplit doit être terminée
 * (statut au moins 'submitted'). Crée aussi un événement sur le calendrier.
 */
router.patch('/schedule', async (req, res, next) => {
  try {
    const { campaignId, evaluateeId, scheduledAt, location } = req.body

    if (!campaignId || !mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({ error: 'campaignId valide requis' })
    }
    if (!evaluateeId || !mongoose.isValidObjectId(evaluateeId)) {
      return res.status(400).json({ error: 'evaluateeId valide requis' })
    }
    const when = new Date(scheduledAt)
    if (!scheduledAt || Number.isNaN(when.getTime())) {
      return res.status(400).json({ error: 'scheduledAt (date) valide requis' })
    }
    if (location !== undefined && (typeof location !== 'string' || location.length > 200)) {
      return res.status(400).json({ error: 'location invalide (max 200 car.)' })
    }

    // L'évalué ne programme pas son propre entretien.
    if (req.user.id.toString() === evaluateeId.toString()) {
      return res.status(403).json({ error: "Vous ne pouvez pas programmer votre propre entretien" })
    }
    const allowed = await canAccessEvaluatee(req, campaignId, evaluateeId)
    if (!allowed) return res.status(403).json({ error: 'Accès refusé' })

    const interview = await Interview.findOne({ campaignId, evaluateeId })
    if (!interview) return res.status(404).json({ error: 'Entretien introuvable' })

    // Précondition : l'évaluation remplie par le manager doit être soumise.
    // « L'admin/manager ne peut programmer que s'il a terminé de tout remplir. »
    const evals = await Evaluation.find({ _id: { $in: interview.evaluationIds } }).select('status evaluatorId').lean()
    const managerEvals = evals.filter(e => e.evaluatorId?.toString() !== evaluateeId.toString())
    const unfinished = managerEvals.some(e => ['assigned', 'in_progress'].includes(e.status))
    if (managerEvals.length === 0 || unfinished) {
      return res.status(409).json({ error: "Terminez d'abord de remplir l'évaluation avant de programmer l'entretien" })
    }

    interview.scheduledAt       = when
    interview.scheduledLocation = location || ''
    interview.scheduledBy       = req.user.id
    await interview.save()

    // Événement calendrier (type 'interview') visible par les participants.
    // Titre personnalisé : « Entretien de <Prénom Nom> — <campagne> ».
    const [campaign, evaluatee] = await Promise.all([
      Campaign.findById(campaignId).select('name').lean(),
      require('../models').User.findById(evaluateeId).select('firstName lastName').lean(),
    ])
    const evaluateeName = evaluatee
      ? `${evaluatee.firstName} ${evaluatee.lastName}`.trim()
      : ''
    await Event.create({
      title: evaluateeName
        ? `Entretien de ${evaluateeName} — ${campaign?.name || 'campagne'}`
        : `Entretien — ${campaign?.name || 'campagne'}`,
      description: location ? `Lieu : ${location}` : '',
      location: location || '',
      date: when,
      type: 'interview',
      campaignId,
      audience: ['manager', 'employee'],
      createdBy: req.user.id,
    })

    res.json({ ok: true, scheduledAt: interview.scheduledAt, location: interview.scheduledLocation })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
})

/**
 * POST /api/interviews/disagreement
 * body : { campaignId, evaluateeId, reason }
 */
router.post('/disagreement', async (req, res, next) => {
  try {
    const { campaignId, evaluateeId, reason } = req.body

    if (!campaignId || !mongoose.isValidObjectId(campaignId)) {
      return res.status(400).json({ error: 'campaignId valide requis' })
    }
    if (!evaluateeId || !mongoose.isValidObjectId(evaluateeId)) {
      return res.status(400).json({ error: 'evaluateeId valide requis' })
    }

    const allowed = await canAccessEvaluatee(req, campaignId, evaluateeId)
    if (!allowed) return res.status(403).json({ error: 'Accès refusé' })

    await flagDisagreement(campaignId, evaluateeId, { by: req.user.id, reason })

    res.json({ ok: true })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
})

module.exports = router
