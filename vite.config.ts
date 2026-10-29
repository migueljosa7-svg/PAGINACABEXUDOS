import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Ensure build output goes to 'dist' (Vercel expects this)
  build: {
    outDir: 'dist',
    // SPA fallback for both dev and preview servers
    // appType + modulePreload removed: Vite 8 uses different defaults
    cssCodeSplit: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
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
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/comparsas/**', 'icons/icon-*.png'],
      workbox: {
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/tile\.openstreetmap\.de\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // v4.1: Cache de assets estáticos críticos para uso offline
          {
            urlPattern: ({ request }) =>
              request.destination === 'script' ||
              request.destination === 'style' ||
              request.destination === 'image' ||
              request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets-offline',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // v4.1: Cache de datos JSON/POI para uso offline
          {
            urlPattern: ({ url }) =>
              url.pathname.includes('/data/') ||
              url.pathname.includes('/pois/') ||
              url.pathname.endsWith('.json'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'data-offline',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 3 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // v4.1: Cache de APIs GPS/Relay con NetworkFirst para reconexión offline
          {
            urlPattern: ({ url }) =>
              url.pathname.includes('/api/') &&
              (url.pathname.includes('location') || url.pathname.includes('relay') || url.pathname.includes('stream')),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-gps-offline',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Gigantes y Cabezudos de Zaragoza - Guia oficial',
        short_name: 'GigantesZGZ',
        description: 'Guia oficial de Gigantes y Cabezudos de Zaragoza: agenda, recorridos, enciclopedia y mapa.',
        theme_color: '#D1121F',
        background_color: '#121214',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'favicon.svg',
            sizes: '48x48 72x72 96x96 128x128 192x192 256x256 512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
  },
})
