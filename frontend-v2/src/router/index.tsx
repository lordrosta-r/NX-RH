/* eslint-disable react-refresh/only-export-components -- router intentionally mixes lazy component declarations with the router export */
import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";
import AuthLayout from "../layouts/AuthLayout";
import AppLayout from "../layouts/AppLayout";
import OrgLayout from "../layouts/OrgLayout";
import LegalLayout from "../layouts/LegalLayout";
import AuthGuard from "../components/shared/AuthGuard";

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Pages Auth
const LoginPage = lazy(() => import("../pages/LoginPage"));
const LoginLdapPage = lazy(() => import("../pages/LoginLdapPage"));

// Pages légales / RGPD (publiques)
const ConfidentialitePage = lazy(
  () => import("../pages/legal/ConfidentialitePage"),
);
const MentionsLegalesPage = lazy(
  () => import("../pages/legal/MentionsLegalesPage"),
);
const AccessibilitePage = lazy(
  () => import("../pages/legal/AccessibilitePage"),
);

// Pages privées
const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const UsersPage = lazy(() => import("../pages/UsersPage"));
const UserNewPage = lazy(() => import("../pages/UserNewPage"));
const UserDetailPage = lazy(() => import("../pages/UserDetailPage"));
const UserEditPage = lazy(() => import("../pages/UserEditPage"));
const CampaignsPage = lazy(() => import("../pages/CampaignsPage"));
const CampaignNewPage = lazy(() => import("../pages/CampaignNewPage"));
const CampaignDetailPage = lazy(() => import("../pages/CampaignDetailPage"));
const CampaignEditPage = lazy(() => import("../pages/CampaignEditPage"));
const CampaignAnalyticsPage = lazy(
  () => import("../pages/CampaignAnalyticsPage"),
);
const FormsPage = lazy(() => import("../pages/FormsPage"));
const FormNewPage = lazy(() => import("../pages/FormNewPage"));
const FormDetailPage = lazy(() => import("../pages/FormDetailPage"));
const EvaluationsPage = lazy(() => import("../pages/EvaluationsPage"));
const EvaluationHistoryPage = lazy(
  () => import("../pages/EvaluationHistoryPage"),
);
const EvaluationNewPage = lazy(() => import("../pages/EvaluationNewPage"));
const EvaluationDetailPage = lazy(
  () => import("../pages/EvaluationDetailPage"),
);
const EventsPage = lazy(() => import("../pages/EventsPage"));
const EventDetailPage = lazy(() => import("../pages/EventDetailPage"));
const ResourcesPage = lazy(() => import("../pages/ResourcesPage"));
const ResourceDetailPage = lazy(() => import("../pages/ResourceDetailPage"));
const HelpPage = lazy(() => import("../pages/HelpPage"));
const HrFlagsPage = lazy(() => import("../pages/HrFlagsPage"));
const HrFlagDetailPage = lazy(() => import("../pages/HrFlagDetailPage"));
const AnalyticsPage = lazy(() => import("../pages/AnalyticsPage"));
const AnalyticsCampaignPage = lazy(
  () => import("../pages/AnalyticsCampaignPage"),
);
const OrgPage = lazy(() => import("../pages/OrgPage"));
const ProfilePage = lazy(() => import("../pages/ProfilePage"));
const PreferencesPage = lazy(() => import("../pages/PreferencesPage"));
const NotificationsPage = lazy(() => import("../pages/NotificationsPage"));
const AdminUsersImportPage = lazy(
  () => import("../pages/AdminUsersImportPage"),
);
const AdminFormsImportPage = lazy(
  () => import("../pages/AdminFormsImportPage"),
);
const AdminLdapPage = lazy(() => import("../pages/AdminLdapPage"));
const AdminSslPage = lazy(() => import("../pages/AdminSslPage"));
const AdminAuditPage = lazy(() => import("../pages/AdminAuditPage"));
const AdminConfigPage = lazy(() => import("../pages/AdminConfigPage"));
const AdminMailConfigPage = lazy(() => import("../pages/AdminMailConfigPage"));
const AdminMailTemplatesPage = lazy(
  () => import("../pages/AdminMailTemplatesPage"),
);
const AdminHubPage = lazy(() => import("../pages/AdminHubPage"));
const AdminUsersPage = lazy(() => import("../pages/AdminUsersPage"));
const HrSettingsPage = lazy(() => import("../pages/HrSettingsPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));
const UserGroupsPage = lazy(() => import("../pages/UserGroupsPage"));
const AdminStatusPage = lazy(() => import("../pages/AdminStatusPage"));
const AdminSetupWizardPage = lazy(
  () => import("../pages/AdminSetupWizardPage"),
);
const MobilityPage = lazy(() => import("../pages/MobilityPage"));
const AdminMailTestPage = lazy(() => import("../pages/AdminMailTestPage"));
const AdminStatsPage = lazy(() => import("../pages/AdminStatsPage"));
const DepartmentsPage = lazy(() => import("../pages/DepartmentsPage"));
const UnauthorizedPage = lazy(() => import("../pages/UnauthorizedPage"));
const PDIPage = lazy(() => import("../pages/PDIPage"));
const PDIDetailPage = lazy(() => import("../pages/PDIDetailPage"));
const ManagerTodoPage = lazy(() => import("../pages/ManagerTodoPage"));
const InterviewPage = lazy(() => import("../pages/InterviewPage"));

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  // Routes publiques
  {
    element: <AuthLayout />,
    children: [
      {
        path: "/login",
        element: (
          <S>
            <LoginPage />
          </S>
        ),
      },
      {
        path: "/login/ldap",
        element: (
          <S>
            <LoginLdapPage />
          </S>
        ),
      },
    ],
  },
  // Pages légales / RGPD (publiques, sans authentification)
  {
    element: <LegalLayout />,
    children: [
      {
        path: "/confidentialite",
        element: (
          <S>
            <ConfidentialitePage />
          </S>
        ),
      },
      {
        path: "/mentions-legales",
        element: (
          <S>
            <MentionsLegalesPage />
          </S>
        ),
      },
      {
        path: "/accessibilite",
        element: (
          <S>
            <AccessibilitePage />
          </S>
        ),
      },
    ],
  },
  // Routes privées
  {
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: (
          <S>
            <DashboardPage />
          </S>
        ),
      },
      // Utilisateurs
      {
        path: "/users",
        element: (
          <AuthGuard roles={["admin", "hr", "manager"]}>
            <S>
              <UsersPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/users/new",
        element: (
          <AuthGuard roles={["admin", "hr"]}>
            <S>
              <UserNewPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/users/:id",
        element: (
          <AuthGuard roles={["admin", "hr", "manager"]}>
            <S>
              <UserDetailPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/users/:id/edit",
        element: (
          <AuthGuard roles={["admin", "hr"]}>
            <S>
              <UserEditPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/users/groups",
        element: (
          <AuthGuard roles={["admin", "hr"]}>
            <S>
              <UserGroupsPage />
            </S>
          </AuthGuard>
        ),
      },
      // Campagnes
      {
        path: "/campaigns",
        element: (
          <S>
            <CampaignsPage />
          </S>
        ),
      },
      {
        path: "/campaigns/new",
        element: (
          <AuthGuard roles={["admin", "hr"]}>
            <S>
              <CampaignNewPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/campaigns/:id",
        element: (
          <S>
            <CampaignDetailPage />
          </S>
        ),
      },
      {
        path: "/campaigns/:id/edit",
        element: (
          <AuthGuard roles={["admin", "hr"]}>
            <S>
              <CampaignEditPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/campaigns/:id/analytics",
        element: (
          <AuthGuard roles={["admin", "hr", "manager"]}>
            <S>
              <CampaignAnalyticsPage />
            </S>
          </AuthGuard>
        ),
      },
      // Formulaires
      {
        path: "/forms",
        element: (
          <S>
            <FormsPage />
          </S>
        ),
      },
      {
        path: "/forms/new",
        element: (
          <AuthGuard roles={["admin", "hr"]}>
            <S>
              <FormNewPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/forms/:id",
        element: (
          <S>
            <FormDetailPage />
          </S>
        ),
      },
      // Évaluations
      {
        path: "/evaluations",
        element: (
          <S>
            <EvaluationsPage />
          </S>
        ),
      },
      {
        path: "/evaluations/history",
        element: (
          <S>
            <EvaluationHistoryPage />
          </S>
        ),
      },
      {
        path: "/evaluations/new",
        element: (
          <AuthGuard roles={["admin", "hr"]}>
            <S>
              <EvaluationNewPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/evaluations/:id",
        element: (
          <S>
            <EvaluationDetailPage />
          </S>
        ),
      },
      // Événements
      {
        path: "/events",
        element: (
          <S>
            <EventsPage />
          </S>
        ),
      },
      {
        path: "/events/:id",
        element: (
          <S>
            <EventDetailPage />
          </S>
        ),
      },
      // Documents RH — publiés par la RH, consultables/téléchargeables par tous
      // les rôles SAUF admin (employé, manager, RH).
      {
        path: "/documents",
        element: (
          <AuthGuard roles={["hr", "manager", "employee"]}>
            <S>
              <ResourcesPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/documents/:id",
        element: (
          <AuthGuard roles={["hr", "manager", "employee"]}>
            <S>
              <ResourceDetailPage />
            </S>
          </AuthGuard>
        ),
      },
      // Aide — ouverte à tous les rôles authentifiés (admin compris, non masqué).
      // L'anti-exposition est éditoriale : aucune section admin sensible dans la page.
      {
        path: "/help",
        element: (
          <S>
            <HelpPage />
          </S>
        ),
      },
      // Mobilité interne
      {
        path: "/mobility",
        element: (
          <S>
            <MobilityPage />
          </S>
        ),
      },
      // Manager — À traiter
      {
        path: "/manager/todo",
        element: (
          <AuthGuard roles={["manager", "hr", "admin"]}>
            <S>
              <ManagerTodoPage />
            </S>
          </AuthGuard>
        ),
      },
      // Vue Entretien — face-à-face (lit campaignId & evaluateeId en query string)
      {
        path: "/interview",
        element: (
          <AuthGuard roles={["manager", "hr", "admin"]}>
            <S>
              <InterviewPage />
            </S>
          </AuthGuard>
        ),
      },
      // PDI — Plans de Développement Individuel
      {
        path: "/pdi",
        element: (
          <S>
            <PDIPage />
          </S>
        ),
      },
      {
        path: "/pdi/:id",
        element: (
          <S>
            <PDIDetailPage />
          </S>
        ),
      },
      // RH
      {
        path: "/hr/flags",
        element: (
          <AuthGuard roles={["admin", "hr"]}>
            <S>
              <HrFlagsPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/hr/flags/:id",
        element: (
          <AuthGuard roles={["admin", "hr"]}>
            <S>
              <HrFlagDetailPage />
            </S>
          </AuthGuard>
        ),
      },
      // Analytics
      {
        path: "/analytics",
        element: (
          <AuthGuard roles={["admin", "hr", "manager"]}>
            <S>
              <AnalyticsPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/analytics/campaigns/:id",
        element: (
          <AuthGuard roles={["admin", "hr", "manager"]}>
            <S>
              <AnalyticsCampaignPage />
            </S>
          </AuthGuard>
        ),
      },
      // Profil & Notifications
      {
        path: "/profile",
        element: (
          <S>
            <ProfilePage />
          </S>
        ),
      },
      {
        path: "/profile/preferences",
        element: (
          <S>
            <PreferencesPage />
          </S>
        ),
      },
      {
        path: "/notifications",
        element: (
          <S>
            <NotificationsPage />
          </S>
        ),
      },
      // Admin
      {
        path: "/admin",
        element: (
          <AuthGuard roles={["admin", "hr"]}>
            <S>
              <AdminHubPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/admin/users",
        element: (
          <AuthGuard roles={["admin", "hr"]}>
            <S>
              <AdminUsersPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/admin/settings",
        element: (
          <AuthGuard roles={["admin", "hr"]}>
            <S>
              <HrSettingsPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/hr/settings",
        element: (
          <AuthGuard roles={["admin", "hr"]}>
            <S>
              <HrSettingsPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/admin/users/import",
        element: (
          <AuthGuard roles={["admin", "hr"]}>
            <S>
              <AdminUsersImportPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/admin/forms/import",
        element: (
          <AuthGuard roles={["admin", "hr"]}>
            <S>
              <AdminFormsImportPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/admin/ldap",
        element: (
          <AuthGuard roles={["admin"]}>
            <S>
              <AdminLdapPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/admin/ssl",
        element: (
          <AuthGuard roles={["admin"]}>
            <S>
              <AdminSslPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/admin/audit",
        element: (
          <AuthGuard roles={["admin", "hr"]}>
            <S>
              <AdminAuditPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/admin/config",
        element: (
          <AuthGuard roles={["admin"]}>
            <S>
              <AdminConfigPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/admin/mail-config",
        element: (
          <AuthGuard roles={["admin"]}>
            <S>
              <AdminMailConfigPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/admin/mail-templates",
        element: (
          <AuthGuard roles={["admin", "hr"]}>
            <S>
              <AdminMailTemplatesPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/admin/status",
        element: (
          <AuthGuard roles={["admin"]}>
            <S>
              <AdminStatusPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/admin/setup",
        element: (
          <AuthGuard roles={["admin"]}>
            <S>
              <AdminSetupWizardPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/admin/test-mail",
        element: (
          <AuthGuard roles={["admin"]}>
            <S>
              <AdminMailTestPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/admin/stats",
        element: (
          <AuthGuard roles={["admin", "hr"]}>
            <S>
              <AdminStatsPage />
            </S>
          </AuthGuard>
        ),
      },
      {
        path: "/admin/departments",
        element: (
          <AuthGuard roles={["admin", "hr"]}>
            <S>
              <DepartmentsPage />
            </S>
          </AuthGuard>
        ),
      },
    ],
  },
  // Organigramme — plein écran (OrgLayout sans container max-w)
  {
    element: (
      <AuthGuard>
        <OrgLayout />
      </AuthGuard>
    ),
    children: [
      {
        path: "/org",
        element: (
          <S>
            <OrgPage />
          </S>
        ),
      },
      {
        path: "/admin/orgchart",
        element: (
          <S>
            <OrgPage />
          </S>
        ),
      },
    ],
  },
  // 403
  {
    path: "/unauthorized",
    element: (
      <S>
        <UnauthorizedPage />
      </S>
    ),
  },
  // 404
  {
    path: "*",
    element: (
      <S>
        <NotFoundPage />
      </S>
    ),
  },
]);
