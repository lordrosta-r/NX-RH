// =============================================================================
// config/constants.js — Constantes partagées entre tous les modèles
//
// SOURCE DE VÉRITÉ UNIQUE pour les rôles et types métier.
// Ajouter un rôle ici suffit — pas besoin de modifier chaque modèle.
//
// PRINCIPE LDAP vs LOCAL :
//   • LDAP est utilisé uniquement pour AUTHENTIFIER l'utilisateur.
//   • Le rôle (role) est toujours géré dans la base de données.
//   • Un utilisateur LDAP reçoit le rôle 'employee' à la création automatique.
//   • Un admin modifie ensuite le rôle dans la DB via l'interface d'administration.
//   • Les utilisateurs locaux (authSource: 'local') sont créés manuellement par un admin.
// =============================================================================

const ROLES = ['admin', 'hr', 'director', 'manager', 'employee']

const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Data',
  'Security',
  'Infrastructure',
  'Finance',
  'Legal',
  'HR',
  'Sales',
  'Marketing',
  'Customer Success',
  'Operations',
  'Executive',
]

const QUESTION_TYPES = ['rating', 'text', 'yes_no', 'choice', 'weather', 'mobility', 'n1_import', 'scale', 'objective_item']

const FORM_TYPES = [
  'self_evaluation',
  'manager_evaluation',
  'upward_feedback',
  'director_evaluation',
  'peer_review',
  'objectives',
  'mobility_request',
  'salary_raise_request',
  'promotion_request',
  'training_request',
]

const REQUEST_FORM_TYPES = ['mobility_request', 'salary_raise_request', 'promotion_request', 'training_request']

const ADMIN_ROLES    = ['admin', 'hr']
const MANAGER_ROLES  = ['admin', 'hr', 'director', 'manager']

// Types d'événements calendrier (source de vérité pour models/Event.js)
const EVENT_TYPES    = ['deadline', 'interview', 'meeting', 'feedback', 'campaign']

// Types de ressources documentaires (source de vérité pour models/Resource.js)
const RESOURCE_TYPES = ['pdf', 'xlsx', 'docx', 'pptx']

const CAMPAIGN_STATUSES   = ['draft', 'active', 'closed', 'archived']

const EVALUATION_STATUSES = [
  'assigned', 'in_progress', 'submitted', 'reviewed',
  'signed_evaluatee', 'signed_manager', 'signed_hr', 'validated', 'expired',
  'rejected',   // terminal — demande RH refusée par un RH
  'archived',   // terminal — évaluation annulée suite à un offboarding
]

// Statuts patchables des HR flags (via PATCH /api/hr/flags/:id/status)
// Les statuts assigned et in_progress sont valides en lecture mais ne sont pas patchables via cette route.
const HR_FLAG_STATUSES = ['submitted', 'reviewed', 'validated', 'rejected']

// Actions d'audit — source de vérité pour le champ `action` du modèle AuditLog
const AUDIT_ACTIONS = [
  'login', 'login_failed',
  'status_change', 'evaluation_update', 'reassigned', 'bulk_action',
  'campaign_create', 'campaign_activate', 'campaign_update', 'campaign_delete',
  'offboard', 'offboarding_create', 'offboarding_update', 'offboarding_delete',
  'gdpr_anonymize',
]

const AUTH_SOURCES = ['local', 'ldap']

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12

// Préférences utilisateur — locale, thème, notifications
const LOCALES = ['fr', 'en']
const THEMES  = ['dark', 'light', 'light-sidebar', 'system']
const NOTIF_PREF_KEYS = [
  'campaignLaunch',
  'evaluationAssigned',
  'evaluationSubmitted',
  'deadlineReminder',
  'managerActionRequired',
  'systemAlerts',
  'bulkReminder',
  'request_treated',
  'request_rejected',
]

// Mapping des notifications pertinentes par rôle.
// Source de vérité unique : le backend filtre /me et valide PATCH /preferences
// d'après cette table — le front se contente d'afficher ce qu'il reçoit.
const NOTIF_KEYS_BY_ROLE = {
  employee: ['evaluationAssigned', 'deadlineReminder', 'managerActionRequired', 'bulkReminder', 'request_treated', 'request_rejected'],
  manager:  ['evaluationAssigned', 'deadlineReminder', 'evaluationSubmitted', 'bulkReminder'],
  director: ['evaluationAssigned', 'deadlineReminder', 'evaluationSubmitted', 'bulkReminder'],
  hr:       ['evaluationAssigned', 'deadlineReminder', 'evaluationSubmitted', 'campaignLaunch', 'bulkReminder'],
  admin:    ['evaluationAssigned', 'deadlineReminder', 'evaluationSubmitted', 'campaignLaunch', 'systemAlerts', 'bulkReminder'],
}

// Types de notifications in-app (source de vérité pour models/Notification.js)
const NOTIFICATION_TYPES = [
  'eval_assigned', 'eval_submitted', 'eval_reviewed',
  'eval_signed_evaluatee', 'eval_signed_manager', 'eval_signed_hr',
  'eval_reminder_deadline', 'eval_expired',
  'campaign_launched', 'campaign_closed',
  'request_submitted', 'request_treated', 'request_rejected',
  'reminder', 'system',
]

module.exports = {
  ROLES, DEPARTMENTS, QUESTION_TYPES, FORM_TYPES, REQUEST_FORM_TYPES,
  ADMIN_ROLES, MANAGER_ROLES,
  EVENT_TYPES, RESOURCE_TYPES,
  CAMPAIGN_STATUSES, EVALUATION_STATUSES, AUTH_SOURCES,
  HR_FLAG_STATUSES, AUDIT_ACTIONS,
  BCRYPT_ROUNDS,
  LOCALES, THEMES, NOTIF_PREF_KEYS, NOTIF_KEYS_BY_ROLE, NOTIFICATION_TYPES,
}
