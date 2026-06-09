import { useState, useEffect } from 'react'
import { Info, X } from 'lucide-react'

interface PageGuideProps {
  id: string
  title?: string
  steps: string[]
  color?: 'blue' | 'teal' | 'amber'
}

export default function PageGuide({ id, title, steps, color = 'blue' }: PageGuideProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(`nx-guide-${id}`)
    if (!dismissed) setVisible(true)
  }, [id])

  const dismiss = () => {
    localStorage.setItem(`nx-guide-${id}`, '1')
    setVisible(false)
  }

  if (!visible) return null

  const colors = {
    blue:  { bg: 'bg-blue-50',  border: 'border-blue-200',  icon: 'text-blue-500',  text: 'text-blue-800',  subtext: 'text-blue-700' },
    teal:  { bg: 'bg-teal-50',  border: 'border-teal-200',  icon: 'text-teal-500',  text: 'text-teal-800',  subtext: 'text-teal-700' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500', text: 'text-amber-800', subtext: 'text-amber-700' },
  }
  const c = colors[color]

  return (
    <div className={`${c.bg} ${c.border} border rounded-xl p-4 mb-6 relative`}>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fermer le guide"
        title="Fermer le guide"
        className={`absolute top-3 right-3 ${c.icon} hover:opacity-70`}
      >
        <X size={16} aria-hidden="true" />
      </button>
      <div className="flex gap-3">
        <Info size={20} className={`${c.icon} flex-shrink-0 mt-0.5`} />
        <div>
          {title && <p className={`font-semibold text-sm ${c.text} mb-1`}>{title}</p>}
          <ol className="space-y-1">
            {steps.map((step, i) => (
              <li key={step} className={`text-sm ${c.subtext}`}>
                <span className="font-medium">{i + 1}.</span> {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
