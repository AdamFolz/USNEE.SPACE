import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/',
  // Vite по умолчанию биндится на 'localhost', а на этой машине он разрешается
  // только в ::1 — тогда http://127.0.0.1:5173 не отвечает. Фиксируем IPv4.
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    css: true
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'USNEE',
        short_name: 'USNEE',
        description: 'Без осуждения, только факты',
        lang: 'ru',
        theme_color: '#0f0d0b',
        background_color: '#0f0d0b',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        // Новая версия должна вставать сразу: иначе у пользователя остаётся
        // старая оболочка из precache и приложение выглядит «не открывается».
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Mini App SW scope is /usnee-app/, which also covers /landing/.
        // Without this, NavigationRoute serves the SPA shell there.
        navigateFallbackDenylist: [/\/landing(?:\/|$)/],
        runtimeCaching: [
          {
            // Never cache API responses: sensitive data must not be served from SW cache.
            urlPattern: /\/api\//,
            handler: 'NetworkOnly'
          },
          {
            // SEC: cache only same-origin app assets. The previous catch-all
            // /^https:\/\/.*\/.*/ (NetworkFirst) matched every cross-origin
            // request; once a real API appears it would silently cache
            // responses of any https host into the offline store.
            urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
              sameOrigin,
            handler: 'NetworkFirst',
            options: { cacheName: 'usnee-cache' }
          }
        ]
      }
    })
  ],

  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts']
        }
      }
    }
  }
})
