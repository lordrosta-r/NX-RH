import React from 'react'
import clsx from 'clsx'
import { CheckCircle2, Clock, AlertTriangle, XCircle, Info, Circle } from 'lucide-react'

export type BadgeColor = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'slate'

export interface BadgeProps {
  children: React.ReactNode
  color?: BadgeColor
  className?: string
  /** Affiche une icône de tonalité (repère non-coloré pour le daltonisme). */
  withIcon?: boolean
}

const COLOR_CLASSES: Record<BadgeColor, string> = {
  primary: 'bg-primary-50 text-primary-700',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-600',
  error: 'bg-error-50 text-error-700',
  info: 'bg-info-50 text-info-600',
  slate: 'bg-slate-100 text-slate-600',
}

// Repère non-coloré : une icône lucide distincte par tonalité, pour ne pas
// dépendre uniquement de la couleur (accessibilité daltonisme, WCAG 1.4.1).
const COLOR_ICONS: Record<BadgeColor, typeof CheckCircle2> = {
  primary: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Clock,
  slate: Circle,
}

export default function Badge({ children, color = 'slate', className, withIcon = false }: BadgeProps) {
  const Icon = COLOR_ICONS[color]
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
        COLOR_CLASSES[color],
        className
      )}
    >
      {withIcon && <Icon size={12} strokeWidth={2} aria-hidden="true" />}
      {children}
    </span>
  )
}
