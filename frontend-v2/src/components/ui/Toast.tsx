import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title?: string
  message: string
  duration?: number
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  error:   <AlertCircle className="w-5 h-5 text-red-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  info:    <Info className="w-5 h-5 text-blue-500" />,
}

const BORDER: Record<ToastType, string> = {
  success: 'border-l-4 border-green-500',
  error:   'border-l-4 border-red-500',
  warning: 'border-l-4 border-amber-500',
  info:    'border-l-4 border-blue-500',
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const duration = toast.duration ?? 4000

  useEffect(() => {
    if (duration > 0) {
      timer.current = setTimeout(() => onRemove(toast.id), duration)
    }
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [toast.id, duration, onRemove])

  return (
    <div
      role="alert"
      className={clsx(
        'flex items-start gap-3 p-4 rounded-xl shadow-lg bg-white w-80',
        BORDER[toast.type],
      )}
    >
      <span className="flex-shrink-0 mt-0.5">{ICONS[toast.type]}</span>
      <div className="flex-1 min-w-0">
        {toast.title && <p className="text-sm font-semibold text-slate-900">{toast.title}</p>}
        <p className="text-sm text-slate-600">{toast.message}</p>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        aria-label="Fermer"
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastContainer>')
  return ctx
}

/** Drop-in: place once in AppLayout. Provides context + renders toasts. */
export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `t-${Date.now()}`
    setToasts(prev => [...prev, { ...toast, id }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
