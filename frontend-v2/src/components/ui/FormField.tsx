import React from 'react'
import clsx from 'clsx'

export interface FormFieldProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
  htmlFor?: string
}

export default function FormField({ label, hint, error, required, children, className, htmlFor }: FormFieldProps) {
  return (
    <div className={clsx('w-full', className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
          {required && <span className="text-error-500 ml-1" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {error && <p className="mt-1 text-xs text-error-600" role="alert">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
