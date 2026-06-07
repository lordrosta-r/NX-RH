import React, { forwardRef } from 'react'
import clsx from 'clsx'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  tooltip: string
  variant?: 'ghost' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const VARIANT_CLASSES = {
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-300',
  secondary: 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 focus-visible:ring-slate-300',
  danger: 'bg-transparent text-error-600 hover:bg-error-50 focus-visible:ring-error-300',
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({
  icon,
  tooltip,
  variant = 'ghost',
  size = 'md',
  className,
  disabled,
  ...props
}, ref) => (
  <button
    ref={ref}
    type="button"
    title={tooltip}
    aria-label={tooltip}
    disabled={disabled}
    className={clsx(
      'inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
      VARIANT_CLASSES[variant],
      SIZE_CLASSES[size],
      disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
      className
    )}
    {...props}
  >
    {icon}
  </button>
))

IconButton.displayName = 'IconButton'
export default IconButton
