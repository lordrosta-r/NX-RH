import React from 'react'
import Toast from './Toast'
import { useToast } from '../../hooks/useToast'

export default function ToastContainer() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto animate-slideInUp">
          <Toast
            id={t.id}
            type={t.type}
            title={t.title}
            description={t.description}
            duration={0}
            onDismiss={dismiss}
          />
        </div>
      ))}
    </div>
  )
}
