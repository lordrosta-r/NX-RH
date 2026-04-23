// =============================================================================
// Skeleton — Composants de chargement animés (shimmer)
//
// Exports :
//   Skeleton        — bloc de base (width/height dynamiques)
//   SkeletonText    — groupe de lignes de texte
//   SkeletonCard    — carte avec titre + lignes + barre de progression
//   SkeletonTable   — tableau avec en-tête + N lignes × M colonnes
//   SkeletonStat    — tuile KPI (icône + chiffre + label + sous-label)
// =============================================================================

import './skeleton.css'

/** Bloc skeleton de base. `width` et `height` acceptent toute valeur CSS. */
export function Skeleton({ width, height, variant = 'rect', className = '', style = {} }) {
  const variantClass = variant === 'circle' ? 'skeleton--circle'
    : variant === 'text' ? 'skeleton--text'
    : ''
  return (
    <span
      className={['skeleton', variantClass, className].filter(Boolean).join(' ')}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  )
}

/** Groupe de lignes de texte. La dernière ligne est plus courte. */
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={['sk-text-group', className].filter(Boolean).join(' ')} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} variant="text" className={i === lines - 1 ? 'sk-text-last' : ''} />
      ))}
    </div>
  )
}

/** Carte de chargement — badge + titre + 2 lignes + barre de progression + boutons. */
export function SkeletonCard({ className = '' }) {
  return (
    <div className={['sk-card', className].filter(Boolean).join(' ')} aria-hidden="true">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Skeleton className="sk-card__title" />
        <Skeleton className="sk-card__badge" />
      </div>
      <Skeleton className="sk-card__line" />
      <Skeleton className="sk-card__line sk-card__line--short" />
      <Skeleton className="sk-card__progress" />
      <div className="sk-card__actions">
        <Skeleton className="sk-card__btn" />
        <Skeleton className="sk-card__btn" />
      </div>
    </div>
  )
}

/** Tableau de chargement — en-tête + N lignes × M colonnes. */
export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="sk-table" aria-hidden="true">
      <div className="sk-table__head">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} className="sk-table__cell" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="sk-table__row">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton
              key={c}
              className={c === 0 ? 'sk-table__cell sk-table__cell--first' : 'sk-table__cell'}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Tuile KPI de chargement — icône cercle + grande valeur + label + sous-label. */
export function SkeletonStat({ className = '' }) {
  return (
    <div className={['sk-stat', className].filter(Boolean).join(' ')} aria-hidden="true">
      <Skeleton variant="circle" className="sk-stat__icon" />
      <Skeleton className="sk-stat__value" />
      <Skeleton className="sk-stat__label" />
      <Skeleton className="sk-stat__sub" />
    </div>
  )
}
