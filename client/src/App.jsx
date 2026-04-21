// ============================================================
// App.jsx — SPA route tree (38 routes — full target cartography)
// Pages not yet migrated render <PagePlaceholder>. See:
//   ~/.copilot/session-state/.../files/target-cartography.md
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
import HR from './pages/hr/HR'
import Employee from './pages/employee/Employee'
import Login from './pages/login/Login'

const ANY_AUTHED = ['employee', 'manager', 'director', 'hr', 'admin']
const MANAGER_UP = ['manager', 'director', 'hr', 'admin']
const HR_UP      = ['hr', 'admin']
const ADMIN_ONLY = ['admin']

export default function App() {
  return (
    <Routes>
      {/* ── Public ───────────────────────────────────────── */}
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* ── Authenticated shell (sidebar + topbar) ──────── */}
      <Route element={<AuthedLayout />}>

        {/* Employee — accessible à tous les rôles authentifiés */}
        <Route element={<ProtectedRoute allowedRoles={ANY_AUTHED} />}>
          <Route path="/employee"          element={<Employee />} />
          <Route path="/employee/goals"    element={<PagePlaceholder role="collaborateur" title="Mes objectifs" />} />
          <Route path="/employee/history"  element={<PagePlaceholder role="collaborateur" title="Historique des évaluations" />} />
          <Route path="/employee/settings" element={<PagePlaceholder role="collaborateur" title="Préférences" />} />
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
          <Route path="/manager"                  element={<PagePlaceholder role="manager" title="Tableau de bord équipe" />} />
          <Route path="/manager/team"             element={<PagePlaceholder role="manager" title="Mon équipe" />} />
          <Route path="/manager/team/:userId"     element={<PagePlaceholder role="manager" title="Fiche collaborateur" />} />
          <Route path="/manager/review/:evalId"   element={<PagePlaceholder role="manager" title="Conduite d’évaluation" />} />
          <Route path="/manager/history"          element={<PagePlaceholder role="manager" title="Historique des évaluations" />} />
          <Route path="/manager/analytics"        element={<PagePlaceholder role="manager" title="Analyses d’équipe" />} />
        </Route>

        {/* Director — folded into manager */}
        <Route path="/director"   element={<Navigate to="/manager"   replace />} />
        <Route path="/director/*" element={<Navigate to="/manager"   replace />} />

        {/* HR */}
        <Route element={<ProtectedRoute allowedRoles={HR_UP} />}>
          <Route path="/hr"                              element={<HR />} />
          <Route path="/hr/campaigns"                    element={<PagePlaceholder role="RH" title="Campagnes" />} />
          <Route path="/hr/campaigns/new"                element={<PagePlaceholder role="RH" title="Nouvelle campagne" />} />
          <Route path="/hr/campaigns/:id"                element={<PagePlaceholder role="RH" title="Détail de la campagne" />} />
          <Route path="/hr/templates"                    element={<PagePlaceholder role="RH" title="Modèles de formulaires" />} />
          <Route path="/hr/templates/:id/builder"        element={<PagePlaceholder role="RH" title="Éditeur de formulaire" />} />
          <Route path="/hr/directory"                    element={<PagePlaceholder role="RH" title="Annuaire" />} />
          <Route path="/hr/requests"                     element={<PagePlaceholder role="RH" title="Demandes & contestations" />} />
          <Route path="/hr/analytics"                    element={<PagePlaceholder role="RH" title="Analyses RH" />} />
          <Route path="/hr/resources"                    element={<PagePlaceholder role="RH" title="Ressources" />} />
          <Route path="/hr/settings"                     element={<PagePlaceholder role="RH" title="Préférences RH" />} />
        </Route>

        {/* Admin */}
        <Route element={<ProtectedRoute allowedRoles={ADMIN_ONLY} />}>
          <Route path="/admin"                element={<PagePlaceholder role="admin" title="Tableau de bord administrateur" />} />
          <Route path="/admin/users"          element={<PagePlaceholder role="admin" title="Utilisateurs" />} />
          <Route path="/admin/org-chart"      element={<PagePlaceholder role="admin" title="Organigramme" />} />
          <Route path="/admin/roles"          element={<PagePlaceholder role="admin" title="Rôles & permissions" />} />
          <Route path="/admin/integrations"   element={<PagePlaceholder role="admin" title="Intégrations (LDAP, SMTP, SSO)" />} />
          <Route path="/admin/communications" element={<PagePlaceholder role="admin" title="Modèles de communication" />} />
          <Route path="/admin/compliance"     element={<PagePlaceholder role="admin" title="Conformité & RGPD" />} />
          <Route path="/admin/security"       element={<PagePlaceholder role="admin" title="Sécurité & audit" />} />
          <Route path="/admin/sandbox"        element={<PagePlaceholder role="admin" title="Bac à sable" />} />
          <Route path="/admin/templates-import" element={<PagePlaceholder role="admin" title="Import de modèles" />} />
          <Route path="/admin/settings"       element={<PagePlaceholder role="admin" title="Paramètres globaux" />} />
        </Route>

      </Route>

      {/* Default + catch-all */}
      <Route path="/" element={<Navigate to="/employee" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
