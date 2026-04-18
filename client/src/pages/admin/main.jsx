// =============================================================================
// Admin page — React entry point
// Served by Express at GET /admin (admin role only).
// =============================================================================

import React from 'react'
import { createRoot } from 'react-dom/client'
import Admin from './Admin'
import '../../styles/global.css'

const container = document.getElementById('root')
createRoot(container).render(
  <React.StrictMode>
    <Admin />
  </React.StrictMode>
)
