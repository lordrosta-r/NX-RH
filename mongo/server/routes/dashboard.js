'use strict'

const express    = require('express')
const router     = express.Router()
const { authGuard }                     = require('../middleware/authGuard')
const { Campaign, Evaluation, User }    = require('../models')
const MobilityRequest                   = require('../models/MobilityRequest')
const logger                            = require('../utils/logger')
const { cacheResponse }                 = require('../middleware/cacheMiddleware')

const authenticated = authGuard(['admin', 'hr', 'director', 'manager', 'employee'])

router.get('/', authenticated, cacheResponse(300, req => `GET:/api/dashboard:${req.user.id}`), async (req, res) => {
  try {
    const userId = req.user.id
    const role   = req.user.role
    let data = {}

    if (role === 'employee') {
      const [activeCampaigns, myEvals, myRequests] = await Promise.all([
        Campaign.find({ status: 'active' }).select('name startDate endDate').lean(),
        Evaluation.find({
          evaluateeId: userId,
          status: { $in: ['assigned', 'in_progress', 'submitted'] }
        }).populate('campaignId', 'name endDate').populate('formId', 'title').lean(),
        Evaluation.find({
          evaluateeId: userId,
          campaignId: null
        }).populate('formId', 'title formType').sort({ createdAt: -1 }).limit(10).lean()
      ])
      data = { activeCampaigns, myEvals, myRequests }

    } else if (role === 'manager') {
      const teamMembers = await User.find({ managerId: userId, isActive: true }).select('_id').lean()
      const teamIds     = teamMembers.map(u => u._id)
      const [activeCampaigns, teamEvals, pendingRequests] = await Promise.all([
        Campaign.find({ status: 'active' }).select('name startDate endDate').lean(),
        Evaluation.find({
          evaluateeId: { $in: teamIds },
          status: { $in: ['assigned', 'in_progress', 'submitted'] }
        }).populate('evaluateeId', 'firstName lastName').populate('campaignId', 'name endDate').lean(),
        Evaluation.find({
          evaluateeId: { $in: teamIds },
          campaignId: null,
          status: { $in: ['assigned', 'submitted'] }
        }).populate('evaluateeId', 'firstName lastName').populate('formId', 'title formType').lean()
      ])
      const total     = teamEvals.length
      const submitted = teamEvals.filter(e => ['submitted', 'reviewed', 'validated'].includes(e.status)).length
      data = {
        activeCampaigns,
        team: { total, submitted, completionRate: total ? Math.round(submitted / total * 100) : 0 },
        pendingRequests,
        teamSize: teamIds.length
      }

    } else if (role === 'director') {
      const directReports = await User.find({ managerId: userId, isActive: true }).select('_id').lean()
      const directIds     = directReports.map(u => u._id)
      const secondLevel   = await User.find({ managerId: { $in: directIds }, isActive: true }).select('_id').lean()
      const subtreeIds    = [...directIds, ...secondLevel.map(u => u._id)]
      const [activeCampaigns, subtreeEvals, pendingRequests] = await Promise.all([
        Campaign.find({ status: 'active' }).select('name startDate endDate').lean(),
        Evaluation.find({
          evaluateeId: { $in: subtreeIds },
          status: { $in: ['assigned', 'in_progress', 'submitted'] }
        }).populate('evaluateeId', 'firstName lastName department').lean(),
        Evaluation.find({
          evaluateeId: { $in: subtreeIds },
          campaignId: null,
          status: { $in: ['assigned', 'submitted'] }
        }).populate('evaluateeId', 'firstName lastName').populate('formId', 'formType').lean()
      ])
      const total     = subtreeEvals.length
      const submitted = subtreeEvals.filter(e => ['submitted', 'reviewed', 'validated'].includes(e.status)).length
      data = {
        activeCampaigns,
        subtree: { total, submitted, completionRate: total ? Math.round(submitted / total * 100) : 0, size: subtreeIds.length },
        pendingRequests
      }

    } else if (role === 'hr' || role === 'admin') {
      const activeCampaign = await Campaign.findOne({ status: 'active' }).lean()
      const [allEvals, openRequests, usersWithoutManager, totalUsers] = await Promise.all([
        activeCampaign
          ? Evaluation.find({ campaignId: activeCampaign._id }).select('status').lean()
          : Promise.resolve([]),
        Evaluation.find({ campaignId: null, status: { $in: ['assigned', 'submitted'] } })
          .populate('formId', 'formType')
          .populate('evaluateeId', 'firstName lastName department')
          .sort({ createdAt: -1 }).limit(20).lean(),
        User.countDocuments({ isActive: true, managerId: null, role: { $ne: 'admin' } }),
        User.countDocuments({ isActive: true })
      ])

      const evalStats = {
        total:       allEvals.length,
        assigned:    allEvals.filter(e => e.status === 'assigned').length,
        in_progress: allEvals.filter(e => e.status === 'in_progress').length,
        submitted:   allEvals.filter(e => e.status === 'submitted').length,
        validated:   allEvals.filter(e => e.status === 'validated').length,
        expired:     allEvals.filter(e => e.status === 'expired').length,
      }

      data = { activeCampaign, evalStats, openRequests, usersWithoutManager, totalUsers }
    }

    return res.json({ role, ...data })
  } catch (err) {
    logger.error('[dashboard]', { error: err.message })
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ─── GET /api/dashboard/hr ────────────────────────────────────────────────────
const hrOnly      = authGuard(['admin', 'hr'])
const managerOnly = authGuard(['admin', 'hr', 'manager'])

router.get('/hr', hrOnly, cacheResponse(300), async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const completedStatuses = ['submitted', 'reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated']
    const now = new Date()

    const [
      totalUsers,
      activeUsers,
      campaignsActive,
      campaignsDraft,
      campaignsCompleted,
      campaignsOverdue,
      evaluationsTotal,
      evaluationsCompleted,
      evaluationsPending,
      evaluationsSignedBoth,
      recentCampaigns,
      mobilityPending,
      avgResult,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true, lastLoginAt: { $gte: thirtyDaysAgo } }),
      Campaign.countDocuments({ status: 'active' }),
      Campaign.countDocuments({ status: 'draft' }),
      Campaign.countDocuments({ status: { $in: ['closed', 'archived'] } }),
      Campaign.countDocuments({ status: 'active', endDate: { $lt: now } }),
      Evaluation.countDocuments({}),
      Evaluation.countDocuments({ status: { $in: completedStatuses } }),
      Evaluation.countDocuments({ status: { $in: ['assigned', 'in_progress'] } }),
      Evaluation.countDocuments({
        signedByEvaluateeAt: { $exists: true, $ne: null },
        signedByManagerAt:   { $exists: true, $ne: null },
      }),
      Campaign.find({ status: 'active' }).sort({ createdAt: -1 }).limit(5).select('name status createdAt').lean(),
      MobilityRequest.countDocuments({ status: { $in: ['pending', 'under_review'] } }),
      Evaluation.aggregate([
        { $match: { signedByEvaluateeAt: { $exists: true, $ne: null } } },
        {
          $project: {
            completionDays: {
              $divide: [{ $subtract: ['$signedByEvaluateeAt', '$createdAt'] }, 86400000],
            },
          },
        },
        { $group: { _id: null, avg: { $avg: '$completionDays' } } },
      ]),
    ])

    const avgCompletionDays = avgResult.length > 0 ? Math.round(avgResult[0].avg) : null

    res.json({
      data: {
        users: { total: totalUsers, active: activeUsers, inactive: totalUsers - activeUsers },
        campaigns: { active: campaignsActive, draft: campaignsDraft, completed: campaignsCompleted, overdue: campaignsOverdue },
        evaluations: {
          total: evaluationsTotal,
          completed: evaluationsCompleted,
          pending: evaluationsPending,
          signedBoth: evaluationsSignedBoth,
          signedBothRate: evaluationsTotal ? Math.round((evaluationsSignedBoth / evaluationsTotal) * 100) : 0,
          avgCompletionDays,
          completionRate: evaluationsTotal
            ? Math.round((evaluationsCompleted / evaluationsTotal) * 100)
            : 0,
        },
        mobility: { pending: mobilityPending },
        recentCampaigns,
      },
    })
  } catch (err) { next(err) }
})

