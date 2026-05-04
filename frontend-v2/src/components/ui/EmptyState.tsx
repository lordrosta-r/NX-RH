import React from 'react'
import clsx from 'clsx'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center text-center py-16 px-4', className)}>
      {icon && (
        <div className="mb-4 text-slate-300">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-xs mb-4">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
