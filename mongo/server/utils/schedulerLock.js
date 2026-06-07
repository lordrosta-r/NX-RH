'use strict'

const os             = require('os')
const SchedulerLock  = require('../models/SchedulerLock')
const logger         = require('./logger')

const INSTANCE_ID = `${os.hostname()}:${process.pid}`

/**
 * Tente d'acquérir un lock pour un job.
 * Retourne true si le lock est acquis, false sinon.
 */
async function acquireLock(jobName, ttlSeconds = 300) {
  const now       = new Date()
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000)

  try {
    // findOneAndUpdate avec upsert — atomique grâce à MongoDB
    const result = await SchedulerLock.findOneAndUpdate(
      {
        jobName,
        $or: [
          { expiresAt: { $lt: now } }, // lock expiré
          { lockedBy: INSTANCE_ID },   // notre propre lock
        ],
      },
      {
        $set: { lockedAt: now, lockedBy: INSTANCE_ID, expiresAt },
      },
      { upsert: true, new: true },
    )
    return !!result
  } catch (err) {
    // Duplicate key = un autre process a le lock
    if (err.code === 11000) return false
    logger.error(`[schedulerLock] acquireLock error for ${jobName}:`, err.message)
    return false
  }
}

/**
 * Libère le lock après l'exécution du job.
 */
async function releaseLock(jobName) {
  try {
    await SchedulerLock.deleteOne({ jobName, lockedBy: INSTANCE_ID })
  } catch (err) {
    logger.error(`[schedulerLock] releaseLock error for ${jobName}:`, err.message)
  }
}

/**
 * Wrapper qui exécute une fonction seulement si le lock est acquis.
 */
async function withLock(jobName, ttlSeconds, fn) {
  const acquired = await acquireLock(jobName, ttlSeconds)
  if (!acquired) {
    logger.info(`[schedulerLock] Job "${jobName}" skipped — lock held by another instance`)
    return
  }
  try {
    await fn()
  } finally {
    await releaseLock(jobName)
  }
}

module.exports = { acquireLock, releaseLock, withLock, INSTANCE_ID }