// ─── GET /api/dashboard/manager ───────────────────────────────────────────────
router.get('/manager', managerOnly, cacheResponse(300, req => `GET:/api/dashboard/manager:${req.user.id}`), async (req, res, next) => {
  try {
    const managerId        = req.user.id
    const completedStatuses = ['submitted', 'reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated']

    const teamMembers = await User.find({ managerId, isActive: true }).select('_id').lean()
    const teamIds     = teamMembers.map(u => u._id)

    const [myTeamEvals, completed, pending, overdue, signedByManager, activeCampaigns, pendingSignatures] = await Promise.all([
      Evaluation.countDocuments({ evaluateeId: { $in: teamIds } }),
      Evaluation.countDocuments({ evaluateeId: { $in: teamIds }, status: { $in: completedStatuses } }),
      Evaluation.countDocuments({ evaluateeId: { $in: teamIds }, status: { $in: ['assigned', 'in_progress'] } }),
      Evaluation.countDocuments({
        evaluateeId: { $in: teamIds },
        status: { $in: ['assigned', 'in_progress'] },
        expiresAt: { $lt: new Date() },
      }),
      Evaluation.countDocuments({
        evaluateeId: { $in: teamIds },
        signedByManagerAt: { $exists: true, $ne: null },
      }),
      Campaign.countDocuments({ status: 'active' }),
      Evaluation.find({
        evaluateeId: { $in: teamIds },
        signedByEvaluateeAt: { $exists: true, $ne: null },
        signedByManagerAt: { $exists: true, $eq: null },
      })
        .populate('evaluateeId', 'firstName lastName')
        .populate('campaignId', 'name')
        .sort({ signedByEvaluateeAt: 1 })
        .limit(5)
        .lean(),
    ])

    res.json({
      data: {
        evaluations: { total: myTeamEvals, completed, pending, overdue, signedByManager },
        campaigns: { total: activeCampaigns },
        completionRate: myTeamEvals ? Math.round((completed / myTeamEvals) * 100) : 0,
        teamSize: teamIds.length,
        pendingSignatures,
      },
    })
  } catch (err) { next(err) }
})

module.exports = router
