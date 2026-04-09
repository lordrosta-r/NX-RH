// =============================================================================
// Manager page — React entry point
// Served by Express at GET /manager (manager + admin roles only).
// =============================================================================

import React from 'react'
import { createRoot } from 'react-dom/client'
import Manager from './Manager'
import '../../styles/global.css'

const container = document.getElementById('root')
createRoot(container).render(
  <React.StrictMode>
    <Manager />
  </React.StrictMode>
)
