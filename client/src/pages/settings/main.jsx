// =============================================================================
// Settings page — React entry point
// Served by Express at GET /settings (auth-protected, all roles).
// =============================================================================

import React from 'react'
import { createRoot } from 'react-dom/client'
import Settings from './Settings'
import '../../styles/global.css'

const container = document.getElementById('root')
createRoot(container).render(
  <React.StrictMode>
    <Settings />
  </React.StrictMode>
)
