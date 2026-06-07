
import clsx from 'clsx'

export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

export default function Toggle({ checked, onChange, label, disabled = false, size = 'md' }: ToggleProps) {
  const trackSm = 'h-5 w-9'
  const knobSm = 'h-4 w-4'
  const translateOnSm = 'translate-x-4'
  const trackMd = 'h-6 w-11'
  const knobMd = 'h-5 w-5'
  const translateOnMd = 'translate-x-5'

  const track = size === 'sm' ? trackSm : trackMd
  const knob = size === 'sm' ? knobSm : knobMd
  const translateOn = size === 'sm' ? translateOnSm : translateOnMd

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={clsx(
        'relative inline-flex flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        track,
        checked ? 'bg-primary-500' : 'bg-slate-300',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={clsx(
          'absolute top-0.5 left-0.5 rounded-full bg-white shadow-sm transform transition-transform duration-200',
          knob,
          checked ? translateOn : 'translate-x-0'
        )}
      />
      {label && <span className="sr-only">{label}</span>}
    </button>
  )
}
