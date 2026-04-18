'use strict'

// =============================================================================
// services/scheduler.js — Periodic background tasks
//
// Currently runs:
//   • deadlineReminder — every hour, sends an email to evaluatees whose campaign
//     is closing within REMINDER_WINDOW_DAYS days and whose evaluation is still
//     in 'assigned' or 'in_progress'. Idempotent: an evaluation receives at
//     most one reminder per REMINDER_COOLDOWN_HOURS window (tracked via
//     Evaluation.lastReminderAt).
//
// Disabled in tests (NODE_ENV=test) and when SCHEDULER_DISABLED=true.
// =============================================================================

const { Evaluation, Campaign, User } = require('../models')
const { notify } = require('./notificationService')

const HOUR_MS = 60 * 60 * 1000
const DAY_MS  = 24 * HOUR_MS

const TICK_INTERVAL_MS       = 60 * 60 * 1000  // 1h
const REMINDER_WINDOW_DAYS   = 3
const REMINDER_COOLDOWN_HOURS = 20

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

async function tick() {
  try {
    await runDeadlineReminders()
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
  console.log(`[Scheduler] Started — deadline reminders every ${TICK_INTERVAL_MS / HOUR_MS}h`)
}

function stop() {
  if (timer) { clearInterval(timer); timer = null }
}

module.exports = { start, stop, runDeadlineReminders }
