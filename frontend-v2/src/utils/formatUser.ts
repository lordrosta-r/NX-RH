import type { User } from '../types'

export function getFullName(user: User | null | undefined): string {
  if (!user) return '—'
  return `${user.firstName} ${user.lastName}`.trim()
}

export function getInitials(user: User | null | undefined): string {
  if (!user) return '?'
  const first = user.firstName?.[0] ?? ''
  const last = user.lastName?.[0] ?? ''
  return `${first}${last}`.toUpperCase() || '?'
}

// Génère une couleur de fond déterministe depuis le nom
export function getAvatarColor(name: string): string {
  const colors = [
    'bg-primary-100 text-primary-700',
    'bg-success-50 text-success-700',
    'bg-warning-50 text-warning-700',
    'bg-error-50 text-error-700',
    'bg-info-50 text-info-700',
    'bg-slate-100 text-slate-700',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}
