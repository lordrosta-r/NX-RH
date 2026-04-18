// =============================================================================
// Director page — React entry point
// Served by Express at GET /director (director + admin only).
// =============================================================================

import React from 'react'
import { createRoot } from 'react-dom/client'
import Director from './Director'
import '../../styles/global.css'

const container = document.getElementById('root')
createRoot(container).render(
  <React.StrictMode>
    <Director />
  </React.StrictMode>
)
