// =============================================================================
// Button — shared UI primitive
// Props:
//   children   — label
//   type       — button | submit | reset  (default: button)
//   size       — md | sm                 (default: md)
//   fullWidth  — boolean                 (default: false)
//   disabled   — boolean
//   onClick    — handler
// =============================================================================

import React from 'react'

export default function Button({
  children,
  type     = 'button',
  size     = 'md',
  fullWidth = false,
  disabled  = false,
  onClick,
}) {
  const classes = [
    'btn',
    `btn--${size}`,
    fullWidth ? 'btn--full' : '',
  ].filter(Boolean).join(' ')

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
