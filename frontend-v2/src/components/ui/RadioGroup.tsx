import React from 'react'
import clsx from 'clsx'

export interface RadioGroupOption {
  value: string
  label: string
  disabled?: boolean
}

export interface RadioGroupProps {
  options: RadioGroupOption[]
  value?: string
  onChange: (value: string) => void
  name: string
  label?: string
  error?: string
  orientation?: 'vertical' | 'horizontal'
}

export default function RadioGroup({
  options,
  value,
  onChange,
  name,
  label,
  error,
  orientation = 'vertical',
}: RadioGroupProps) {
  return (
    <fieldset role="radiogroup">
      {label && <legend className="text-sm font-medium text-slate-700 mb-2">{label}</legend>}
      <div className={clsx('flex gap-3', orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap')}>
        {options.map(opt => (
          <label
            key={opt.value}
            className={clsx(
              'flex items-center gap-2 text-sm text-slate-700 cursor-pointer',
              opt.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => !opt.disabled && onChange(opt.value)}
              disabled={opt.disabled}
              className={clsx(
                'h-4 w-4 border-2 text-primary-500 focus:ring-primary-200',
                value === opt.value ? 'border-primary-500' : 'border-slate-300'
              )}
            />
            {opt.label}
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-error-600" role="alert">{error}</p>}
    </fieldset>
  )
}
