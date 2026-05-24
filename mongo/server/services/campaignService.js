'use strict'

// =============================================================================
// services/campaignService.js — Logique métier des campagnes d'évaluation
// =============================================================================

const mongoose = require('mongoose')
const { Campaign, Evaluation, Form, CAMPAIGN_TRANSITIONS: VALID_TRANSITIONS } = require('../models')
const { notifyMany } = require('./notificationService')
const logger         = require('../utils/logger')

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeError(message, status) {
  const err = new Error(message)
  err.status = status
  return err
}

// ── Visibilité RBAC ───────────────────────────────────────────────────────────

/**
 * Vérifie si l'utilisateur a le droit de voir la campagne.
 * Fonctionne que createdBy soit populé (objet) ou non (ObjectId).
 * @returns {Promise<boolean>}
 */
async function checkCampaignVisibility(campaign, user) {
  const { role, _id: userId } = user
  if (role === 'admin' || role === 'hr') return true

  const isCreator = campaign.createdBy && campaign.createdBy._id
    ? campaign.createdBy._id.toString() === userId.toString()
    : campaign.createdBy?.toString() === userId.toString()

  const hasExtendedVisibility = campaign.extendedVisibility?.some(
    ev => ev.managerId?.toString() === userId.toString()
  )

  let hasEvaluation = false
  if (role === 'employee') {
    hasEvaluation = await Evaluation.exists({ campaignId: campaign._id, evaluateeId: userId })
  } else if (role === 'manager' || role === 'director') {
    hasEvaluation = await Evaluation.exists({ campaignId: campaign._id, evaluatorId: userId })
  }

  return isCreator || hasExtendedVisibility || hasEvaluation
}

// ── Génération des évaluations ─────────────────────────────────────────────────

/**
 * Génère (en upsert) les évaluations pour tous les utilisateurs ciblés.
 * @returns {Promise<number>} nombre d'évaluations créées
 */
async function generateEvaluationsForCampaign(campaign) {
  let userFilter = { isActive: true }
  const { scopeType, ids } = campaign.targetScope || {}

  if (scopeType === 'department' && ids?.length) {
    userFilter.department = { $in: ids }
  } else if (scopeType === 'sector' && ids?.length) {
    userFilter.sectorId = { $in: ids }
  } else if (scopeType === 'users' && ids?.length) {
    userFilter._id = { $in: ids }
  } else if (scopeType === 'group') {
    const UserGroup = require('../models/UserGroup')
    const group = await UserGroup.findById(ids[0]).populate('members', '_id')
    if (group) {
      userFilter._id = { $in: group.members.map(m => m._id) }
    } else {
      userFilter._id = { $in: [] }
    }
  }
  // 'all' → pas de filtre supplémentaire

  const User = require('../models/User')
  const [users, forms] = await Promise.all([
    User.find(userFilter).select('_id managerId').lean(),
    Form.find({ _id: { $in: campaign.formIds || [] } }).select('_id formType').lean(),
  ])

  if (!forms.length) {
    logger.warn('[campaign-scope] Aucun formulaire pour la campagne', { campaignId: campaign._id })
    return 0
  }

  const ops = []
  for (const user of users) {
    for (const form of forms) {
      const evaluatorId = user.managerId || user._id
      ops.push({
        updateOne: {
          filter: { campaignId: campaign._id, formId: form._id, evaluateeId: user._id },
          update: {
            $setOnInsert: {
              campaignId:   campaign._id,
              formId:       form._id,
              evaluateeId:  user._id,
              evaluatorId,
              status:       'assigned',
              createdAt:    new Date(),
            },
          },
          upsert: true,
        },
      })
    }
  }

  if (ops.length) {
    const result = await Evaluation.bulkWrite(ops, { ordered: false })
    return result.upsertedCount || 0
  }
  return 0
}

// ── CRUD campagnes ─────────────────────────────────────────────────────────────

/**
 * Crée une campagne.
 * @param {object} data  — champs validés par le validateur de route
 * @param {string} createdBy — req.user.id
 * @returns {Promise<object>} campagne peuplée (lean)
 */
