import React from 'react'
import { ArrowLeft } from 'lucide-react'
import clsx from 'clsx'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  backHref?: string
  onBack?: () => void
  className?: string
}

export default function PageHeader({ title, subtitle, actions, backHref, onBack, className }: PageHeaderProps) {
  function handleBack(e: React.MouseEvent) {
    if (onBack) {
      e.preventDefault()
      onBack()
    }
  }

  return (
    <div className={clsx('flex items-start justify-between gap-4 mb-6', className)}>
      <div className="flex items-start gap-3 min-w-0">
        {(backHref || onBack) && (
          <a
            href={backHref || '#'}
            onClick={handleBack}
            className="mt-1 flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors rounded-lg p-1 focus-visible:ring-2 focus-visible:ring-primary-300"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </a>
        )}
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-slate-900 leading-tight truncate">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>}
    </div>
  )
}
