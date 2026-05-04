import { useEffect } from 'react'
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import clsx from 'clsx'

export interface ToastProps {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
  duration?: number
  onDismiss: (id: string) => void
}

const TYPE_CONFIG = {
  success: {
    icon: CheckCircle,
    border: 'border-l-success-500',
    iconClass: 'text-success-500',
  },
  error: {
    icon: XCircle,
    border: 'border-l-error-500',
    iconClass: 'text-error-500',
  },
  warning: {
    icon: AlertTriangle,
    border: 'border-l-warning-500',
    iconClass: 'text-warning-500',
  },
  info: {
    icon: Info,
    border: 'border-l-info-500',
    iconClass: 'text-info-500',
  },
}

export default function Toast({ id, type, title, description, duration = 4000, onDismiss }: ToastProps) {
  useEffect(() => {
    if (duration === 0) return
    const timer = setTimeout(() => onDismiss(id), duration)
    return () => clearTimeout(timer)
  }, [id, duration, onDismiss])

  const config = TYPE_CONFIG[type]
  const Icon = config.icon

  return (
    <div
      role="alert"
      aria-live="polite"
      className={clsx(
        'flex items-start gap-3 p-4 rounded-xl shadow-xl border border-slate-200 border-l-4 max-w-sm bg-white',
        config.border
      )}
    >
      <Icon className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', config.iconClass)} aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {description && <p className="text-xs text-slate-600 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
        aria-label="Fermer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
