// ============================================================
// main.jsx — Single React entry point (SPA)
// Mounts <App /> with global providers.
// ============================================================

import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './styles/global.css'

// ── React-Query client ──────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            5 * 60 * 1000, // 5 min
      gcTime:              10 * 60 * 1000, // 10 min
      retry:                1,
      refetchOnWindowFocus: false,
    },
  },
})

// ── Mount ───────────────────────────────────────────────────
const container = document.getElementById('root')

createRoot(container).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* TODO: Phase 2 — wrap with AuthProvider, ThemeProvider, LocaleProvider */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
