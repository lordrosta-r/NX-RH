import { useState, useEffect, useCallback } from 'react'

// =============================================================================
// useRouter — minimal History API router scoped to a basePath.
//
// Returns { path, navigate } where `path` is the subpath relative to basePath
// (e.g. '' for /employee, 'evaluation' for /employee/evaluation).
//
// Also intercepts <a href> clicks under basePath for SPA navigation
// (preventDefault + pushState, no full reload).
// =============================================================================

function computeSubpath(basePath) {
  const full = window.location.pathname
  if (full === basePath) return ''
  if (full.startsWith(basePath + '/')) {
    return full.slice(basePath.length + 1).replace(/\/+$/, '')
  }
  return ''
}

export function useRouter(basePath) {
  const [path, setPath] = useState(() => computeSubpath(basePath))

  const navigate = useCallback((subpath) => {
    const clean = (subpath || '').replace(/^\/+|\/+$/g, '')
    const target = clean ? `${basePath}/${clean}` : basePath
    if (target !== window.location.pathname) {
      window.history.pushState({}, '', target)
    }
    setPath(clean)
    // scroll top sur navigation interne
    window.scrollTo(0, 0)
  }, [basePath])

  // popstate (back/forward)
  useEffect(() => {
    const onPop = () => setPath(computeSubpath(basePath))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [basePath])

  // Click interceptor pour les liens internes au basePath
  useEffect(() => {
    const onClick = (e) => {
      if (e.defaultPrevented) return
      if (e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      const a = e.target.closest && e.target.closest('a')
      if (!a) return

      const href = a.getAttribute('href')
      if (!href) return
      if (a.target && a.target !== '' && a.target !== '_self') return
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return
      if (a.hasAttribute('download')) return

      let url
      try { url = new URL(href, window.location.origin) } catch { return }
      if (url.origin !== window.location.origin) return
      if (url.pathname !== basePath && !url.pathname.startsWith(basePath + '/')) return

      e.preventDefault()
      const sub = url.pathname === basePath ? '' : url.pathname.slice(basePath.length + 1)
      navigate(sub)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [basePath, navigate])

  return { path, navigate }
}

export default useRouter
