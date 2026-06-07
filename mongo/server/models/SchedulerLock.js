'use strict'

const mongoose = require('mongoose')

const schedulerLockSchema = new mongoose.Schema({
  jobName:   { type: String, required: true, unique: true },
  lockedAt:  { type: Date,   required: true },
  lockedBy:  { type: String, required: true }, // hostname:pid
  expiresAt: { type: Date,   required: true, index: { expireAfterSeconds: 0 } },
}, { timestamps: false })

// TTL index — MongoDB supprime automatiquement les locks expirés
schedulerLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model('SchedulerLock', schedulerLockSchema)
