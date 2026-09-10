import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Blorbmart Rider',
        short_name: 'Blorb Rider',
        description: 'Deliver orders around campus and get paid the same day.',
        theme_color: '#0A0F12',
        background_color: '#0A0F12',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['business', 'food', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          // A maskable icon is what stops Android drawing the logo inside a
          // white square on top of the launcher's own shape.
          { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Go online', short_name: 'Online', url: '/?go=online' },
          { name: 'My earnings', short_name: 'Earnings', url: '/earnings' },
        ],
      },
      workbox: {
        // The app shell is precached so a rider in a basement or a dead spot
        // still gets the interface and a clear "you are offline" state, rather
        // than the browser's dinosaur.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // The 4500px source artwork. The app draws the mark inline and the
        // icons are rendered from these, so nothing loads them — precaching
        // them would spend ~270KB of a rider's data on every install.
        globIgnores: ['**/icons/full-logo.png', '**/icons/shortlogo.png'],
        navigateFallback: '/index.html',
        // Firebase and the API must never be served from a cache. A stale
        // job board would have riders racing for orders that were delivered
        // an hour ago, and a stale wallet balance is worse.
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
})
