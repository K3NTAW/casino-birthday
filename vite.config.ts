import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Casino Night',
        short_name: 'Casino',
        description: 'A one-night party game. Fun chips, no real money.',
        theme_color: '#0b1f17',
        background_color: '#0a0f0d',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cache the app shell so it survives flaky party Wi-Fi.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // IMPORTANT: never cache Supabase responses — chip data MUST be live.
        navigateFallbackDenylist: [/^\/api/, /supabase/],
        runtimeCaching: [
          {
            // Explicitly bypass cache for all Supabase traffic.
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkOnly',
            method: 'GET',
          },
        ],
      },
    }),
  ],
})
