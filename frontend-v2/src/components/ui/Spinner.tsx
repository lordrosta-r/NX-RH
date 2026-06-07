
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

export default function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <Loader2
      className={clsx('animate-spin text-primary-500', SIZE_CLASSES[size], className)}
      aria-label="Chargement…"
    />
  )
}
