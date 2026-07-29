import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { templateCompilerOptions } from '@tresjs/core'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      src: fileURLToPath(new URL('./src', import.meta.url)),
      components: fileURLToPath(new URL('./src/components', import.meta.url)),
      layouts: fileURLToPath(new URL('./src/layouts', import.meta.url)),
      pages: fileURLToPath(new URL('./src/pages', import.meta.url)),
      stores: fileURLToPath(new URL('./src/stores', import.meta.url)),
      boot: fileURLToPath(new URL('./src/boot', import.meta.url)),
    },
  },

  server: {
    port: 9000,
    open: false,
  },

  build: {
    target: 'es2020',
    // Three.js is large — split it so the shell loads fast
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@tresjs/core', '@tresjs/cientos'],
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/storage'],
        },
      },
    },
  },

  plugins: [
    // TresJS needs its element names registered as custom elements —
    // without this Vue tries to resolve <primitive> and every <Tres*> tag
    // as a component and silently renders nothing.
    vue({ ...templateCompilerOptions }),
    VitePWA({
      // 'prompt' so a new deploy surfaces the 立即更新 refresh button
      // (PwaPrompts) instead of silently swapping under the user.
      registerType: 'prompt',
      // Resolve the virtual:pwa-register module in `vite` dev too, so the
      // install/update composable does not 500 the dev server.
      devOptions: { enabled: true, type: 'module' },
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'],
      manifest: {
        name: '華嚴 · 佛經修行',
        short_name: '華嚴',
        description: '佛經誦讀、持咒與寶石收藏',
        lang: 'zh-TW',
        theme_color: '#0A0A0F',
        background_color: '#0A0A0F',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
        // The bundled 印經坊 reader is ~4MB; don't precache it into the SW.
        globIgnores: ['**/yinjingfang/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // The reader iframes /yinjingfang/index.html. Without this, the SPA
        // navigation fallback answers that iframe navigation with the app's
        // index.html, so 印經坊 never loads and the reader stalls at 90%.
        navigateFallbackDenylist: [/^\/yinjingfang\//],
        // Sutra volumes come from Firebase Storage — cache them on first read
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'sutra-volumes',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
