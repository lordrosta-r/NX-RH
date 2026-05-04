import React from 'react'
import clsx from 'clsx'

export interface CheckboxGroupOption {
  value: string
  label: string
  disabled?: boolean
}

export interface CheckboxGroupProps {
  options: CheckboxGroupOption[]
  value: string[]
  onChange: (values: string[]) => void
  label?: string
  error?: string
  orientation?: 'vertical' | 'horizontal'
}

export default function CheckboxGroup({
  options,
  value,
  onChange,
  label,
  error,
  orientation = 'vertical',
}: CheckboxGroupProps) {
  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v])
  }

  return (
    <fieldset>
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
              type="checkbox"
              checked={value.includes(opt.value)}
              onChange={() => !opt.disabled && toggle(opt.value)}
              disabled={opt.disabled}
              className="h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-primary-200"
            />
            {opt.label}
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-error-600" role="alert">{error}</p>}
    </fieldset>
  )
}
