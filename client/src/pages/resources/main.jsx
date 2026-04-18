// =============================================================================
// Resources page — React entry point
// Served by Express at GET /resources (auth-protected, role: hr or admin).
// =============================================================================

import React from 'react'
import { createRoot } from 'react-dom/client'
import Resources from './Resources'
import '../../styles/global.css'

const container = document.getElementById('root')
createRoot(container).render(
  <React.StrictMode>
    <Resources />
  </React.StrictMode>
)
