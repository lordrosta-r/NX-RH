type Step = {
  label: string
  description?: string
}

type StepperProps = {
  steps: Step[]
  currentStep: number // 0-indexed
}

export default function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <nav aria-label="Étapes" className="flex items-center gap-0 mb-8">
      {steps.map((step, i) => {
        const done = i < currentStep
        const active = i === currentStep
        return (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                done ? 'bg-primary-600 text-white' : active ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-600' : 'bg-slate-100 text-slate-400'
              }`}>
                {done ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : i + 1}
              </div>
              <div className="mt-1 text-center">
                <p className={`text-xs font-semibold ${active ? 'text-primary-700' : done ? 'text-primary-500' : 'text-slate-400'}`}>{step.label}</p>
                {step.description && <p className="text-xs text-slate-400 hidden md:block">{step.description}</p>}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mt-[-18px] ${done ? 'bg-primary-500' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
    </nav>
  )
}
