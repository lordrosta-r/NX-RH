import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import type { Role } from '../../types'

interface RoleGuardProps {
  children: React.ReactNode
  roles: Role[]
  fallback?: string
}

export default function RoleGuard({ children, roles, fallback = '/' }: RoleGuardProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) return null

  if (!user || !roles.includes(user.role)) {
    return <Navigate to={fallback} replace />
  }

  return <>{children}</>
}
