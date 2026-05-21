// Statuts évaluations avec labels FR et couleurs Tailwind
export const EVALUATION_STATUS_CONFIG = {
  assigned: {
    label: 'Assignée',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    dotColor: 'bg-slate-400',
  },
  in_progress: {
    label: 'En cours',
    color: 'bg-info-50 text-info-600 border-info-200',
    dotColor: 'bg-info-500',
  },
  submitted: {
    label: 'Soumise',
    color: 'bg-warning-50 text-warning-600 border-warning-200',
    dotColor: 'bg-warning-500',
  },
  reviewed: {
    label: 'Révisée',
    color: 'bg-primary-50 text-primary-700 border-primary-200',
    dotColor: 'bg-primary-500',
  },
  signed_evaluatee: {
    label: 'Signée (évalué)',
    color: 'bg-primary-50 text-primary-700 border-primary-200',
    dotColor: 'bg-primary-600',
  },
  signed_manager: {
    label: 'Signée (manager)',
    color: 'bg-primary-100 text-primary-800 border-primary-300',
    dotColor: 'bg-primary-700',
  },
  signed_hr: {
    label: 'Signée (RH)',
    color: 'bg-success-50 text-success-600 border-success-200',
    dotColor: 'bg-success-500',
  },
  validated: {
    label: 'Validée',
    color: 'bg-success-50 text-success-700 border-success-200',
    dotColor: 'bg-success-600',
  },
  expired: {
    label: 'Expirée',
    color: 'bg-error-50 text-error-600 border-error-200',
    dotColor: 'bg-error-500',
  },
  archived: {
    label: 'Archivée',
    color: 'bg-slate-100 text-slate-500 border-slate-200',
    dotColor: 'bg-slate-400',
  },
} as const

export type EvaluationStatus = keyof typeof EVALUATION_STATUS_CONFIG

// Statuts campagnes
export const CAMPAIGN_STATUS_CONFIG = {
  draft: {
    label: 'Brouillon',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  active: {
    label: 'Active',
    color: 'bg-success-50 text-success-700 border-success-200',
  },
  closed: {
    label: 'Clôturée',
    color: 'bg-warning-50 text-warning-700 border-warning-200',
  },
  archived: {
    label: 'Archivée',
    color: 'bg-slate-100 text-slate-500 border-slate-200',
  },
} as const

export type CampaignStatus = keyof typeof CAMPAIGN_STATUS_CONFIG

// Rôles utilisateurs
export const ROLE_CONFIG = {
  admin: { label: 'Administrateur', color: 'bg-error-50 text-error-700 border-error-200' },
  hr: { label: 'RH', color: 'bg-primary-50 text-primary-700 border-primary-200' },
  manager: { label: 'Manager', color: 'bg-info-50 text-info-700 border-info-200' },
  employee: { label: 'Collaborateur', color: 'bg-slate-100 text-slate-700 border-slate-200' },
} as const

export type Role = keyof typeof ROLE_CONFIG

// Types de questions
export const QUESTION_TYPE_CONFIG = {
  text: { label: 'Texte libre' },
  rating: { label: 'Note (1-5)' },
  multiple_choice: { label: 'Choix multiple' },
  yes_no: { label: 'Oui / Non' },
  textarea: { label: 'Texte long' },
} as const

// Types de notifications
export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  campaign_started: 'Campagne démarrée',
  evaluation_assigned: 'Évaluation assignée',
  evaluation_submitted: 'Évaluation soumise',
  evaluation_reviewed: 'Évaluation révisée',
  evaluation_signed: 'Évaluation signée',
  evaluation_validated: 'Évaluation validée',
  evaluation_reminder: 'Rappel évaluation',
  campaign_reminder: 'Rappel campagne',
  hr_flag_created: 'Signal RH créé',
  hr_flag_resolved: 'Signal RH résolu',
  campaign_closed: 'Campagne clôturée',
  campaign_archived: 'Campagne archivée',
  bulk_action_complete: 'Action groupée terminée',
  import_complete: 'Import terminé',
  offboarding_started: 'Offboarding démarré',
}

// Phases formulaire
export const FORM_PHASES = {
  employee: 'Phase collaborateur',
  manager: 'Phase manager',
  both: 'Les deux phases',
} as const

// Pagination
export const DEFAULT_PAGE_SIZE = 20
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

// API routes
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050'
