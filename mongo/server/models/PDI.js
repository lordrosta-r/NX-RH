'use strict'

const mongoose = require('mongoose');

const actionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: {
    type: String,
    enum: ['formation', 'coaching', 'projet', 'lecture', 'certification', 'autre'],
    default: 'formation',
  },
  description: String,
  targetDate: Date,
  status: {
    type: String,
    enum: ['planned', 'in_progress', 'completed', 'cancelled'],
    default: 'planned',
  },
  completedAt: Date,
  comment: String,
}, { timestamps: true });

const pdiSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  manager:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  campaign:   { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  evaluation: { type: mongoose.Schema.Types.ObjectId, ref: 'Evaluation' },
  period: {
    start: { type: Date, required: true },
    end:   { type: Date, required: true },
  },
  objectives: [String],
  actions: [actionSchema],
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'archived'],
    default: 'draft',
  },
  employeeSignedAt: Date,
  managerSignedAt:  Date,
  notes: String,
}, { timestamps: true });

pdiSchema.index({ employee: 1, status: 1 });
pdiSchema.index({ manager: 1, status: 1 });

module.exports = mongoose.model('PDI', pdiSchema);
