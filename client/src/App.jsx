// ============================================================
// App.jsx — SPA route tree (38 routes — full target cartography)
// Pages migrees : /login (Phase 4), /employee (Phase 4), /hr (Phase 4)
//                 /admin/* (Phase 5 — 10 pages)
// Pages non migrees : renvoient <PagePlaceholder>.
// ============================================================

import { Routes, Route, Navigate } from 'react-router-dom'
import AuthedLayout from './layouts/AuthedLayout'
import ProtectedRoute from './layouts/ProtectedRoute'
import PagePlaceholder from './pages/_placeholders/PagePlaceholder'
import Unauthorized from './pages/_placeholders/Unauthorized'
import NotFound from './pages/_placeholders/NotFound'
import EvaluationSummary from './pages/evaluation/EvaluationSummary'
import EvaluationForm    from './pages/evaluation/EvaluationForm'
import EvaluationSign    from './pages/evaluation/EvaluationSign'
import EvaluationRedirect  from './pages/evaluation/EvaluationRedirect'
import HR              from './pages/hr/HR'
import HRCampaigns      from './pages/hr/HRCampaigns'
import HRCampaignNew    from './pages/hr/HRCampaignNew'
import HRCampaignDetail from './pages/hr/HRCampaignDetail'
import HRTemplates      from './pages/hr/HRTemplates'
import FormBuilder      from './pages/formeditor/FormBuilder'
import Employee from './pages/employee/Employee'
import Login from './pages/login/Login'
import HRDirectory     from './pages/hr/HRDirectory'
import HRRequests      from './pages/hr/HRRequests'
import HRAnalytics     from './pages/hr/HRAnalytics'
import HRResources     from './pages/hr/HRResources'
import HRSettings      from './pages/hr/HRSettings'
import EmployeeGoals   from './pages/employee/EmployeeGoals'
import EmployeeHistory from './pages/employee/EmployeeHistory'
import Settings        from './pages/settings/Settings'
import Manager           from './pages/manager/Manager'
import ManagerTeam       from './pages/manager/ManagerTeam'
import ManagerTeamMember from './pages/manager/ManagerTeamMember'
import ManagerReview     from './pages/manager/ManagerReview'
import ManagerHistory    from './pages/manager/ManagerHistory'
import Admin               from './pages/admin/Admin'
import AdminUsers          from './pages/admin/AdminUsers'
import AdminOrgChart       from './pages/admin/AdminOrgChart'
import AdminRoles          from './pages/admin/AdminRoles'
import AdminIntegrations   from './pages/admin/AdminIntegrations'
import AdminCommunications from './pages/admin/AdminCommunications'
import AdminCompliance     from './pages/admin/AdminCompliance'
import AdminSecurity       from './pages/admin/AdminSecurity'
import AdminSandbox        from './pages/admin/AdminSandbox'
import AdminSettings       from './pages/admin/AdminSettings'
import AdminAudit          from './pages/admin/AdminAudit'
import DevDesignLab from './components/ui/DevDesignLab'

const ANY_AUTHED = ['employee', 'manager', 'director', 'hr', 'admin']
const MANAGER_UP = ['manager', 'director', 'hr', 'admin']
const HR_UP      = ['hr', 'admin']
const ADMIN_ONLY = ['admin']

