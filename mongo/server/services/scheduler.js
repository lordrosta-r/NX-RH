'use strict'

// =============================================================================
// services/scheduler.js — Periodic background tasks
//
// Currently runs (every hour):
//   • deadlineReminder — sends an email + in-app notification to evaluatees
//     whose campaign is closing within REMINDER_WINDOW_DAYS days and whose
//     evaluation is still in 'assigned' or 'in_progress'. Idempotent: one
//     reminder per REMINDER_COOLDOWN_HOURS window (tracked via
//     Evaluation.lastReminderAt).
//
//   • expiryCheck — expires evaluations past their expiresAt date (→ 'expired'),
//     and flags evaluations within 7 days of expiry with nearExpiry=true.
//
// Disabled in tests (NODE_ENV=test) and when SCHEDULER_DISABLED=true.
// =============================================================================

const { Evaluation, Campaign, User } = require('../models')
const { notify } = require('./mailNotificationService')
const logger     = require('../utils/logger')
const { notify: notifyInApp } = require('./notificationHelper')
const { withLock } = require('../utils/schedulerLock')

const HOUR_MS = 60 * 60 * 1000
const DAY_MS  = 24 * HOUR_MS

const TICK_INTERVAL_MS        = 60 * 60 * 1000  // 1h
const REMINDER_WINDOW_DAYS    = 3
const REMINDER_COOLDOWN_HOURS = 20
const EXPIRY_WARNING_DAYS     = 7

let timer = null

async function runDeadlineReminders() {
  const now       = new Date()
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_DAYS * DAY_MS)
  const cutoff    = new Date(now.getTime() - REMINDER_COOLDOWN_HOURS * HOUR_MS)

  // Évals non répondues dont la deadline de phase approche (J-N), hors cooldown.
  // La deadline de phase (phaseDeadline) est la vraie date limite de réponse.
  const allEvals = await Evaluation.find({
    status:        { $in: ['assigned', 'in_progress'] },
    phaseDeadline: { $ne: null, $gte: now, $lte: windowEnd },
    $or: [{ lastReminderAt: null }, { lastReminderAt: { $lt: cutoff } }],
  }).lean()

  if (!allEvals.length) return 0

  // Enrichissement : noms de campagne + évalués (deux requêtes groupées, pas de N+1)
  const campaignIds = [...new Set(allEvals.map(e => e.campaignId?.toString()).filter(Boolean))]
  const campaigns   = await Campaign.find({ _id: { $in: campaignIds } }, 'name').lean()
  const campaignById = new Map(campaigns.map(c => [c._id.toString(), c]))

  const evaluateeIds = [...new Set(allEvals.map(e => e.evaluateeId.toString()))]
  const users    = await User.find({ _id: { $in: evaluateeIds }, isActive: true }).lean()
  const userById = new Map(users.map(u => [u._id.toString(), u]))

  let sentCount = 0
  const sentEvalIds = []

  for (const ev of allEvals) {
    const user = userById.get(ev.evaluateeId.toString())
    if (!user) continue
    const campaignName = campaignById.get(ev.campaignId?.toString())?.name || 'Évaluation'
    const deadline     = new Date(ev.phaseDeadline).toLocaleDateString('fr-FR')

    const ok = await notify('deadlineReminder', user, { campaignName, deadline })
    if (ok) {
      sentEvalIds.push(ev._id)
      sentCount += 1
    }
    // Notification in-app toujours créée (non bloquant, même si l'email échoue)
    await notifyInApp(
      ev.evaluateeId,
      'eval_reminder_deadline',
      `Rappel : évaluation à compléter`,
      `Votre évaluation "${campaignName}" est à compléter avant le ${deadline}.`,
      `/evaluations/${ev._id}`,
      'high',
    )
  }

  if (sentEvalIds.length > 0) {
    await Evaluation.updateMany(
      { _id: { $in: sentEvalIds } },
      { $set: { lastReminderAt: now } },
    )
  }

  if (sentCount > 0) {
    logger.info('[Scheduler] Deadline reminders envoyés', { count: sentCount })
  }
  return sentCount
}

// Expire les évaluations NON RÉPONDUES (assigned/in_progress) dont la deadline de
// phase est dépassée. Ne touche JAMAIS les évals déjà soumises/en signature :
// celles-là restent dans le workflow (la signature peut continuer après la date).
async function runDeadlineExpiry() {
  const now = new Date()
  const res = await Evaluation.updateMany(
    {
      phaseDeadline: { $ne: null, $lt: now },
      status:        { $in: ['assigned', 'in_progress'] },
    },
    { $set: { status: 'expired', nearExpiry: false } },
  )
  if (res.modifiedCount > 0) {
    logger.info('[Scheduler] Deadline expiry', { expired: res.modifiedCount })
  }
  return res.modifiedCount
}

// Expire les évaluations dont expiresAt est dépassé, et marque celles proches
// de l'expiration (< EXPIRY_WARNING_DAYS jours) avec nearExpiry=true.
async function runExpiryCheck() {
  const now     = new Date()
  const in7Days = new Date(now.getTime() + EXPIRY_WARNING_DAYS * DAY_MS)

  // Évaluations expirées → statut 'expired'
  const expired = await Evaluation.updateMany(
    {
      expiresAt: { $ne: null, $lt: now },
      status:    { $nin: ['validated', 'expired'] },
    },
    { $set: { status: 'expired', nearExpiry: false } },
  )

  // Évaluations dans les 7 prochains jours → nearExpiry=true
  const warned = await Evaluation.updateMany(
    {
      expiresAt: { $ne: null, $gte: now, $lte: in7Days },
      status:    { $nin: ['validated', 'expired'] },
      nearExpiry: false,
    },
    { $set: { nearExpiry: true } },
  )

  // Nettoie les nearExpiry qui ne sont plus dans la fenêtre
  await Evaluation.updateMany(
    {
      nearExpiry: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: in7Days } },
        { status: { $in: ['validated', 'expired'] } },
      ],
    },
    { $set: { nearExpiry: false } },
  )

  if (expired.modifiedCount > 0 || warned.modifiedCount > 0) {
    logger.info('[Scheduler] Expiry check', { expired: expired.modifiedCount, nearExpiry: warned.modifiedCount })
  }
  return { expired: expired.modifiedCount, warned: warned.modifiedCount }
}

async function tick() {
  try {
    await withLock('deadline-reminders', 300, runDeadlineReminders)
    await withLock('deadline-expiry', 600, runDeadlineExpiry)
    await withLock('expire-evaluations', 600, runExpiryCheck)
  } catch (err) {
    logger.error('[Scheduler] tick error', { error: err.message })
  }
}

function start() {
  if (process.env.NODE_ENV === 'test' || process.env.SCHEDULER_DISABLED === 'true') {
    return
  }
  if (timer) return
  // Defer the first run by 1 minute to avoid bombarding right after restart
  timer = setInterval(tick, TICK_INTERVAL_MS)
  setTimeout(tick, 60 * 1000)
  logger.info('[Scheduler] Démarré', { interval: `${TICK_INTERVAL_MS / HOUR_MS}h`, tasks: 'deadline reminders + expiry check' })
}

function stop() {
  if (timer) { clearInterval(timer); timer = null }
}

module.exports = { start, stop, runDeadlineReminders, runDeadlineExpiry, runExpiryCheck }

