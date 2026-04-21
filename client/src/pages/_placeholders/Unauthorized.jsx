// =============================================================================
// Unauthorized — 401/403 fallback (rendered when ProtectedRoute rejects)
// =============================================================================

import { Link } from 'react-router-dom'

export default function Unauthorized() {
  return (
    <section style={{ padding: '4rem 0', maxWidth: 640 }}>
      <p
        style={{
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--color-error)',
          marginBottom: '0.5rem',
        }}
      >
        Accès refusé · 401
      </p>
      <h1
        style={{
          fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
          fontWeight: 900,
          lineHeight: 1.1,
          color: 'var(--color-on-surface)',
          marginBottom: '1.25rem',
        }}
      >
        Vous n’avez pas accès à cette ressource.
      </h1>
      <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '2rem' }}>
        Votre rôle ne permet pas d’afficher cette page. Contactez votre administrateur si vous pensez qu’il s’agit d’une erreur.
      </p>
      <Link
        to="/"
        style={{
          display: 'inline-block',
          padding: '0.75rem 1.5rem',
          background: 'var(--color-primary)',
          color: 'var(--color-on-primary)',
          borderRadius: 'var(--radius-full)',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Retour à l’accueil
      </Link>
    </section>
  )
}
