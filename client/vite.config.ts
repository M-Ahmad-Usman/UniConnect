/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import path from 'path';

const proxyTarget = process.env.VITE_PROXY_TARGET ?? 'http://localhost:4000';
const sentrySourceMapsEnabled = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    ...(sentrySourceMapsEnabled
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
            release: { name: process.env.VITE_SENTRY_RELEASE },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: sentrySourceMapsEnabled,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/react-router-dom/')
          ) {
            return 'react-vendor';
          }

          if (
            id.includes('/@tanstack/react-query/') ||
            id.includes('/axios/') ||
            id.includes('/zustand/') ||
            id.includes('/socket.io-client/')
          ) {
            return 'data-vendor';
          }

          if (
            id.includes('/@base-ui/react/') ||
            id.includes('/lucide-react/') ||
            id.includes('/framer-motion/') ||
            id.includes('/sonner/') ||
            id.includes('/next-themes/')
          ) {
            return 'ui-vendor';
          }

          if (id.includes('/@tiptap/')) {
            return 'editor-vendor';
          }

          if (
            id.includes('/react-hook-form/') ||
            id.includes('/@hookform/resolvers/') ||
            id.includes('/zod/')
          ) {
            return 'form-vendor';
          }

          return undefined;
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
      '/api/socket.io': {
        target: proxyTarget,
        ws: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
