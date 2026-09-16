import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/comparsas/**', 'icons/icon-*.png'],
      // Caché runtime de tiles del mapa: la primera visita los descarga y las
      // siguientes (y los modos sin conexión) se sirven de caché -> mapa
      // instantáneo y 0 consumo de datos repetido.
      workbox: {
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
        ],
      },
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
          // PNG rasterizados (generados con `node scripts/generate-icons.mjs`):
          // mejor compatibilidad con instaladores Android/Windows que el SVG,
          // y "any maskable" garantiza recortes redondos sin perder el motivo.
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
  // SPA fallback for both dev and preview servers
  appType: 'spa',
  build: {
    // Disable <link rel="modulepreload"> generation. These preloads conflict
    // with the Workbox Service Worker (precacheAndRoute): on repeat loads the
    // SW intercepts those requests and serves them from cache, so Chrome reports
    // "cross-world service worker resource mismatch" / "preloaded but not used"
    // warnings. The SW cache already guarantees instant loads, so preloading
    // these hashed vendor chunks is unnecessary and actively harmful.
    modulePreload: false,
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