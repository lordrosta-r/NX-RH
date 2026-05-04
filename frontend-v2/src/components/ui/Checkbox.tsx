import React, { forwardRef, useId, useRef, useEffect } from 'react'
import clsx from 'clsx'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  indeterminate?: boolean
  error?: boolean
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  label,
  indeterminate = false,
  error = false,
  className,
  id: providedId,
  ...props
}, ref) => {
  const autoId = useId()
  const id = providedId || autoId
  const innerRef = useRef<HTMLInputElement>(null)
  const resolvedRef = (ref as React.RefObject<HTMLInputElement>) || innerRef

  useEffect(() => {
    if (resolvedRef.current) {
      resolvedRef.current.indeterminate = indeterminate
    }
  }, [indeterminate, resolvedRef])

  return (
    <div className="flex items-center gap-2">
      <input
        ref={resolvedRef}
        type="checkbox"
        id={id}
        className={clsx(
          'h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-primary-200 focus:ring-2 transition-colors',
          error && 'border-error-500',
          className
        )}
        {...props}
      />
      {label && (
        <label htmlFor={id} className="text-sm text-slate-700 select-none cursor-pointer">
          {label}
        </label>
      )}
    </div>
  )
})

Checkbox.displayName = 'Checkbox'
export default Checkbox
