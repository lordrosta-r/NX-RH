import React, { useState } from 'react'
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import clsx from 'clsx'

export interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  description: string
  dismissible?: boolean
  onDismiss?: () => void
  action?: { label: string; onClick: () => void }
}

const TYPE_CONFIG = {
  success: {
    icon: CheckCircle,
    classes: 'border-l-success-500 bg-success-50',
    iconClass: 'text-success-500',
    titleClass: 'text-success-800',
    descClass: 'text-success-700',
  },
  error: {
    icon: XCircle,
    classes: 'border-l-error-500 bg-error-50',
    iconClass: 'text-error-500',
    titleClass: 'text-error-800',
    descClass: 'text-error-700',
  },
  warning: {
    icon: AlertTriangle,
    classes: 'border-l-warning-500 bg-warning-50',
    iconClass: 'text-warning-500',
    titleClass: 'text-warning-800',
    descClass: 'text-warning-700',
  },
  info: {
    icon: Info,
    classes: 'border-l-info-500 bg-info-50',
    iconClass: 'text-info-600',
    titleClass: 'text-info-800',
    descClass: 'text-info-700',
  },
}

export default function Alert({ type, title, description, dismissible = false, onDismiss, action }: AlertProps) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const config = TYPE_CONFIG[type]
  const Icon = config.icon

  function handleDismiss() {
    setDismissed(true)
    onDismiss?.()
  }

  return (
    <div
      role="alert"
      className={clsx(
        'flex items-start gap-3 p-4 rounded-xl border-l-4',
        config.classes
      )}
    >
      <Icon className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', config.iconClass)} aria-hidden />
      <div className="flex-1 min-w-0">
        {title && <p className={clsx('text-sm font-semibold mb-0.5', config.titleClass)}>{title}</p>}
        <p className={clsx('text-sm', config.descClass)}>{description}</p>
        {action && (
          <button
            onClick={action.onClick}
            className={clsx('mt-2 text-sm font-medium underline', config.titleClass)}
          >
            {action.label}
          </button>
        )}
      </div>
      {dismissible && (
        <button
          onClick={handleDismiss}
          className={clsx('flex-shrink-0 transition-colors', config.iconClass)}
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
