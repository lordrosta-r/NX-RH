import React from 'react'
import { Check } from 'lucide-react'
import clsx from 'clsx'

export interface Step {
  label: string
  description?: string
}

export interface ProgressStepsProps {
  steps: Step[]
  currentStep: number  // 0-indexed
  className?: string
}

export default function ProgressSteps({ steps, currentStep, className }: ProgressStepsProps) {
  return (
    <nav aria-label="Progression" className={clsx('flex items-center', className)}>
      {steps.map((step, i) => {
        const completed = i < currentStep
        const active = i === currentStep
        const upcoming = i > currentStep
        const isLast = i === steps.length - 1

        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center">
              <div
                className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                  completed && 'bg-primary-500 text-white',
                  active && 'bg-primary-500 text-white ring-4 ring-primary-100',
                  upcoming && 'bg-white border-2 border-slate-300 text-slate-400'
                )}
                aria-current={active ? 'step' : undefined}
              >
                {completed ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={clsx(
                  'mt-1 text-xs font-medium whitespace-nowrap',
                  active && 'text-primary-700',
                  completed && 'text-slate-600',
                  upcoming && 'text-slate-400'
                )}
              >
                {step.label}
              </span>
              {step.description && active && (
                <span className="text-xs text-slate-500 mt-0.5">{step.description}</span>
              )}
            </div>
            {!isLast && (
              <div
                className={clsx(
                  'flex-1 h-0.5 mx-2 mb-5 rounded',
                  completed ? 'bg-primary-500' : 'bg-slate-200'
                )}
              />
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
