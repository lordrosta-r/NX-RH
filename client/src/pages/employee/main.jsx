// =============================================================================
// Employee page — React entry point
// Served by Express at GET /employee (auth-protected).
// Providers : BrowserRouter (basename /employee) + QueryClientProvider
// =============================================================================

import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Employee from './Employee'
import '../../styles/global.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:          5 * 60 * 1000, // 5 min — données fraîches, pas de refetch inutile
      gcTime:            10 * 60 * 1000, // 10 min — cache gardé en mémoire
      retry:              1,
      refetchOnWindowFocus: false,
    },
  },
})

const container = document.getElementById('root')
createRoot(container).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Employee />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