async function createCampaign(data, createdBy) {
  const { name, description, startDate, endDate, targetDepartments, extendedVisibility,
    deadlineEmployee, deadlineManager, status, targetScope, objectivesFormId } = data

  if (!name || !startDate || !endDate) {
    throw makeError('name, startDate et endDate sont requis', 400)
  }
  if (new Date(endDate) < new Date(startDate)) {
    throw makeError('endDate doit être après startDate', 400)
  }
  if (status && !['draft', 'active'].includes(status)) {
    throw makeError('Le statut initial doit être draft ou active', 400)
  }

  const campaign = await Campaign.create({
    name,
    description:        description || '',
    startDate,
    endDate,
    targetDepartments:  targetDepartments || [],
    extendedVisibility: extendedVisibility || [],
    deadlineEmployee:   deadlineEmployee   || null,
    deadlineManager:    deadlineManager    || null,
    createdBy,
    ...(status           ? { status }           : {}),
    ...(targetScope      ? { targetScope }      : {}),
    ...(objectivesFormId ? { objectivesFormId } : {}),
  })

  return Campaign.findById(campaign._id).populate('createdBy', 'firstName lastName email').lean()
}

/**
 * Retourne une campagne avec ses stats de complétion, après vérification RBAC.
 * @throws {Error} 400 si ID invalide, 403 si non autorisé, 404 si introuvable
 */
async function getCampaignById(id, user) {
  if (!mongoose.isValidObjectId(id)) {
    throw makeError('ID invalide', 400)
  }

  const campaign = await Campaign.findById(id)
    .populate('createdBy', 'firstName lastName email')
    .lean()

  if (!campaign) throw makeError('Campagne introuvable', 404)

  const canView = await checkCampaignVisibility(campaign, user)
  if (!canView) throw makeError('Accès non autorisé à cette campagne', 403)

  const stats = await Evaluation.aggregate([
    { $match: { campaignId: campaign._id } },
    {
      $group: {
        _id:       null,
        total:     { $sum: 1 },
        started:   { $sum: { $cond: [{ $ne: ['$status', 'assigned'] }, 1, 0] } },
        submitted: { $sum: { $cond: [{ $in: ['$status', ['submitted', 'reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated']] }, 1, 0] } },
        validated: { $sum: { $cond: [{ $eq: ['$status', 'validated'] }, 1, 0] } },
      },
    },
  ])

  return { ...campaign, stats: stats[0] || { total: 0, started: 0, submitted: 0, validated: 0 } }
}

/**
 * Met à jour une campagne (champs et/ou transition de statut).
 * @returns {Promise<{ campaign: object, warning: string|null }>}
 */
async function updateCampaign(id, data) {
  if (!mongoose.isValidObjectId(id)) {
    throw makeError('ID invalide', 400)
  }

  const campaign = await Campaign.findById(id)
  if (!campaign) throw makeError('Campagne introuvable', 404)

  const originalStatus = campaign.status

  if (data.status) {
    const allowed = VALID_TRANSITIONS[campaign.status] || []
    if (!allowed.includes(data.status)) {
      throw makeError(`Transition '${campaign.status}' → '${data.status}' non autorisée`, 400)
    }
  }

  const EDITABLE = ['name', 'description', 'status', 'startDate', 'endDate',
    'targetDepartments', 'extendedVisibility', 'deadlineEmployee', 'deadlineManager',
    'previousCampaignId', 'enableN1Context', 'n1VisibleToEmployee', 'targetScope']
  EDITABLE.forEach(key => {
    if (data[key] !== undefined) campaign[key] = data[key]
  })

  await campaign.save()

  let warning = null
  const closingTransitions = ['closed', 'archived']
  if (data.status && closingTransitions.includes(data.status)) {
    const COMPLETED = ['submitted', 'reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated']
    const [totalAgg, completedAgg] = await Promise.all([
      Evaluation.countDocuments({ campaignId: campaign._id }),
      Evaluation.countDocuments({ campaignId: campaign._id, status: { $in: COMPLETED } }),
    ])
    if (totalAgg > 0) {
      const pct = Math.round((completedAgg / totalAgg) * 100)
      if (pct < 100) {
        warning = `${pct}% des évaluations sont complètes (${completedAgg}/${totalAgg})`
      }
    }
  }

  // Fire-and-forget: generate evaluations when campaign goes active
  if (data.status === 'active') {
    generateEvaluationsForCampaign(campaign).then(count => {
      logger.info('[campaign-scope] Évaluations créées', { count, campaignId: campaign._id })
    }).catch(err => {
      logger.error('[campaign-scope] Erreur génération évaluations', { error: err.message, campaignId: campaign._id })
    })
  }

  // Fire-and-forget: notify users when campaign goes active
  if (data.status === 'active') {
    ;(async () => {
      try {
        const User = require('../models/User')
        const filter = { isActive: true }
        if (campaign.targetDepartments?.length) {
          filter.department = { $in: campaign.targetDepartments }
        }
        const users = await User.find(filter).lean()
        if (users.length) await notifyMany('campaignLaunch', users, { campaignName: campaign.name })
      } catch (_) { /* notification failure must never block */ }
    })()
  }

  return { campaign, originalStatus, warning }
}

