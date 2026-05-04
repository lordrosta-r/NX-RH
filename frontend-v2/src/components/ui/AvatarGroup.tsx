import clsx from 'clsx'
import Avatar from './Avatar'
import type { AvatarProps } from './Avatar'

export interface AvatarGroupProps {
  avatars: Array<Pick<AvatarProps, 'name' | 'src'>>
  max?: number
  size?: AvatarProps['size']
  className?: string
}

export default function AvatarGroup({ avatars, max = 4, size = 'md', className }: AvatarGroupProps) {
  const visible = avatars.slice(0, max)
  const overflow = avatars.length - max

  const overlapClass = {
    sm: '-space-x-1.5',
    md: '-space-x-2',
    lg: '-space-x-2.5',
    xl: '-space-x-3',
  }[size]

  return (
    <div className={clsx('flex items-center', overlapClass, className)}>
      {visible.map((a, i) => (
        <Avatar
          key={i}
          name={a.name}
          src={a.src}
          size={size}
          className="ring-2 ring-white"
        />
      ))}
      {overflow > 0 && (
        <div
          className={clsx(
            'relative inline-flex items-center justify-center rounded-full ring-2 ring-white bg-slate-200 text-slate-600 font-medium flex-shrink-0',
            {
              sm: 'h-6 w-6 text-xs',
              md: 'h-8 w-8 text-xs',
              lg: 'h-10 w-10 text-sm',
              xl: 'h-12 w-12 text-base',
            }[size]
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
