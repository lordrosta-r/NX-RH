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
    <div className={clsx('flex flex-col gap-1.5 w-full', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-error-500 ml-0.5" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-error-600" role="alert">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
