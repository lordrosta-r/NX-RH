// =============================================================================
// Button — shared UI primitive
// Props:
//   children   — label
//   type       — button | submit | reset  (default: button)
//   variant    — primary | secondary | danger | ghost  (default: primary)
//   size       — md | sm                 (default: md)
//   fullWidth  — boolean                 (default: false)
//   loading    — boolean (shows spinner, disables button)
//   disabled   — boolean
//   onClick    — handler
// =============================================================================

import React from 'react'


export default function Button({
  children,
  type     = 'button',
  variant  = 'primary',
  size     = 'md',
  fullWidth = false,
  loading   = false,
  disabled  = false,
  onClick,
  ...rest
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? 'btn--full' : '',
  ].filter(Boolean).join(' ')

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
      {...rest}
    >
      {loading ? (
        <span className="btn__spinner" aria-hidden="true" />
      ) : null}
      {children}
    </button>
  )
}
