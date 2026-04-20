// ============================================================
// App.jsx — SPA route tree
// TODO: Phase 4 — replace Placeholder with real page imports
// ============================================================

import { Routes, Route, Navigate } from 'react-router-dom'
import AuthedLayout from './layouts/AuthedLayout'
import ProtectedRoute from './layouts/ProtectedRoute'

// Temporary placeholder while pages are migrated
function Placeholder({ name }) {
  return (
    <div>
      <h1>{name}</h1>
      <p>Migration en cours...</p>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Placeholder name="Login" />} />

      {/* Authenticated shell — all inner pages share the topbar */}
      <Route element={<AuthedLayout />}>

        {/* Employee — all authenticated roles */}
        <Route element={<ProtectedRoute allowedRoles={['employee', 'manager', 'director', 'hr', 'admin']} />}>
          <Route path="/employee" element={<Placeholder name="Employee" />} />
          <Route path="/employee/*" element={<Placeholder name="Employee" />} />
        </Route>

        {/* Manager */}
        <Route element={<ProtectedRoute allowedRoles={['manager', 'director', 'admin']} />}>
          <Route path="/manager" element={<Placeholder name="Manager" />} />
        </Route>

        {/* Legacy director accounts are folded into manager */}
        <Route path="/director" element={<Navigate to="/manager" replace />} />

        {/* HR section */}
        <Route element={<ProtectedRoute allowedRoles={['hr', 'admin']} />}>
          <Route path="/hr" element={<Placeholder name="HR Dashboard" />} />
          <Route path="/hr/campaigns" element={<Placeholder name="Campaigns" />} />
          <Route path="/hr/formeditor" element={<Placeholder name="Form Editor" />} />
          <Route path="/hr/resources" element={<Placeholder name="Resources" />} />
          <Route path="/hr/users" element={<Placeholder name="Users" />} />
        </Route>

        {/* Admin */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<Placeholder name="Admin" />} />
        </Route>

        {/* All authenticated */}
        <Route element={<ProtectedRoute allowedRoles={['employee', 'manager', 'director', 'hr', 'admin']} />}>
          <Route path="/settings" element={<Placeholder name="Settings" />} />
          <Route path="/evaluation" element={<Placeholder name="Evaluation" />} />
        </Route>

      </Route>

      {/* Default + catch-all */}
      <Route path="/" element={<Navigate to="/employee" replace />} />
      <Route path="*" element={<Navigate to="/employee" replace />} />
    </Routes>
  )
}
