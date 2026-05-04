import { lazy, Suspense } from 'react'
import { useAuth } from '../contexts/AuthContext'

const DashboardAdminPage = lazy(() => import('./DashboardAdminPage'))
const DashboardHrPage = lazy(() => import('./DashboardHrPage'))
const DashboardDirectorPage = lazy(() => import('./DashboardDirectorPage'))
const DashboardManagerPage = lazy(() => import('./DashboardManagerPage'))
const DashboardEmployeePage = lazy(() => import('./DashboardEmployeePage'))

function Loader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Chargement…</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <Loader />
  if (!user) return null

  return (
    <Suspense fallback={<Loader />}>
      {user.role === 'admin' && <DashboardAdminPage />}
      {user.role === 'hr' && <DashboardHrPage />}
      {user.role === 'director' && <DashboardDirectorPage />}
      {user.role === 'manager' && <DashboardManagerPage />}
      {(user.role === 'employee' || !['admin', 'hr', 'director', 'manager'].includes(user.role)) && (
        <DashboardEmployeePage />
      )}
    </Suspense>
  )
}
