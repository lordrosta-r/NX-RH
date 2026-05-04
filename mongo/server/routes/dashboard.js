'use strict'

const express    = require('express')
const router     = express.Router()
const { authGuard }                     = require('../middleware/authGuard')
const { Campaign, Evaluation, User }    = require('../models')

const authenticated = authGuard(['admin', 'hr', 'director', 'manager', 'employee'])

router.get('/', authenticated, async (req, res) => {
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
    console.error('[dashboard]', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router
