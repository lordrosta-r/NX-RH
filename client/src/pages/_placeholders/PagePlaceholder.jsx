// =============================================================================
// PagePlaceholder — temporary stub for routes not yet migrated.
// Provides a minimal but on-brand "in progress" surface so the SPA shell stays
// consistent until the real page lands. Will be removed at the end of Phase 4.
// =============================================================================

export default function PagePlaceholder({ title, role, hint }) {
  return (
    <section style={{ padding: '4rem 0', maxWidth: 720 }}>
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
        {role ? `Espace ${role}` : 'NanoXplore RH'} · En préparation
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
        {title}
      </h1>
      <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--color-on-surface-variant)' }}>
        {hint ??
          'Cet écran fait partie de la migration SPA en cours. Le rendu final reprendra les designs validés et les flows métier décrits dans la documentation.'}
      </p>
    </section>
  )
}