export default function App() {
  return (
    <>
    <Routes>
      {/* ── Public ───────────────────────────────────────── */}
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* ── Authenticated shell (sidebar + topbar) ──────── */}
      <Route element={<AuthedLayout />}>

        {/* Employee — accessible à tous les rôles authentifiés */}
        <Route element={<ProtectedRoute allowedRoles={ANY_AUTHED} />}>
          <Route path="/employee"             element={<Employee />} />
          <Route path="/employee/evaluation"  element={<EvaluationRedirect />} />
          <Route path="/employee/goals"       element={<EmployeeGoals />} />
          <Route path="/employee/history"  element={<EmployeeHistory />} />
          <Route path="/employee/settings" element={<Settings />} />
        </Route>

        {/* Évaluation — accessible à tous (manager via /manager/review) */}
        <Route element={<ProtectedRoute allowedRoles={ANY_AUTHED} />}>
          <Route path="/evaluation/:evalId"             element={<EvaluationSummary />} />
          <Route path="/evaluation/:evalId/self"        element={<EvaluationForm phase="self" />} />
          <Route path="/evaluation/:evalId/n-1"         element={<EvaluationForm phase="n-1" />} />
          <Route path="/evaluation/:evalId/objectives"  element={<EvaluationForm phase="objectives" />} />
          <Route path="/evaluation/:evalId/aspirations" element={<EvaluationForm phase="aspirations" />} />
          <Route path="/evaluation/:evalId/sign"        element={<EvaluationSign />} />
        </Route>

        {/* Manager */}
        <Route element={<ProtectedRoute allowedRoles={MANAGER_UP} />}>
          <Route path="/manager"                  element={<Manager />} />
          <Route path="/manager/team"             element={<ManagerTeam />} />
          <Route path="/manager/team/:userId"     element={<ManagerTeamMember />} />
          <Route path="/manager/review/:evalId"   element={<ManagerReview />} />
          <Route path="/manager/history"          element={<ManagerHistory />} />
          <Route path="/manager/analytics"        element={<PagePlaceholder role="manager" title="Analyses d’équipe" />} />
        </Route>

        {/* Director — folded into manager */}
        <Route path="/director"   element={<Navigate to="/manager"   replace />} />
        <Route path="/director/*" element={<Navigate to="/manager"   replace />} />

        {/* HR */}
        <Route element={<ProtectedRoute allowedRoles={HR_UP} />}>
          <Route path="/hr"                              element={<HR />} />
          <Route path="/hr/campaigns"                    element={<HRCampaigns />} />
          <Route path="/hr/campaigns/new"                element={<HRCampaignNew />} />
          <Route path="/hr/campaigns/:id"                element={<HRCampaignDetail />} />
          <Route path="/hr/templates"                    element={<HRTemplates />} />
          <Route path="/hr/templates/:id/builder"        element={<FormBuilder />} />
          <Route path="/hr/directory"                    element={<HRDirectory />} />
          <Route path="/hr/requests"                     element={<HRRequests />} />
          <Route path="/hr/analytics"                    element={<HRAnalytics />} />
          <Route path="/hr/resources"                    element={<HRResources />} />
          <Route path="/hr/settings"                     element={<HRSettings />} />
        </Route>

        {/* Admin */}
        <Route element={<ProtectedRoute allowedRoles={ADMIN_ONLY} />}>
          <Route path="/admin"                element={<Admin />} />
          <Route path="/admin/users"          element={<AdminUsers />} />
          <Route path="/admin/org-chart"      element={<AdminOrgChart />} />
          <Route path="/admin/roles"          element={<AdminRoles />} />
          <Route path="/admin/integrations"   element={<AdminIntegrations />} />
          <Route path="/admin/communications" element={<AdminCommunications />} />
          <Route path="/admin/compliance"     element={<AdminCompliance />} />
          <Route path="/admin/security"       element={<AdminSecurity />} />
          <Route path="/admin/sandbox"        element={<AdminSandbox />} />
          <Route path="/admin/templates-import" element={<PagePlaceholder role="admin" title="Import de modèles" />} />
          <Route path="/admin/settings"       element={<AdminSettings />} />
        </Route>

        {/* Audit — accessible aux rôles hr + admin */}
        <Route element={<ProtectedRoute allowedRoles={HR_UP} />}>
          <Route path="/admin/audit" element={<AdminAudit />} />
        </Route>

      </Route>

      {/* Default + catch-all */}
      <Route path="/" element={<Navigate to="/employee" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>

    <DevDesignLab />
  </>
  )
}
