import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// =============================================================================
// Vite MPA Configuration — NanoXplore RH
//
// This is the heart of the Multi-Page Architecture on the frontend.
// Each HTML file is an independent entry point. Vite produces a separate
// JS/CSS bundle per page, and Express serves each compiled HTML file at its
// own route (e.g. GET /dashboard → server/public/dashboard.html).
//
// ┌──────────────────┐     build     ┌───────────────────────┐
// │ client/login.html│ ──────────── ▶│ server/public/login/  │
// │ client/dash.html │ ──────────── ▶│ server/public/dashb.. │
// │ client/mgr.html  │ ──────────── ▶│ server/public/manager/│
// └──────────────────┘               └───────────────────────┘
//
// To add a new page:
//   1. Create client/<page>.html
//   2. Create client/src/pages/<page>/main.jsx
//   3. Add the entry below under rollupOptions.input
//   4. Add the Express route in server/index.js
// =============================================================================

export default defineConfig({
  plugins: [react()],

  // All paths in HTML files are resolved relative to this
  base: '/',

  build: {
    // Compiled output lands directly in the server's static directory.
    // Express will serve this folder as static files + MPA HTML routes.
    outDir: resolve(__dirname, '../server/public'),
    emptyOutDir: true,

    rollupOptions: {
      // ── MPA Entry Points ─────────────────────────────────────────────────
      // Each key becomes a named chunk. The value must point to an HTML file
      // that references its own <script type="module"> React entry point.
      input: {
        login:     resolve(__dirname, 'login.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        manager:   resolve(__dirname, 'manager.html'),
        hr:        resolve(__dirname, 'hr.html'),
        formeditor:  resolve(__dirname, 'formeditor.html'),
        evaluation:  resolve(__dirname, 'evaluation.html'),
      },
    },
  },

  // ── Dev server ─────────────────────────────────────────────────────────────
  // `vite dev` serves the React pages with HMR.
  // API calls are transparently proxied to the running Express backend.
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
