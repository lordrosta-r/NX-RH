// =============================================================================
// HR page — React entry point
// Served by Express at GET /hr (auth-protected, role: hr or admin).
// =============================================================================

import React from 'react'
import { createRoot } from 'react-dom/client'
import HRDashboard from './HRDashboard'
import '../../styles/global.css'

const container = document.getElementById('root')
createRoot(container).render(
  <React.StrictMode>
    <HRDashboard />
  </React.StrictMode>
)
