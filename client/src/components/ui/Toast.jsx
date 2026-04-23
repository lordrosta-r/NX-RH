// =============================================================================
// Toast.jsx — Système de notifications toast léger (sans Context)
//
// Usage :
//   import { showToast } from '../components/ui/Toast'
//   showToast({ message: 'Enregistré !', type: 'success' })
//
//   Monter <Toaster /> une seule fois dans main.jsx ou App.jsx.
// =============================================================================

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import './toast.css'

const TOAST_EVENT = 'nx-toast'
const MAX_TOASTS  = 3
const AUTO_CLOSE  = 4000

// ── API publique ──────────────────────────────────────────────────────────────

let _uid = 0

/**
 * Affiche un toast depuis n'importe quel fichier — pas de hook ni de contexte requis.
 * @param {{ message: string, type?: 'success'|'error'|'warning'|'info' }} opts
 */
export function showToast({ message, type = 'info' }) {
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, { detail: { id: ++_uid, message, type } })
  )
}

// ── Icônes par type ───────────────────────────────────────────────────────────

const ICONS = {
  success: <CheckCircle2  size={16} strokeWidth={2} aria-hidden="true" />,
  error:   <XCircle       size={16} strokeWidth={2} aria-hidden="true" />,
  warning: <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />,
  info:    <Info          size={16} strokeWidth={2} aria-hidden="true" />,
}

// ── Composant unique Toast ────────────────────────────────────────────────────

function Toast({ toast, onRemove }) {
  const [exiting, setExiting] = useState(false)

  const dismiss = useCallback(() => {
    setExiting(true)
    setTimeout(() => onRemove(toast.id), 200)
  }, [toast.id, onRemove])

  useEffect(() => {
    const t = setTimeout(dismiss, AUTO_CLOSE)
    return () => clearTimeout(t)
  }, [dismiss])

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`toast toast--${toast.type}${exiting ? ' toast--exiting' : ''}`}
    >
      <span className="toast__icon">{ICONS[toast.type] ?? ICONS.info}</span>
      <span className="toast__message">{toast.message}</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fermer"
        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0 0 0 0.25rem', opacity: 0.75 }}
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  )
}

// ── Toaster (monter une seule fois) ──────────────────────────────────────────

export function Toaster() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    function handler(e) {
      setToasts(prev => {
        const next = [...prev, e.detail]
        return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next
      })
    }
    window.addEventListener(TOAST_EVENT, handler)
    return () => window.removeEventListener(TOAST_EVENT, handler)
  }, [])

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  if (toasts.length === 0) return null

  return createPortal(
    <div className="toast-container" aria-label="Notifications">
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onRemove={remove} />
      ))}
    </div>,
    document.body,
  )
}
