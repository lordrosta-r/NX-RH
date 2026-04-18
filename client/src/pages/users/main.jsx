// =============================================================================
// Users page — React entry point
// Served by Express at GET /users (auth-protected, role: admin or hr).
// =============================================================================

import React from 'react'
import { createRoot } from 'react-dom/client'
import Users from './Users'
import '../../styles/global.css'

const container = document.getElementById('root')
createRoot(container).render(
  <React.StrictMode>
    <Users />
  </React.StrictMode>
)
