// =============================================================================
// Campaigns page — React entry point
// Served by Express at GET /campaigns (hr + admin only).
// =============================================================================

import React from 'react'
import { createRoot } from 'react-dom/client'
import Campaigns from './Campaigns'
import '../../styles/global.css'

const container = document.getElementById('root')
createRoot(container).render(
  <React.StrictMode>
    <Campaigns />
  </React.StrictMode>
)
