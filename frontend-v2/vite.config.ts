import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react/') || id.includes('react-router')) {
              return 'vendor-react'
            }
            if (id.includes('@tanstack/react-query')) return 'vendor-query'
            if (id.includes('recharts')) return 'vendor-charts'
            if (id.includes('@xyflow') || id.includes('xyflow')) return 'vendor-flow'
            if (id.includes('@dnd-kit')) return 'vendor-dnd'
            if (id.includes('lucide-react')) return 'vendor-icons'
          }
        },
      },
    },
  },
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
