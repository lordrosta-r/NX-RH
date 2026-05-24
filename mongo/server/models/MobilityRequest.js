'use strict'

const mongoose = require('mongoose');

const mobilityRequestSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currentPosition: { type: String },
  currentDepartment: { type: String },
  targetPosition: { type: String, required: true },
  targetDepartment: { type: String },
  targetSite: { type: String },
  requestType: {
    type: String,
    enum: ['internal_transfer', 'promotion', 'lateral_move', 'site_change', 'department_change'],
    default: 'internal_transfer',
    required: true,
  },
  motivation: { type: String, maxlength: 2000 },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'on_hold'],
    default: 'pending',
  },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  hrComment: { type: String },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  targetDate: { type: Date },
}, { timestamps: true });

mobilityRequestSchema.index({ employeeId: 1, status: 1 });
mobilityRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('MobilityRequest', mobilityRequestSchema);
