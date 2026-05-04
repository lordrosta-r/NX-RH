import { useState, useCallback, useEffect } from 'react'

export interface ToastItem {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
  duration: number
}

interface ToastStore {
  toasts: ToastItem[]
  add: (item: Omit<ToastItem, 'id'>) => void
  dismiss: (id: string) => void
  dismissAll: () => void
}

// Singleton store (module-level) so multiple consumers share state
let listeners: Array<(toasts: ToastItem[]) => void> = []
let store: ToastItem[] = []

function notify() {
  listeners.forEach(l => l([...store]))
}

export function addToast(item: Omit<ToastItem, 'id'>) {
  const id = Math.random().toString(36).slice(2)
  store = [...store, { ...item, id }]
  notify()
  if (item.duration !== 0) {
    setTimeout(() => dismissToast(id), item.duration)
  }
  return id
}

export function dismissToast(id: string) {
  store = store.filter(t => t.id !== id)
  notify()
}

export function dismissAllToasts() {
  store = []
  notify()
}

export function useToast(): ToastStore {
  const [toasts, setToasts] = useState<ToastItem[]>([...store])

  useEffect(() => {
    listeners.push(setToasts)
    return () => {
      listeners = listeners.filter(l => l !== setToasts)
    }
  }, [])

  const add = useCallback((item: Omit<ToastItem, 'id'>) => {
    addToast(item)
  }, [])

  return {
    toasts,
    add,
    dismiss: dismissToast,
    dismissAll: dismissAllToasts,
  }
}

// Convenience API
export const toast = {
  success: (title: string, description?: string, duration = 4000) =>
    addToast({ type: 'success', title, description, duration }),
  error: (title: string, description?: string, duration = 6000) =>
    addToast({ type: 'error', title, description, duration }),
  warning: (title: string, description?: string, duration = 5000) =>
    addToast({ type: 'warning', title, description, duration }),
  info: (title: string, description?: string, duration = 4000) =>
    addToast({ type: 'info', title, description, duration }),
}
