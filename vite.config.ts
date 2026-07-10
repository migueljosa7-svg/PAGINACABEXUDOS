import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Gigantes y Cabezudos de Zaragoza — Guía oficial',
        short_name: 'GigantesZGZ',
        description: 'Guía oficial de Gigantes y Cabezudos de Zaragoza: agenda, recorridos, enciclopedia y mapa.',
        theme_color: '#D1121F',
        background_color: '#121214',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '48x48 72x72 96x96 128x128 192x192 256x256 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  // SPA fallback for both dev and preview servers
  appType: 'spa',
  build: {
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Minify options
    minify: 'esbuild',
    // Rollup options for code splitting
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react') && (id.includes('react-dom') || id.includes('react-router'))) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/zustand')) {
            return 'state-vendor';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'animation-vendor';
          }
          if (id.includes('node_modules/leaflet')) {
            return 'map-vendor';
          }
          if (id.includes('node_modules/react-icons')) {
            return 'icons-vendor';
          }
          if (id.includes('node_modules/date-fns')) {
            return 'date-vendor';
          }
        },
      },
    },
    // Reduce chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Generate source maps only in dev
    sourcemap: false,
  },
  // Optimize deps
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  // Ensure SPA fallback works in preview mode
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
  },
})
