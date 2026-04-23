// ============================================================
// main.jsx — Single React entry point (SPA)
// Mounts <App /> with global providers.
// ============================================================

import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { AuthProvider }  from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { LocaleProvider } from './contexts/LocaleContext'
import { Toaster } from './components/ui/Toast'
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
      <AuthProvider>
        <ThemeProvider>
          <LocaleProvider>
            <BrowserRouter>
              <App />
              <Toaster />
            </BrowserRouter>
          </LocaleProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
