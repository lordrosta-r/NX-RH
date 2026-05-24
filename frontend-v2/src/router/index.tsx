import { createBrowserRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import AuthLayout from '../layouts/AuthLayout'
import AppLayout from '../layouts/AppLayout'
import OrgLayout from '../layouts/OrgLayout'
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
const AnalyticsCampaignPage = lazy(() => import('../pages/AnalyticsCampaignPage'))
const OrgPage = lazy(() => import('../pages/OrgPage'))
const ProfilePage = lazy(() => import('../pages/ProfilePage'))
const PreferencesPage = lazy(() => import('../pages/PreferencesPage'))
const OnboardingPage = lazy(() => import('../pages/OnboardingPage'))
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'))
const AdminUsersImportPage = lazy(() => import('../pages/AdminUsersImportPage'))
const AdminFormsImportPage = lazy(() => import('../pages/AdminFormsImportPage'))
const AdminLdapPage = lazy(() => import('../pages/AdminLdapPage'))
const AdminAuditPage = lazy(() => import('../pages/AdminAuditPage'))
const AdminConfigPage = lazy(() => import('../pages/AdminConfigPage'))
const AdminMailTemplatesPage = lazy(() => import('../pages/AdminMailTemplatesPage'))
const AdminHubPage = lazy(() => import('../pages/AdminHubPage'))
const AdminUsersPage = lazy(() => import('../pages/AdminUsersPage'))
const HrSettingsPage = lazy(() => import('../pages/HrSettingsPage'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))
const UserGroupsPage = lazy(() => import('../pages/UserGroupsPage'))
const AdminStatusPage = lazy(() => import('../pages/AdminStatusPage'))
const AdminSetupWizardPage = lazy(() => import('../pages/AdminSetupWizardPage'))

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
  // Onboarding — plein écran sans navbar
  {
    path: '/onboarding',
    element: <AuthGuard><S><OnboardingPage /></S></AuthGuard>,
  },
  // Routes privées
  {
    element: <AuthGuard><AppLayout /></AuthGuard>,
    children: [
      { index: true, element: <S><DashboardPage /></S> },
      // Utilisateurs
      { path: '/users', element: <AuthGuard roles={['admin', 'hr', 'manager']}><S><UsersPage /></S></AuthGuard> },
      { path: '/users/new', element: <AuthGuard roles={['admin', 'hr']}><S><UserNewPage /></S></AuthGuard> },
      { path: '/users/:id', element: <AuthGuard roles={['admin', 'hr', 'manager']}><S><UserDetailPage /></S></AuthGuard> },
      { path: '/users/:id/edit', element: <AuthGuard roles={['admin', 'hr']}><S><UserEditPage /></S></AuthGuard> },
      { path: '/users/:id/offboarding', element: <AuthGuard roles={['admin', 'hr']}><S><UserOffboardingPage /></S></AuthGuard> },
      { path: '/users/groups', element: <AuthGuard roles={['admin', 'hr']}><S><UserGroupsPage /></S></AuthGuard> },
      // Campagnes
      { path: '/campaigns', element: <S><CampaignsPage /></S> },
      { path: '/campaigns/new', element: <AuthGuard roles={['admin', 'hr']}><S><CampaignNewPage /></S></AuthGuard> },
      { path: '/campaigns/:id', element: <S><CampaignDetailPage /></S> },
      { path: '/campaigns/:id/edit', element: <AuthGuard roles={['admin', 'hr']}><S><CampaignEditPage /></S></AuthGuard> },
      { path: '/campaigns/:id/analytics', element: <AuthGuard roles={['admin', 'hr', 'manager']}><S><CampaignAnalyticsPage /></S></AuthGuard> },
      // Formulaires
      { path: '/forms', element: <S><FormsPage /></S> },
      { path: '/forms/new', element: <AuthGuard roles={['admin', 'hr']}><S><FormNewPage /></S></AuthGuard> },
      { path: '/forms/:id', element: <S><FormDetailPage /></S> },
      // Évaluations
      { path: '/evaluations', element: <S><EvaluationsPage /></S> },
      { path: '/evaluations/history', element: <S><EvaluationHistoryPage /></S> },
      { path: '/evaluations/new', element: <AuthGuard roles={['admin', 'hr']}><S><EvaluationNewPage /></S></AuthGuard> },
      { path: '/evaluations/:id', element: <S><EvaluationDetailPage /></S> },
      // Événements
      { path: '/events', element: <S><EventsPage /></S> },
      { path: '/events/:id', element: <S><EventDetailPage /></S> },
      // Ressources
      { path: '/resources', element: <S><ResourcesPage /></S> },
      { path: '/resources/:id', element: <S><ResourceDetailPage /></S> },
      // Offboarding
      { path: '/offboarding', element: <AuthGuard roles={['admin', 'hr', 'manager']}><S><OffboardingPage /></S></AuthGuard> },
      { path: '/offboarding/:id', element: <AuthGuard roles={['admin', 'hr', 'manager']}><S><OffboardingDetailPage /></S></AuthGuard> },
      // RH
      { path: '/hr/flags', element: <AuthGuard roles={['admin', 'hr']}><S><HrFlagsPage /></S></AuthGuard> },
      { path: '/hr/flags/:id', element: <AuthGuard roles={['admin', 'hr']}><S><HrFlagDetailPage /></S></AuthGuard> },
      // Analytics
      { path: '/analytics', element: <AuthGuard roles={['admin', 'hr', 'manager']}><S><AnalyticsPage /></S></AuthGuard> },
      { path: '/analytics/campaigns/:id', element: <AuthGuard roles={['admin', 'hr', 'manager']}><S><AnalyticsCampaignPage /></S></AuthGuard> },
      // Profil & Notifications
      { path: '/profile', element: <S><ProfilePage /></S> },
      { path: '/profile/preferences', element: <S><PreferencesPage /></S> },
      { path: '/notifications', element: <S><NotificationsPage /></S> },
      // Admin
      { path: '/admin', element: <AuthGuard roles={['admin', 'hr']}><S><AdminHubPage /></S></AuthGuard> },
      { path: '/admin/users', element: <AuthGuard roles={['admin', 'hr']}><S><AdminUsersPage /></S></AuthGuard> },
      { path: '/admin/settings', element: <AuthGuard roles={['admin', 'hr']}><S><HrSettingsPage /></S></AuthGuard> },
      { path: '/hr/settings', element: <AuthGuard roles={['admin', 'hr']}><S><HrSettingsPage /></S></AuthGuard> },
      { path: '/admin/users/import', element: <AuthGuard roles={['admin', 'hr']}><S><AdminUsersImportPage /></S></AuthGuard> },
      { path: '/admin/forms/import', element: <AuthGuard roles={['admin', 'hr']}><S><AdminFormsImportPage /></S></AuthGuard> },
      { path: '/admin/ldap', element: <AuthGuard roles={['admin']}><S><AdminLdapPage /></S></AuthGuard> },
      { path: '/admin/audit', element: <AuthGuard roles={['admin', 'hr']}><S><AdminAuditPage /></S></AuthGuard> },
      { path: '/admin/config', element: <AuthGuard roles={['admin']}><S><AdminConfigPage /></S></AuthGuard> },
      { path: '/admin/mail-templates', element: <AuthGuard roles={['admin', 'hr']}><S><AdminMailTemplatesPage /></S></AuthGuard> },
      { path: '/admin/status', element: <AuthGuard roles={['admin']}><S><AdminStatusPage /></S></AuthGuard> },
      { path: '/admin/setup', element: <AuthGuard roles={['admin']}><S><AdminSetupWizardPage /></S></AuthGuard> },
    ],
  },
  // Organigramme — plein écran (OrgLayout sans container max-w)
  {
    element: <AuthGuard><OrgLayout /></AuthGuard>,
    children: [
      { path: '/org', element: <S><OrgPage /></S> },
      { path: '/admin/orgchart', element: <S><OrgPage /></S> },
    ],
  },
  // 404
  { path: '*', element: <S><NotFoundPage /></S> },
])
