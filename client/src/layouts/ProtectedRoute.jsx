// ============================================================
// ProtectedRoute — Role-based route guard
// Wraps routes that require authentication + specific roles.
// ============================================================

import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth()

  // Still checking session — render nothing (avoids flash)
  if (loading) return null

  // Not authenticated — redirect to login
  if (!user) return <Navigate to="/login" replace />

  // Role check (if allowedRoles specified)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  // Authorized — render child routes
  return <Outlet />
}
