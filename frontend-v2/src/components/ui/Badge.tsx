import React from 'react'
import clsx from 'clsx'

export interface BadgeProps {
  children: React.ReactNode
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'slate'
  className?: string
}

const COLOR_CLASSES = {
  primary: 'bg-primary-50 text-primary-700',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-600',
  error: 'bg-error-50 text-error-700',
  info: 'bg-info-50 text-info-600',
  slate: 'bg-slate-100 text-slate-600',
}

export default function Badge({ children, color = 'slate', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        COLOR_CLASSES[color],
        className
      )}
    >
      {children}
    </span>
  )
}
