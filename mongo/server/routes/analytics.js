'use strict'

// =============================================================================
// /api/analytics — Exports analytiques RH
//
// GET  /api/analytics/summary            → stats globales (admin, hr)
// GET  /api/analytics/monthly-trend      → évolution mensuelle 6 mois (admin, hr)
// GET  /api/analytics/campaigns/:id      → stats par campagne (admin, hr, manager)
// GET  /api/analytics/export/csv         → export CSV (admin, hr)
// GET  /api/analytics/export/pdf         → rapport PDF (admin, hr)
// =============================================================================

const router      = require('express').Router()
const mongoose    = require('mongoose')
const PDFDocument = require('pdfkit')
const { Evaluation, Campaign } = require('../models')
const { ADMIN_ROLES } = require('../config/constants')
const { cacheResponse } = require('../middleware/cacheMiddleware')

const SUMMARY_ROLES  = ['admin', 'hr']
const CAMPAIGN_ROLES = ['admin', 'hr', 'manager']

// ── GET /api/analytics/summary ────────────────────────────────────────────────
// Statistiques globales toutes campagnes confondues.
// Auth : admin, hr
router.get('/summary', cacheResponse(600), async (req, res, next) => {
  try {
    if (!SUMMARY_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès réservé aux admins, RH et directeurs' })
    }

    const [campaignStats, evalStats] = await Promise.all([
      Campaign.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Evaluation.aggregate([{
        $group: {
          _id:        '$status',
          count:      { $sum: 1 },
          scoreSum:   { $sum: { $cond: [{ $ne: ['$score', null] }, '$score', 0] } },
          scoreCount: { $sum: { $cond: [{ $ne: ['$score', null] }, 1, 0] } },
        },
      }]),
    ])

    const totalCampaigns  = campaignStats.reduce((s, x) => s + x.count, 0)
    const activeCampaigns = (campaignStats.find(x => x._id === 'active') || {}).count || 0

    const totalEvaluations = evalStats.reduce((s, x) => s + x.count, 0)
    const validatedBucket  = evalStats.find(x => x._id === 'validated') || { count: 0, scoreSum: 0, scoreCount: 0 }
    const completionRate   = totalEvaluations > 0
      ? Math.round((validatedBucket.count / totalEvaluations) * 100)
      : 0
    const avgScore = validatedBucket.scoreCount > 0
      ? Math.round(validatedBucket.scoreSum / validatedBucket.scoreCount)
      : null

    const byStatus = {}
    for (const b of evalStats) {
      byStatus[b._id] = b.count
    }

    return res.json({
      totalCampaigns,
      activeCampaigns,
      totalEvaluations,
      completionRate,
      avgScore,
      byStatus,
    })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/analytics/campaigns/:id ─────────────────────────────────────────
// Statistiques pour une campagne donnée.
// Auth : admin, hr, manager
router.get('/campaigns/:id', cacheResponse(600), async (req, res, next) => {
  try {
    if (!CAMPAIGN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès réservé aux admins, RH, directeurs et managers' })
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID campagne invalide' })
    }

    const campaign = await Campaign.findById(req.params.id, 'name status').lean()
    if (!campaign) return res.status(404).json({ error: 'Campagne introuvable' })

    const evals = await Evaluation.find(
      { campaignId: req.params.id },
      'status score signedByEvaluateeAt signedByManagerAt signedByHrAt',
    ).lean()

    const total         = evals.length
    const validatedEvals = evals.filter(e => e.status === 'validated')
    const completionRate = total > 0
      ? Math.round((validatedEvals.length / total) * 100)
      : 0

    const scoredEvals = validatedEvals.filter(e => e.score !== null && e.score !== undefined)
    const avgScore = scoredEvals.length > 0
      ? Math.round(scoredEvals.reduce((sum, e) => sum + e.score, 0) / scoredEvals.length)
      : null

    const byStatus = {}
    for (const ev of evals) {
      byStatus[ev.status] = (byStatus[ev.status] || 0) + 1
    }

    const signaturesProgress = {
      evaluatee: total > 0
        ? Math.round(evals.filter(e => e.signedByEvaluateeAt).length / total * 100)
        : 0,
      manager: total > 0
        ? Math.round(evals.filter(e => e.signedByManagerAt).length / total * 100)
        : 0,
      hr: total > 0
        ? Math.round(evals.filter(e => e.signedByHrAt).length / total * 100)
        : 0,
    }

    return res.json({
      campaign: { id: campaign._id, name: campaign.name, status: campaign.status },
      totalEvaluations: total,
      completionRate,
      byStatus,
      avgScore,
      signaturesProgress,
    })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/analytics/export/csv ────────────────────────────────────────────
// Export CSV des évaluations. Filtre optionnel : ?campaignId=xxx
// Auth : admin, hr
router.get('/export/csv', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }

    const evalFilter = {}
    if (req.query.campaignId) {
      if (typeof req.query.campaignId !== 'string' || !mongoose.isValidObjectId(req.query.campaignId)) {
        return res.status(400).json({ error: 'campaignId invalide' })
      }
      evalFilter.campaignId = req.query.campaignId
    }

    const evals = await Evaluation.find(evalFilter)
      .populate('evaluateeId', 'firstName lastName')
      .populate('evaluatorId', 'firstName lastName')
      .populate('campaignId', 'name')
      .lean()

    const escapeCell = val => {
      if (val === null || val === undefined) return ''
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const headers = [
      'evaluateeId', 'evaluateeName',
      'managerId', 'managerName',
      'campaignId', 'campaignName',
      'status', 'reviewerScore',
      'signedByEvaluateeAt', 'signedByManagerAt', 'signedByHrAt',
      'createdAt',
    ]

    const rows = evals.map(ev => {
      const evaluatee = ev.evaluateeId
      const manager   = ev.evaluatorId
      const campaign  = ev.campaignId

      return [
        escapeCell(evaluatee?._id ?? ev.evaluateeId),
        escapeCell(evaluatee ? `${evaluatee.firstName} ${evaluatee.lastName}` : ''),
        escapeCell(manager?._id ?? ev.evaluatorId),
        escapeCell(manager ? `${manager.firstName} ${manager.lastName}` : ''),
        escapeCell(campaign?._id ?? ev.campaignId),
        escapeCell(campaign?.name ?? ''),
        escapeCell(ev.status),
        escapeCell(ev.score),
        escapeCell(ev.signedByEvaluateeAt ? new Date(ev.signedByEvaluateeAt).toISOString() : ''),
        escapeCell(ev.signedByManagerAt   ? new Date(ev.signedByManagerAt).toISOString()   : ''),
        escapeCell(ev.signedByHrAt        ? new Date(ev.signedByHrAt).toISOString()        : ''),
        escapeCell(ev.createdAt           ? new Date(ev.createdAt).toISOString()           : ''),
      ].join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')
    const filename = `analytics-export-${new Date().toISOString().slice(0, 10)}.csv`

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return res.send(csv)
  } catch (err) {
    next(err)
  }
})

// GET /api/analytics/export/pdf — Rapport PDF analytique RH (admin/hr, ?campaignId optionnel)
router.get('/export/pdf', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }

    // Filtre optionnel par campagne
    const evalFilter = {}
    if (req.query.campaignId) {
      if (typeof req.query.campaignId !== 'string' || !mongoose.isValidObjectId(req.query.campaignId)) {
        return res.status(400).json({ error: 'campaignId invalide' })
      }
      evalFilter.campaignId = req.query.campaignId
    }

    const allEvals = await Evaluation.find(evalFilter)
      .populate('evaluateeId', 'firstName lastName department')
      .lean()

    const total      = allEvals.length
    const completed  = allEvals.filter(e => e.status === 'validated').length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    const withScore = allEvals.filter(e => e.score !== null && e.score !== undefined)
    const avgScore  = withScore.length > 0
      ? Math.round(withScore.reduce((sum, e) => sum + e.score, 0) / withScore.length)
      : null

    // Top performers — score moyen par évalué
    const scoreByUser = {}
    for (const ev of withScore) {
      const uid  = ev.evaluateeId?._id?.toString() || ev.evaluateeId?.toString()
      if (!uid) continue
      if (!scoreByUser[uid]) {
        const first = ev.evaluateeId?.firstName
        scoreByUser[uid] = {
          name:   first ? `${ev.evaluateeId.firstName} ${ev.evaluateeId.lastName}` : '—',
          scores: [],
        }
      }
      scoreByUser[uid].scores.push(ev.score)
    }
    const topPerformers = Object.values(scoreByUser)
      .map(u => ({
        name:     u.name,
        avgScore: Math.round(u.scores.reduce((a, b) => a + b, 0) / u.scores.length),
        count:    u.scores.length,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 5)

    // Répartition par département
    const deptBreakdown = {}
    for (const ev of allEvals) {
      const dept = ev.evaluateeId?.department || 'Non défini'
      if (!deptBreakdown[dept]) deptBreakdown[dept] = { total: 0, validated: 0 }
      deptBreakdown[dept].total++
      if (ev.status === 'validated') deptBreakdown[dept].validated++
    }

    // ── Build PDF ─────────────────────────────────────────────────────────────
    const now     = new Date()
    const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    res.setHeader('Content-Type', 'application/pdf')
    const campaignSuffix = req.query.campaignId ? `-${req.query.campaignId}` : ''
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="analytics-rh-${now.toISOString().slice(0, 10)}${campaignSuffix}.pdf"`,
    )
    doc.pipe(res)

    const PRIMARY   = '#b8000b'
    const SECONDARY = '#5b00df'
    const DARK      = '#1a1a1a'
    const MUTED     = '#666666'

    // En-tête
    doc.fillColor(PRIMARY).fontSize(22).font('Helvetica-Bold')
       .text('NanoXplore RH', { align: 'center' })
    doc.fillColor(DARK).fontSize(14).font('Helvetica')
       .text(`Rapport analytique RH — ${dateStr}`, { align: 'center' })
    doc.moveDown(0.5)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dddddd').stroke()
    doc.moveDown()

    // Statistiques globales
    doc.fillColor(SECONDARY).fontSize(14).font('Helvetica-Bold').text('Statistiques globales')
    doc.moveDown(0.4)
    doc.fillColor(DARK).fontSize(11).font('Helvetica')
    doc.text(`Total évaluations : ${total}`)
    doc.text(`Évaluations validées : ${completed}`)
    doc.text(`Taux de complétion : ${completionRate} %`)
    doc.text(`Score moyen global : ${avgScore !== null ? `${avgScore}/100` : 'N/A (aucun score renseigné)'}`)
    doc.moveDown()

    // Top 5 performers
    doc.fillColor(SECONDARY).fontSize(14).font('Helvetica-Bold').text('Top 5 — Meilleures performances')
    doc.moveDown(0.4)
    doc.fillColor(DARK).fontSize(11).font('Helvetica')
    if (topPerformers.length === 0) {
      doc.fillColor(MUTED).text('Aucune donnée de score disponible.')
    } else {
      for (const [i, p] of topPerformers.entries()) {
        doc.fillColor(DARK)
           .text(`${i + 1}. ${p.name} — Score moyen : ${p.avgScore}/100 (${p.count} évaluation${p.count > 1 ? 's' : ''})`)
      }
    }
    doc.moveDown()

    // Répartition par département
    doc.fillColor(SECONDARY).fontSize(14).font('Helvetica-Bold').text('Répartition par département')
    doc.moveDown(0.4)
    const depts = Object.entries(deptBreakdown).sort((a, b) => b[1].total - a[1].total)
    if (depts.length === 0) {
      doc.fillColor(MUTED).fontSize(11).font('Helvetica').text('Aucune donnée disponible.')
    } else {
      for (const [dept, data] of depts) {
        const rate = data.total > 0 ? Math.round((data.validated / data.total) * 100) : 0
        doc.fillColor(DARK).fontSize(11).font('Helvetica')
           .text(
             `${dept} : ${data.total} évaluation${data.total > 1 ? 's' : ''} — `
             + `${data.validated} validée${data.validated !== 1 ? 's' : ''} (${rate} %)`,
           )
      }
    }
    doc.moveDown(2)

    // Pied de page
    doc.fillColor(MUTED).fontSize(9).font('Helvetica')
       .text(`Généré le ${now.toLocaleString('fr-FR')} — Document confidentiel`, { align: 'center' })

    doc.end()
  } catch (err) {
    next(err)
  }
})

// ── GET /api/analytics/monthly-trend ─────────────────────────────────────────
// Évolution mensuelle des évaluations sur les 6 derniers mois.
// Auth : admin, hr
const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

router.get('/monthly-trend', cacheResponse(300), async (req, res, next) => {
  try {
    if (!SUMMARY_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès réservé aux admins, RH et directeurs' })
    }

    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    const completedStatuses = ['submitted', 'reviewed', 'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated']

    const raw = await Evaluation.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $in: ['$status', completedStatuses] }, 1, 0] },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ])

    const data = raw.map(d => ({
      month: `${MONTH_LABELS[d._id.month - 1]} ${d._id.year}`,
      total: d.total,
      completed: d.completed,
    }))

    res.json({ data })
  } catch (err) { next(err) }
})

module.exports = router
