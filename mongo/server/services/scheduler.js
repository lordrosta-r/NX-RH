'use strict'

// =============================================================================
// services/scheduler.js — Periodic background tasks
//
// Currently runs (every hour):
//   • deadlineReminder — sends an email to evaluatees whose campaign is closing
//     within REMINDER_WINDOW_DAYS days and whose evaluation is still in
//     'assigned' or 'in_progress'. Idempotent: one reminder per
//     REMINDER_COOLDOWN_HOURS window (tracked via Evaluation.lastReminderAt).
//
//   • expiryCheck — expires evaluations past their expiresAt date (→ 'expired'),
//     and flags evaluations within 7 days of expiry with nearExpiry=true.
//
// Disabled in tests (NODE_ENV=test) and when SCHEDULER_DISABLED=true.
// =============================================================================

const { Evaluation, Campaign, User } = require('../models')
const { notify } = require('./notificationService')

const HOUR_MS = 60 * 60 * 1000
const DAY_MS  = 24 * HOUR_MS

const TICK_INTERVAL_MS        = 60 * 60 * 1000  // 1h
const REMINDER_WINDOW_DAYS    = 3
const REMINDER_COOLDOWN_HOURS = 20
const EXPIRY_WARNING_DAYS     = 7

let timer = null

async function runDeadlineReminders() {
  const now      = new Date()
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_DAYS * DAY_MS)

  // Find active campaigns whose endDate is within the next N days
  const campaigns = await Campaign.find({
    status:  'active',
    endDate: { $gte: now, $lte: windowEnd },
  }).lean()

  if (!campaigns.length) return 0

  const cutoff = new Date(now.getTime() - REMINDER_COOLDOWN_HOURS * HOUR_MS)
  let sentCount = 0

  for (const c of campaigns) {
    const evals = await Evaluation.find({
      campaignId: c._id,
      status:     { $in: ['assigned', 'in_progress'] },
      $or: [{ lastReminderAt: null }, { lastReminderAt: { $lt: cutoff } }],
    })

    if (!evals.length) continue

    const evaluateeIds = [...new Set(evals.map(e => e.evaluateeId.toString()))]
    const users = await User.find({ _id: { $in: evaluateeIds }, isActive: true }).lean()
    const userById = new Map(users.map(u => [u._id.toString(), u]))

    const deadline = new Date(c.endDate).toLocaleDateString('fr-FR')

    for (const ev of evals) {
      const user = userById.get(ev.evaluateeId.toString())
      if (!user) continue
      const ok = await notify('deadlineReminder', user, {
        campaignName: c.name,
        deadline,
      })
      if (ok) {
        ev.lastReminderAt = now
        await ev.save()
        sentCount += 1
      }
    }
  }

  if (sentCount > 0) {
    console.log(`[Scheduler] Sent ${sentCount} deadline reminder(s)`)
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
    console.log(
      `[Scheduler] Expiry check — expired: ${expired.modifiedCount}, nearExpiry flagged: ${warned.modifiedCount}`,
    )
  }
  return { expired: expired.modifiedCount, warned: warned.modifiedCount }
}

async function tick() {
  try {
    await runDeadlineReminders()
    await runExpiryCheck()
  } catch (err) {
    console.error('[Scheduler] tick error:', err.message)
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
  console.log(`[Scheduler] Started — deadline reminders + expiry check every ${TICK_INTERVAL_MS / HOUR_MS}h`)
}

function stop() {
  if (timer) { clearInterval(timer); timer = null }
}

module.exports = { start, stop, runDeadlineReminders, runExpiryCheck }

