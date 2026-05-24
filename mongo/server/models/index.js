// =============================================================================
// models/index.js — Barrel export de tous les models Mongoose
// =============================================================================

const User       = require('./User')
const Config     = require('./Config')
const { Campaign, VALID_TRANSITIONS: CAMPAIGN_TRANSITIONS }                                       = require('./Campaign')
const Form       = require('./Form')
const { Evaluation, VALID_TRANSITIONS: EVAL_TRANSITIONS, ROLE_TRANSITIONS, LOCKED_STATUSES }      = require('./Evaluation')
const Resource   = require('./Resource')
const Event      = require('./Event')
const AuditLog   = require('./AuditLog')
const { OffboardingRequest }                                                               = require('./OffboardingRequest')
const Sector       = require('./Sector')
const MailTemplate = require('./MailTemplate')
const Notification = require('./Notification')
const UserGroup  = require('./UserGroup')
const { AUDIT_ACTIONS } = require('../config/constants')

module.exports = {
  User, Config, Campaign, Form, Evaluation, Resource, Event, AuditLog, OffboardingRequest,
  Sector, MailTemplate, Notification, UserGroup,
  CAMPAIGN_TRANSITIONS, EVAL_TRANSITIONS, EVALUATION_TRANSITIONS: EVAL_TRANSITIONS, ROLE_TRANSITIONS, LOCKED_STATUSES,
  VALID_TRANSITIONS: EVAL_TRANSITIONS,
  AUDIT_ACTIONS,
}
