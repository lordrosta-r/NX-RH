'use strict'

// =============================================================================
// /api/analytics — Exports analytiques RH (PDF)
//
// GET  /api/analytics/export/pdf  → rapport PDF (admin/hr uniquement)
// =============================================================================

const router      = require('express').Router()
const PDFDocument = require('pdfkit')
const { Evaluation } = require('../models')
const { ADMIN_ROLES } = require('../config/constants')

// ─── GET /api/analytics/export/pdf ───────────────────────────────────────────

router.get('/export/pdf', async (req, res, next) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Réservé aux admins et RH' })
    }

    // Récupère toutes les évaluations avec les infos nécessaires
    const allEvals = await Evaluation.find({})
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
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="analytics-rh-${now.toISOString().slice(0, 10)}.pdf"`,
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

module.exports = router
