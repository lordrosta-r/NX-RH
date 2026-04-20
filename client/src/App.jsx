// ============================================================
// App.jsx — SPA route tree
// TODO: Phase 3 — wrap routes with <ProtectedRoute> by role
// TODO: Phase 4 — replace Placeholder with real page imports
// ============================================================

import { Routes, Route, Navigate } from 'react-router-dom'

// ── Temporary placeholder while pages are migrated ──────────
function Placeholder({ name }) {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>{name}</h1>
      <p>Migration en cours...</p>
    </div>
  )
}

// ── Route tree ──────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<Placeholder name="Login" />} />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/employee" replace />} />

      {/* Employee */}
      <Route path="/employee" element={<Placeholder name="Employee" />} />
      <Route path="/employee/*" element={<Placeholder name="Employee" />} />

      {/* Manager */}
      <Route path="/manager" element={<Placeholder name="Manager" />} />

      {/* Director */}
      <Route path="/director" element={<Placeholder name="Director" />} />

      {/* HR */}
      <Route path="/hr" element={<Placeholder name="HR Dashboard" />} />
      <Route path="/hr/campaigns" element={<Placeholder name="Campaigns" />} />
      <Route path="/hr/formeditor" element={<Placeholder name="Form Editor" />} />
      <Route path="/hr/resources" element={<Placeholder name="Resources" />} />
      <Route path="/hr/users" element={<Placeholder name="Users" />} />

      {/* Admin & Settings */}
      <Route path="/admin" element={<Placeholder name="Admin" />} />
      <Route path="/settings" element={<Placeholder name="Settings" />} />

      {/* Evaluation */}
      <Route path="/evaluation" element={<Placeholder name="Evaluation" />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/employee" replace />} />
    </Routes>
  )
}
