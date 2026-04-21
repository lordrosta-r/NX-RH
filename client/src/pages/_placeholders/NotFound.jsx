// =============================================================================
// NotFound — 404 fallback page
// =============================================================================

import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section style={{ padding: '4rem 0', maxWidth: 640 }}>
      <p
        style={{
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--color-on-surface-variant)',
          marginBottom: '0.5rem',
        }}
      >
        Page introuvable · 404
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
        Cette adresse n’existe pas (ou plus).
      </h1>
      <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '2rem' }}>
        Le lien que vous avez suivi est peut-être obsolète. Reprenez la navigation depuis l’accueil.
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
