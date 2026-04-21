// ============================================================
// AuthContext.jsx — Global authentication context
// Replaces the duplicated hooks/useAuthUser.js pattern.
// Fetches /api/auth/me on mount, exposes user + logout.
// ============================================================

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

// ── Provider ────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // Fetch current session on mount
  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    fetch('/api/auth/me', { credentials: 'include', signal: controller.signal })
      .then(res => {
        clearTimeout(timeoutId)
        if (res.status === 401 || res.status === 403) return null
        if (!res.ok) {
          return res.json().catch(() => ({})).then(data => {
            if (!cancelled) setError(data.error || 'Session invalide')
            return null
          })
        }
        return res.json()
      })
      .then(data => { if (!cancelled && data) setUser(data) })
      .catch(err => {
        clearTimeout(timeoutId)
        if (!cancelled && err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [])

  // Rafraîchit l'état user en re-fetchant /api/auth/me (utilisé après login)
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
      } else {
        setUser(null)
      }
    } catch {
      // Silencieux — l'état reste inchangé
    }
  }, [])

  // Logout: POST then hard-redirect (will switch to navigate later)
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Best-effort — redirect regardless
    }
    sessionStorage.clear()
    window.location.href = '/login'
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, error, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth() must be used inside <AuthProvider>')
  return ctx
}
