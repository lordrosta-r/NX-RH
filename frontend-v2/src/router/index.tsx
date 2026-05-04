import { createBrowserRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import AuthLayout from '../layouts/AuthLayout'
import AppLayout from '../layouts/AppLayout'
import AuthGuard from '../components/shared/AuthGuard'

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// Pages Auth
const LoginPage = lazy(() => import('../pages/LoginPage'))
const LoginLdapPage = lazy(() => import('../pages/LoginLdapPage'))

// Pages privées
const DashboardPage = lazy(() => import('../pages/DashboardPage'))
const UsersPage = lazy(() => import('../pages/UsersPage'))
const UserNewPage = lazy(() => import('../pages/UserNewPage'))
const UserDetailPage = lazy(() => import('../pages/UserDetailPage'))
const UserEditPage = lazy(() => import('../pages/UserEditPage'))
const UserOffboardingPage = lazy(() => import('../pages/UserOffboardingPage'))
const CampaignsPage = lazy(() => import('../pages/CampaignsPage'))
const CampaignNewPage = lazy(() => import('../pages/CampaignNewPage'))
const CampaignDetailPage = lazy(() => import('../pages/CampaignDetailPage'))
const CampaignEditPage = lazy(() => import('../pages/CampaignEditPage'))
const CampaignAnalyticsPage = lazy(() => import('../pages/CampaignAnalyticsPage'))
const FormsPage = lazy(() => import('../pages/FormsPage'))
const FormNewPage = lazy(() => import('../pages/FormNewPage'))
const FormDetailPage = lazy(() => import('../pages/FormDetailPage'))
const EvaluationsPage = lazy(() => import('../pages/EvaluationsPage'))
const EvaluationHistoryPage = lazy(() => import('../pages/EvaluationHistoryPage'))
const EvaluationNewPage = lazy(() => import('../pages/EvaluationNewPage'))
const EvaluationDetailPage = lazy(() => import('../pages/EvaluationDetailPage'))
const EventsPage = lazy(() => import('../pages/EventsPage'))
const EventDetailPage = lazy(() => import('../pages/EventDetailPage'))
const ResourcesPage = lazy(() => import('../pages/ResourcesPage'))
const ResourceDetailPage = lazy(() => import('../pages/ResourceDetailPage'))
const OffboardingPage = lazy(() => import('../pages/OffboardingPage'))
const OffboardingDetailPage = lazy(() => import('../pages/OffboardingDetailPage'))
const HrFlagsPage = lazy(() => import('../pages/HrFlagsPage'))
const HrFlagDetailPage = lazy(() => import('../pages/HrFlagDetailPage'))
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage'))
const OrgPage = lazy(() => import('../pages/OrgPage'))
const ProfilePage = lazy(() => import('../pages/ProfilePage'))
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'))
const AdminUsersImportPage = lazy(() => import('../pages/AdminUsersImportPage'))
const AdminFormsImportPage = lazy(() => import('../pages/AdminFormsImportPage'))
const AdminLdapPage = lazy(() => import('../pages/AdminLdapPage'))
const AdminAuditPage = lazy(() => import('../pages/AdminAuditPage'))
const AdminConfigPage = lazy(() => import('../pages/AdminConfigPage'))
const AdminMailTemplatesPage = lazy(() => import('../pages/AdminMailTemplatesPage'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  // Routes publiques
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <S><LoginPage /></S> },
      { path: '/login/ldap', element: <S><LoginLdapPage /></S> },
    ],
  },
  // Routes privées
  {
    element: <AuthGuard><AppLayout /></AuthGuard>,
    children: [
      { index: true, element: <S><DashboardPage /></S> },
      // Utilisateurs
      { path: '/users', element: <S><UsersPage /></S> },
      { path: '/users/new', element: <S><UserNewPage /></S> },
      { path: '/users/:id', element: <S><UserDetailPage /></S> },
      { path: '/users/:id/edit', element: <S><UserEditPage /></S> },
      { path: '/users/:id/offboarding', element: <S><UserOffboardingPage /></S> },
      // Campagnes
      { path: '/campaigns', element: <S><CampaignsPage /></S> },
      { path: '/campaigns/new', element: <S><CampaignNewPage /></S> },
      { path: '/campaigns/:id', element: <S><CampaignDetailPage /></S> },
      { path: '/campaigns/:id/edit', element: <S><CampaignEditPage /></S> },
      { path: '/campaigns/:id/analytics', element: <S><CampaignAnalyticsPage /></S> },
      // Formulaires
      { path: '/forms', element: <S><FormsPage /></S> },
      { path: '/forms/new', element: <S><FormNewPage /></S> },
      { path: '/forms/:id', element: <S><FormDetailPage /></S> },
      // Évaluations
      { path: '/evaluations', element: <S><EvaluationsPage /></S> },
      { path: '/evaluations/history', element: <S><EvaluationHistoryPage /></S> },
      { path: '/evaluations/new', element: <S><EvaluationNewPage /></S> },
      { path: '/evaluations/:id', element: <S><EvaluationDetailPage /></S> },
      // Événements
      { path: '/events', element: <S><EventsPage /></S> },
      { path: '/events/:id', element: <S><EventDetailPage /></S> },
      // Ressources
      { path: '/resources', element: <S><ResourcesPage /></S> },
      { path: '/resources/:id', element: <S><ResourceDetailPage /></S> },
      // Offboarding
      { path: '/offboarding', element: <S><OffboardingPage /></S> },
      { path: '/offboarding/:id', element: <S><OffboardingDetailPage /></S> },
      // RH
      { path: '/hr/flags', element: <S><HrFlagsPage /></S> },
      { path: '/hr/flags/:id', element: <S><HrFlagDetailPage /></S> },
      // Analytics & Org
      { path: '/analytics', element: <S><AnalyticsPage /></S> },
      { path: '/org', element: <S><OrgPage /></S> },
      // Profil & Notifications
      { path: '/profile', element: <S><ProfilePage /></S> },
      { path: '/notifications', element: <S><NotificationsPage /></S> },
      // Admin
      { path: '/admin/users/import', element: <S><AdminUsersImportPage /></S> },
      { path: '/admin/forms/import', element: <S><AdminFormsImportPage /></S> },
      { path: '/admin/ldap', element: <S><AdminLdapPage /></S> },
      { path: '/admin/audit', element: <S><AdminAuditPage /></S> },
      { path: '/admin/config', element: <S><AdminConfigPage /></S> },
      { path: '/admin/mail-templates', element: <S><AdminMailTemplatesPage /></S> },
    ],
  },
  // 404
  { path: '*', element: <S><NotFoundPage /></S> },
])
