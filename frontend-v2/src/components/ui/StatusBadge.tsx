import { FileEdit, CheckCircle2, Lock, Archive } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Chaque statut porte un repère non-coloré (icône lucide) en plus de la
// couleur et du libellé, pour rester distinguable sans perception des
// couleurs (accessibilité daltonisme, WCAG 1.4.1).
const STATUS_CONFIG: Record<string, { label: string; className: string; Icon: LucideIcon }> = {
  draft:    { label: 'Brouillon', className: 'bg-slate-100 text-slate-600',   Icon: FileEdit },
  active:   { label: 'Active',    className: 'bg-success-50 text-success-700', Icon: CheckCircle2 },
  closed:   { label: 'Clôturée', className: 'bg-warning-50 text-warning-700', Icon: Lock },
  archived: { label: 'Archivée', className: 'bg-slate-100 text-slate-500',    Icon: Archive },
}

export function StatusBadge({ status }: { status?: string }) {
  const config = status ? STATUS_CONFIG[status] : undefined
  if (!config) return null
  const { Icon } = config
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      <Icon size={12} strokeWidth={2} aria-hidden="true" />
      {config.label}
    </span>
  )
}
