import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// =============================================================================
// Vite SPA Configuration — NanoXplore RH
//
// Single entry point: client/index.html → src/main.jsx → React Router v7
// Vite produces one JS/CSS bundle. Express serves index.html for all
// non-API routes (SPA fallback).
// =============================================================================

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // ── Test configuration (Vitest) ────────────────────────────────────────────
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
    include: ['src/__tests__/**/*.test.{js,jsx}', 'src/tests/**/*.test.{js,jsx}'],
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },

  // All paths in HTML files are resolved relative to this
  base: '/',

  build: {
    // Output goes to the server's static directory.
    // Express serves this folder + SPA fallback for all non-API routes.
    outDir: resolve(__dirname, '../mongo/server/public'),
    emptyOutDir: true,

    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
  },

  // ── Dev server ─────────────────────────────────────────────────────────────
  // `vite dev` serves the React pages with HMR.
  // API calls are transparently proxied to the running Express backend.
  // In Docker, VITE_API_TARGET points to the internal "app" service.
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  // ── Preview server ─────────────────────────────────────────────────────────
  // `vite preview` serves the built static files (used in Docker preview mode).
  // Port 5252 — exposed via VSCode port forwarding / dev tunnels.
  // API calls are proxied the same way as in dev mode.
  preview: {
    port: 5252,
    host: '0.0.0.0',
    allowedHosts: ['mhchjzvv-5252.uks1.devtunnels.ms'],
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
