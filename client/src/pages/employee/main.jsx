// =============================================================================
// Employee page — React entry point
// Served by Express at GET /employee (auth-protected).
// =============================================================================

import React from 'react'
import { createRoot } from 'react-dom/client'
import Employee from './Employee'
import '../../styles/global.css'

const container = document.getElementById('root')
createRoot(container).render(
  <React.StrictMode>
    <Employee />
  </React.StrictMode>
)
