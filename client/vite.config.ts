/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const proxyTarget = process.env.VITE_PROXY_TARGET ?? 'http://localhost:4000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router-dom/')
          ) {
            return 'react-vendor'
          }

          if (
            id.includes('/@tanstack/react-query/') ||
            id.includes('/axios/') ||
            id.includes('/zustand/') ||
            id.includes('/socket.io-client/')
          ) {
            return 'data-vendor'
          }

          if (
            id.includes('/@base-ui/react/') ||
            id.includes('/lucide-react/') ||
            id.includes('/sonner/') ||
            id.includes('/next-themes/')
          ) {
            return 'ui-vendor'
          }

          if (
            id.includes('/react-hook-form/') ||
            id.includes('/@hookform/resolvers/') ||
            id.includes('/zod/')
          ) {
            return 'form-vendor'
          }

          return undefined
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
      '/socket.io': {
        target: proxyTarget,
        ws: true,
      },
    },
  },
  test: {
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