/**
 * Supprime une campagne (draft ou archived uniquement), avec ses évaluations et formulaires.
 */
async function deleteCampaign(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw makeError('ID invalide', 400)
  }

  const campaign = await Campaign.findById(id)
  if (!campaign) throw makeError('Campagne introuvable', 404)

  if (campaign.status === 'active') {
    throw makeError("Impossible de supprimer une campagne active. Clôturez-la d'abord.", 400)
  }
  if (!['draft', 'archived'].includes(campaign.status)) {
    throw makeError('Seules les campagnes en brouillon ou archivées peuvent être supprimées.', 400)
  }

  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      await Evaluation.deleteMany({ campaignId: campaign._id }, { session })
      await Form.deleteMany({ _id: { $in: campaign.formIds || [] } }, { session })
      await campaign.deleteOne({ session })
    })
  } catch (err) {
    if (err.code === 20 || err.message?.includes('Transaction') || err.message?.includes('replica')) {
      logger.warn('[delete-campaign] Transactions non disponibles, exécution séquentielle')
      await Evaluation.deleteMany({ campaignId: campaign._id })
      await Form.deleteMany({ _id: { $in: campaign.formIds || [] } })
      await campaign.deleteOne()
    } else {
      throw err
    }
  } finally {
    await session.endSession()
  }

  return campaign
}

/**
 * Duplique une campagne (statut → draft). Les dates sont décalées d'un an par défaut.
 * @returns {Promise<{ id: ObjectId, formsCloned: number }>}
 */
async function cloneCampaign(sourceId, body, userId) {
  if (!mongoose.isValidObjectId(sourceId)) {
    throw makeError('ID invalide', 400)
  }

  const source = await Campaign.findById(sourceId).lean()
  if (!source) throw makeError('Campagne introuvable', 404)

  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000
  const startDate = body.startDate
    ? new Date(body.startDate)
    : new Date(new Date(source.startDate).getTime() + ONE_YEAR_MS)
  const endDate = body.endDate
    ? new Date(body.endDate)
    : new Date(new Date(source.endDate).getTime() + ONE_YEAR_MS)

  if (endDate < startDate) {
    throw makeError('endDate doit être après startDate', 400)
  }

  const newName = (body.name && String(body.name).trim()) || `${source.name} (copie)`

  const cloned = await Campaign.create({
    name:                newName.slice(0, 200),
    description:         source.description || '',
    startDate,
    endDate,
    status:              'draft',
    targetDepartments:   source.targetDepartments || [],
    extendedVisibility:  source.extendedVisibility || [],
    formIds:             source.formIds || [],
    createdBy:           userId,
    previousCampaignId:  source._id,
    enableN1Context:     source.enableN1Context  ?? true,
    n1VisibleToEmployee: source.n1VisibleToEmployee ?? true,
  })

  const sourceForms = await Form.find({ _id: { $in: source.formIds || [] } }).lean()
  if (sourceForms.length > 0) {
    const formCopies = sourceForms.map(({ _id, createdAt, updatedAt, frozenAt, isFrozen, ...rest }) => ({ // eslint-disable-line no-unused-vars
      ...rest,
      isFrozen:  false,
      frozenAt:  null,
      createdBy: userId,
    }))
    await Form.insertMany(formCopies)
  }

  return { id: cloned._id, formsCloned: sourceForms.length }
}

// ── Formulaires liés ───────────────────────────────────────────────────────────

/**
 * Lie un formulaire à une campagne (contrainte : un seul formulaire par formType).
 * @returns {Promise<{ campaignId: ObjectId, formId: ObjectId }>}
 */
async function linkForm(campaignId, formId) {
  if (!mongoose.isValidObjectId(campaignId)) throw makeError('ID de campagne invalide', 400)
  if (!formId || !mongoose.isValidObjectId(formId)) {
    throw makeError('formId est requis et doit être un ObjectId valide', 400)
  }

  const [campaign, form] = await Promise.all([
    Campaign.findById(campaignId).populate('formIds', 'formType'),
    Form.findById(formId).lean(),
  ])

  if (!campaign) throw makeError('Campagne introuvable', 404)
  if (!form)     throw makeError('Formulaire introuvable', 404)

  const alreadyLinked = campaign.formIds.some(f => f._id.toString() === formId)
  if (alreadyLinked) throw makeError('Ce formulaire est déjà lié à cette campagne', 409)

  const duplicateType = campaign.formIds.some(f => f.formType === form.formType)
  if (duplicateType) {
    throw makeError(`Un formulaire de type '${form.formType}' est déjà lié à cette campagne`, 409)
  }

  campaign.formIds.push(form._id)
  await campaign.save()

  return { campaignId: campaign._id, formId: form._id, form }
}

