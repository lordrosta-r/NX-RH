import clsx from 'clsx'

const BG_COLORS = [
  'bg-primary-500', 'bg-violet-500', 'bg-pink-500', 'bg-amber-500',
  'bg-emerald-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500',
]

function getColorFromName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return BG_COLORS[Math.abs(hash) % BG_COLORS.length]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(p => p[0]?.toUpperCase() || '')
    .slice(0, 2)
    .join('')
}

const SIZE_CLASSES = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
  xl: 'h-12 w-12 text-lg',
}

export interface AvatarProps {
  name: string
  src?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  return (
    <div
      className={clsx(
        'relative inline-flex items-center justify-center rounded-full flex-shrink-0 overflow-hidden',
        SIZE_CLASSES[size],
        !src && getColorFromName(name),
        className
      )}
      aria-label={`Avatar de ${name}`}
      role="img"
      title={name}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-medium text-white leading-none select-none">
          {getInitials(name)}
        </span>
      )}
    </div>
  )
}
