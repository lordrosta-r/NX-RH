// =============================================================================
// Dashboard page — React entry point
// Served by Express at GET /dashboard (auth-protected).
// =============================================================================

import React from 'react'
import { createRoot } from 'react-dom/client'
import Dashboard from './Dashboard'
import '../../styles/global.css'

const container = document.getElementById('root')
createRoot(container).render(
  <React.StrictMode>
    <Dashboard />
  </React.StrictMode>
)
