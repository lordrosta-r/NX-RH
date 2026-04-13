// =============================================================================
// hooks/useAuthUser.js — Revalidation de session côté client
//
// Vérifie que le cookie JWT est encore valide via GET /api/auth/me.
// Retourne l'utilisateur courant ou null si la session est expirée.
//
// Usage :
//   const { user, loading, error } = useAuthUser()
//   if (loading) return <Spinner />
//   if (!user)   return null // redirect handled inside hook
// =============================================================================

import { useState, useEffect } from 'react'

/**
 * Vérifie la session via /api/auth/me et retourne l'utilisateur courant.
 * Si la session est invalide, redirige vers / (login).
 *
 * @param {Object} options
 * @param {boolean} [options.redirect=true]  Rediriger vers / si non authentifié
 * @returns {{ user: Object|null, loading: boolean, error: string|null }}
 */
export function useAuthUser({ redirect = true } = {}) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    fetch('/api/auth/me', { credentials: 'include', signal: controller.signal })
      .then(res => {
        clearTimeout(timeoutId)
        if (redirect && (res.status === 401 || res.status === 403)) {
          window.location.href = '/'
          return null
        }
        if (!res.ok) return res.json().catch(() => ({})).then(data => { if (!cancelled) setError(data.error || 'Session invalide'); return null })
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
  }, [redirect])

  return { user, loading, error }
}
