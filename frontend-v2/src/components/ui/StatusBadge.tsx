import type { EvaluationStatus, CampaignStatus } from '../../types'

type BadgeStatus = EvaluationStatus | CampaignStatus

const LABELS: Record<BadgeStatus, string> = {
  // Evaluation
  assigned:         'Assigné',
  in_progress:      'En cours',
  submitted:        'Soumis',
  reviewed:         'À revoir',
  signed_evaluatee: 'Signé (évalué)',
  signed_manager:   'Signé (manager)',
  signed_hr:        'Signé (RH)',
  validated:        'Validé',
  expired:          'Expiré',
  archived:         'Archivé',
  // Campaign
  draft:   'Brouillon',
  active:  'Active',
  closed:  'Clôturée',
}

const CLASSES: Record<BadgeStatus, string> = {
  assigned:         'bg-warning-50 text-warning-700',
  in_progress:      'bg-primary-50 text-primary-700',
  submitted:        'bg-success-50 text-success-700',
  reviewed:         'bg-warning-50 text-warning-700',
  signed_evaluatee: 'bg-primary-50 text-primary-700',
  signed_manager:   'bg-primary-50 text-primary-700',
  signed_hr:        'bg-primary-50 text-primary-700',
  validated:        'bg-success-50 text-success-700',
  expired:          'bg-error-50 text-error-700',
  archived:         'bg-slate-100 text-slate-600',
  draft:            'bg-slate-100 text-slate-600',
  active:           'bg-success-50 text-success-700',
  closed:           'bg-error-50 text-error-700',
}

interface Props {
  status: BadgeStatus
}

export default function StatusBadge({ status }: Props) {
  return (
    <span className={`${CLASSES[status] ?? 'bg-slate-100 text-slate-600'} px-2 py-1 rounded-full text-xs font-medium`}>
      {LABELS[status] ?? status}
    </span>
  )
}