/**
 * Délie un formulaire d'une campagne.
 * @returns {Promise<{ campaignId: ObjectId, formId: string }>}
 */
async function unlinkForm(campaignId, formId) {
  if (!mongoose.isValidObjectId(campaignId) || !mongoose.isValidObjectId(formId)) {
    throw makeError('ID invalide', 400)
  }

  const campaign = await Campaign.findById(campaignId)
  if (!campaign) throw makeError('Campagne introuvable', 404)

  const idx = campaign.formIds.findIndex(f => f.toString() === formId)
  if (idx === -1) throw makeError('Formulaire non lié à cette campagne', 404)

  campaign.formIds.splice(idx, 1)
  await campaign.save()

  return { campaignId: campaign._id, formId }
}

// ── Analytics ─────────────────────────────────────────────────────────────────

/**
 * Calcule les agrégats analytiques d'une campagne.
 * @param {object} campaign — document lean (doit avoir _id et name)
 * @param {object} user     — req.user
 */
async function getCampaignAnalytics(campaign, user) {
  const canView = await checkCampaignVisibility(campaign, user)
  if (!canView) throw makeError('Accès non autorisé à cette campagne', 403)

  const campaignId = campaign._id instanceof mongoose.Types.ObjectId
    ? campaign._id
    : new mongoose.Types.ObjectId(campaign._id.toString())

  const COMPLETED = ['submitted', 'reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated']

  const [statusAgg, scoreAgg, deptAgg] = await Promise.all([
    Evaluation.aggregate([
      { $match: { campaignId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Evaluation.aggregate([
      { $match: { campaignId, score: { $ne: null } } },
      {
        $bucket: {
          groupBy:    '$score',
          boundaries: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 101],
          default:    'other',
          output:     { count: { $sum: 1 }, avg: { $avg: '$score' } },
        },
      },
    ]),
    Evaluation.aggregate([
      { $match: { campaignId } },
      { $lookup: { from: 'users', localField: 'evaluateeId', foreignField: '_id', as: 'evaluatee' } },
      { $unwind: '$evaluatee' },
      {
        $group: {
          _id:        '$evaluatee.department',
          total:      { $sum: 1 },
          completed:  { $sum: { $cond: [{ $in: ['$status', COMPLETED] }, 1, 0] } },
          scoreSum:   { $sum: { $ifNull: ['$score', 0] } },
          scoreCount: { $sum: { $cond: [{ $ne: ['$score', null] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ])

  const statusDistribution = statusAgg.reduce((acc, x) => {
    acc[x._id] = x.count
    return acc
  }, {})

  const totalEvals     = statusAgg.reduce((s, x) => s + x.count, 0)
  const completedEvals = statusAgg
    .filter(x => COMPLETED.includes(x._id))
    .reduce((s, x) => s + x.count, 0)
  const completionPct  = totalEvals > 0 ? Math.round((completedEvals / totalEvals) * 100) : 0

  const scoreDistribution = scoreAgg
    .filter(b => b._id !== 'other')
    .map(b => ({ from: b._id, to: b._id + 9, count: b.count }))

  const allScores = await Evaluation.aggregate([
    { $match: { campaignId, score: { $ne: null } } },
    { $group: { _id: null, avg: { $avg: '$score' }, count: { $sum: 1 } } },
  ])
  const avgScore = allScores[0]?.avg !== undefined && allScores[0]?.avg !== null
    ? Math.round(allScores[0].avg * 10) / 10
    : null

  const byDepartment = deptAgg.map(d => ({
    department:    d._id || '—',
    total:         d.total,
    completed:     d.completed,
    completionPct: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
    avgScore:      d.scoreCount > 0 ? Math.round((d.scoreSum / d.scoreCount) * 10) / 10 : null,
  }))

  return {
    campaignId:           campaign._id,
    campaignName:         campaign.name,
    totalEvaluations:     totalEvals,
    completedEvaluations: completedEvals,
    completionPct,
    avgScore,
    statusDistribution,
    scoreDistribution,
    byDepartment,
  }
}

module.exports = {
  checkCampaignVisibility,
  generateEvaluationsForCampaign,
  createCampaign,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  cloneCampaign,
  linkForm,
  unlinkForm,
  getCampaignAnalytics,
}
