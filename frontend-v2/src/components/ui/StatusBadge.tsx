
import clsx from 'clsx'

type CampaignStatus = 'draft' | 'active' | 'closed' | 'archived'
type EvaluationStatus =
  | 'assigned' | 'in_progress' | 'submitted' | 'reviewed'
  | 'signed_evaluatee' | 'signed_manager'
  | 'validated' | 'expired' | 'archived'

export type StatusType = CampaignStatus | EvaluationStatus

interface StatusConfig {
  label: string
  classes: string
}

const STATUS_MAP: Record<StatusType, StatusConfig> = {
  // Campaign statuses
  draft:            { label: 'Brouillon',      classes: 'bg-slate-100 text-slate-600' },
  active:           { label: 'Active',          classes: 'bg-primary-100 text-primary-700' },
  closed:           { label: 'Clôturée',        classes: 'bg-warning-50 text-warning-600' },
  archived:         { label: 'Archivée',        classes: 'bg-slate-200 text-slate-500' },
  // Evaluation statuses
  assigned:         { label: 'Assignée',        classes: 'bg-info-50 text-info-600' },
  in_progress:      { label: 'En cours',        classes: 'bg-primary-100 text-primary-700' },
  submitted:        { label: 'Soumise',         classes: 'bg-warning-50 text-warning-600' },
  reviewed:         { label: 'Vérifiée',        classes: 'bg-success-50 text-success-600' },
  signed_evaluatee: { label: 'Signée (collaborateur)', classes: 'bg-info-50 text-info-600' },
  signed_manager:   { label: 'Signée (manager)',       classes: 'bg-primary-100 text-primary-700' },
  validated:        { label: 'Validée',         classes: 'bg-success-50 text-success-700' },
  expired:          { label: 'Expirée',         classes: 'bg-error-50 text-error-600' },
}

export interface StatusBadgeProps {
  status: StatusType
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_MAP[status] ?? { label: status, classes: 'bg-slate-100 text-slate-600' }
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.classes,
        className
      )}
    >
      {config.label}
    </span>
  )
}
