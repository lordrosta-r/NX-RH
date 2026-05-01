'use strict'

// =============================================================================
// routes/evaluations/pdf.js — Export PDF d'une évaluation
//
// GET /:id/pdf → génère et envoie un PDF (évaluateur, évalué, admin/hr)
// =============================================================================

const mongoose     = require('mongoose')
const PDFDocument  = require('pdfkit')
const { Evaluation } = require('../../models')
const { ADMIN_ROLES }  = require('../../config/constants')
const { formatAnswer } = require('./helpers')

const PDF_COLORS = {
  primary:   '#b8000b',
  secondary: '#5b00df',
  dark:      '#1a1a1a',
  muted:     '#666666',
  success:   '#1a7a1a',
}

const PDF_PHASES = [
  { key: 'self',        label: 'Auto-évaluation' },
  { key: 'n-1',         label: 'Évaluation N-1' },
  { key: 'objectives',  label: 'Objectifs' },
  { key: 'aspirations', label: 'Aspirations' },
]

// GET /:id/pdf — Export PDF d'une évaluation individuelle
async function handlePdf(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const evaluation = await Evaluation.findById(req.params.id)
      .populate('formId', 'title formType questions isAnonymous')
      .populate('evaluatorId', 'firstName lastName')
      .populate('evaluateeId', 'firstName lastName department')
      .populate('campaignId', 'name endDate')
      .lean()

    if (!evaluation) return res.status(404).json({ error: 'Évaluation introuvable' })

    const uid = req.user.id
    if (!ADMIN_ROLES.includes(req.user.role)) {
      const isOwn = [
        String(evaluation.evaluatorId?._id || evaluation.evaluatorId),
        String(evaluation.evaluateeId?._id || evaluation.evaluateeId),
      ].includes(uid)
      if (!isOwn) return res.status(403).json({ error: 'Accès interdit' })
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="evaluation-${req.params.id}.pdf"`)
    doc.pipe(res)

    _renderPdf(doc, evaluation)

    doc.end()
  } catch (err) {
    next(err)
  }
}

// ─── Rendu PDF ─────────────────────────────────────────────────────────────────

function _renderPdf(doc, evaluation) {
  const { primary, secondary, dark, muted, success } = PDF_COLORS
  const evaluatee = evaluation.evaluateeId
  const evaluator = evaluation.evaluatorId
  const campaign  = evaluation.campaignId
  const form      = evaluation.formId

  // En-tête
  doc.fillColor(primary).fontSize(22).font('Helvetica-Bold')
     .text('NanoXplore RH', { align: 'center' })
  doc.fillColor(dark).fontSize(14).font('Helvetica')
     .text("Compte rendu d'entretien", { align: 'center' })
  doc.moveDown(0.5)
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dddddd').stroke()
  doc.moveDown()

  // Informations générales
  doc.fillColor(secondary).fontSize(13).font('Helvetica-Bold').text('Informations')
  doc.moveDown(0.4)
  doc.fillColor(dark).fontSize(11).font('Helvetica')
  if (evaluatee?.firstName) {
    doc.text(`Employé : ${evaluatee.firstName} ${evaluatee.lastName}${evaluatee.department ? ` — ${evaluatee.department}` : ''}`)
  }
  if (evaluator?.firstName) doc.text(`Manager : ${evaluator.firstName} ${evaluator.lastName}`)
  if (campaign?.name)       doc.text(`Campagne : ${campaign.name}`)
  if (campaign?.endDate)    doc.text(`Date de clôture : ${new Date(campaign.endDate).toLocaleDateString('fr-FR')}`)
  if (form?.title)          doc.text(`Formulaire : ${form.title}`)
  doc.text(`Statut : ${evaluation.status}`)
  doc.moveDown()

  // Questions + réponses
  const questions = form?.questions || []
  const answerMap = new Map((evaluation.answers || []).map(a => [a.questionId, a.value]))

  // Questions générales (phase = 'all')
  const generalQs = questions.filter(q => q.phase === 'all')
  if (generalQs.length > 0) {
    doc.fillColor(secondary).fontSize(13).font('Helvetica-Bold').text('Questions générales')
    doc.moveDown(0.4)
    _renderQuestions(doc, generalQs, answerMap, dark, muted)
    doc.moveDown(0.5)
  }

  // Sections par phase
  for (const phase of PDF_PHASES) {
    const phaseQs = questions.filter(q => q.phase === phase.key)
    if (phaseQs.length === 0) continue
    doc.fillColor(secondary).fontSize(13).font('Helvetica-Bold').text(phase.label)
    doc.moveDown(0.4)
    _renderQuestions(doc, phaseQs, answerMap, dark, muted)
    doc.moveDown(0.5)
  }

  if (questions.length === 0) {
    doc.fillColor(muted).fontSize(11).font('Helvetica')
       .text('(Formulaire non disponible ou aucune question définie)')
    doc.moveDown()
  }

  // Commentaires
  if (evaluation.reviewerComment) {
    doc.fillColor(secondary).fontSize(12).font('Helvetica-Bold').text('Commentaire du manager')
    doc.fillColor(dark).font('Helvetica').text(evaluation.reviewerComment)
    doc.moveDown()
  }
  if (evaluation.evaluateeComment) {
    doc.fillColor(secondary).fontSize(12).font('Helvetica-Bold').text("Commentaire de l'évalué")
    doc.fillColor(dark).font('Helvetica').text(evaluation.evaluateeComment)
    doc.moveDown()
  }

  // Signatures
  doc.fillColor(secondary).fontSize(12).font('Helvetica-Bold').text('Signatures')
  doc.moveDown(0.4)
  doc.fontSize(10)

  _renderSignatureLine(doc, evaluation.signedByEvaluateeAt,
    evaluatee?.firstName ? `${evaluatee.firstName} ${evaluatee.lastName}` : 'Évalué',
    'évalué', success, muted)
  _renderSignatureLine(doc, evaluation.signedByManagerAt,
    evaluator?.firstName ? `${evaluator.firstName} ${evaluator.lastName}` : 'Manager',
    'manager', success, muted)
  _renderSignatureLine(doc, evaluation.signedByHrAt, 'RH', null, success, muted)

  doc.moveDown(2)

  // Pied de page
  doc.fillColor(muted).fontSize(9).font('Helvetica')
     .text(
       `Généré le ${new Date().toLocaleString('fr-FR')} — Document confidentiel`,
       { align: 'center' }
     )
}

function _renderQuestions(doc, questions, answerMap, dark, muted) {
  for (const q of questions) {
    const displayVal = formatAnswer(answerMap.get(q.id), q)
    doc.fillColor(dark).fontSize(10).font('Helvetica-Bold').text(q.label)
    doc.fillColor(muted).font('Helvetica').text(`  → ${displayVal}`)
    doc.moveDown(0.25)
  }
}

function _renderSignatureLine(doc, signedAt, name, role, successColor, mutedColor) {
  const label = role ? `${name} (${role})` : name
  if (signedAt) {
    doc.fillColor(successColor).font('Helvetica-Bold')
       .text(`✓ ${label} — ${new Date(signedAt).toLocaleString('fr-FR')}`)
  } else {
    doc.fillColor(mutedColor).font('Helvetica').text(`○ ${label} — pas encore signé`)
  }
}

module.exports = { handlePdf }
