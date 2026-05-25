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
const { notify } = require('./notificationService')
const logger     = require('../utils/logger')
const { notify: notifyInApp } = require('./notificationHelper')

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

  // Find active campaigns whose endDate is within the next N days
  const campaigns = await Campaign.find({
    status:  'active',
    endDate: { $gte: now, $lte: windowEnd },
  }).lean()

  if (!campaigns.length) return 0

  const cutoff     = new Date(now.getTime() - REMINDER_COOLDOWN_HOURS * HOUR_MS)
  const campaignIds = campaigns.map(c => c._id)

  // Fetch ALL pending evaluations for all matching campaigns in a single query (fix N+1)
  const allEvals = await Evaluation.find({
    campaignId: { $in: campaignIds },
    status:     { $in: ['assigned', 'in_progress'] },
    $or: [{ lastReminderAt: null }, { lastReminderAt: { $lt: cutoff } }],
  }).lean()

  if (!allEvals.length) return 0

  // Group evaluations by campaign for enrichment
  const evalsByCampaign = new Map()
  for (const ev of allEvals) {
    const key = ev.campaignId.toString()
    if (!evalsByCampaign.has(key)) evalsByCampaign.set(key, [])
    evalsByCampaign.get(key).push(ev)
  }

  // Fetch all required users in a single query (fix second N+1)
  const evaluateeIds = [...new Set(allEvals.map(e => e.evaluateeId.toString()))]
  const users    = await User.find({ _id: { $in: evaluateeIds }, isActive: true }).lean()
  const userById = new Map(users.map(u => [u._id.toString(), u]))

  let sentCount = 0
  const sentEvalIds = []

  for (const c of campaigns) {
    const evals = evalsByCampaign.get(c._id.toString()) || []
    if (!evals.length) continue

    const deadline = new Date(c.endDate).toLocaleDateString('fr-FR')

    for (const ev of evals) {
      const user = userById.get(ev.evaluateeId.toString())
      if (!user) continue
      const ok = await notify('deadlineReminder', user, {
        campaignName: c.name,
        deadline,
      })
      if (ok) {
        sentEvalIds.push(ev._id)
        sentCount += 1
      }
      // Always create the in-app notification (non-blocking, even if email failed)
      await notifyInApp(
        ev.evaluateeId,
        'eval_reminder_deadline',
        `Rappel : évaluation à compléter`,
        `La campagne "${c.name}" se termine le ${deadline}. Pensez à finaliser votre évaluation.`,
        `/evaluations/${ev._id}`,
        'high',
      )
    }
  }

  // Batch update lastReminderAt for all sent evaluations (replaces N individual saves)
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
    await runDeadlineReminders()
    await runExpiryCheck()
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

module.exports = { start, stop, runDeadlineReminders, runExpiryCheck }

