// apiFetch — wrapper fetch qui throw sur les erreurs HTTP et parse JSON.
// Utiliser à la place de fetch() dans les queryFn / mutationFn.

/**
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
export async function apiFetch(url, options = {}) {
  const r = await fetch(url, { credentials: 'include', ...options })
  if (!r.ok) {
    let msg
    try {
      const body = await r.json()
      msg = body.error || body.message || `Erreur ${r.status}`
    } catch {
      msg = `Erreur ${r.status}`
    }
    throw new Error(msg)
  }
  return r.json()
}
