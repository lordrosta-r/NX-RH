// =============================================================================
// Login page — React entry point
// Vite injects this module into login.html at build time.
// This file's only job: import the root component and mount it.
// =============================================================================

import React from 'react'
import { createRoot } from 'react-dom/client'
import Login from './Login'
import '../../styles/global.css'

const container = document.getElementById('root')
createRoot(container).render(
  <React.StrictMode>
    <Login />
  </React.StrictMode>
)
