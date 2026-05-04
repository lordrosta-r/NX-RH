import React, { forwardRef, useId } from 'react'
import clsx from 'clsx'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string | boolean
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  inputSize?: 'sm' | 'md'
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  inputSize = 'md',
  className,
  id: providedId,
  ...props
}, ref) => {
  const autoId = useId()
  const id = providedId || autoId
  const errorMsg = typeof error === 'string' ? error : undefined
  const hasError = Boolean(error)

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
          {props.required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          className={clsx(
            'w-full rounded-lg border text-sm text-slate-700 placeholder:text-slate-400 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            inputSize === 'md' ? 'h-10 px-3 py-2' : 'h-8 px-3 py-1',
            leftIcon && 'pl-9',
            rightIcon && 'pr-9',
            hasError
              ? 'border-error-500 ring-2 ring-error-200 bg-error-50 focus:ring-error-200 focus:border-error-500'
              : 'border-slate-300 focus:border-primary-500 focus:ring-primary-200',
            props.disabled && 'bg-slate-100 text-slate-400 cursor-not-allowed',
            className
          )}
          aria-invalid={hasError}
          aria-describedby={hint ? `${id}-hint` : errorMsg ? `${id}-error` : undefined}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {rightIcon}
          </span>
        )}
      </div>
      {errorMsg && (
        <p id={`${id}-error`} className="mt-1 text-xs text-error-600">{errorMsg}</p>
      )}
      {hint && !errorMsg && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'
export default Input
