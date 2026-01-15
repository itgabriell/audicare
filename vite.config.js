import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    /*VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Audicare - Sistema de Clínica',
        short_name: 'Audicare',
        description: 'Sistema completo de gestão para clínicas audiológicas',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**//**.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          // API do Supabase - Network First
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*//*i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 horas
              },
              cacheKeyWillBeUsed: async ({ request }) => {
                // Personalizar chave de cache baseada no método e URL
                const url = new URL(request.url);
                return `${request.method}-${url.pathname}${url.search}`;
              }
            }
          },
          // Assets estáticos - Cache First
          {
            urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 dias
              }
            }
          },
          // Fontes - Cache First
          {
            urlPattern: /^https:\/\/.*\.(?:woff|woff2|ttf|eot)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 ano
              }
            }
          }
        ],
        // Estratégia de cache offline
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true
      },
      devOptions: {
        enabled: false // Desabilitar PWA em desenvolvimento
      }
    }) */
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000, // O site vai rodar em localhost:3000
  },
  build: {
    // Otimização de build para performance
    rollupOptions: {
      output: {
        // Code splitting inteligente por rotas
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tooltip'],
          'supabase-vendor': ['@supabase/supabase-js'],

          // Feature chunks - carregamento lazy
          'dashboard': ['./src/pages/Dashboard.jsx'],
          'inbox': ['./src/pages/Inbox.jsx'],
          'appointments': ['./src/pages/Appointments.jsx'],
          'patients': ['./src/pages/Patients.jsx'],
          'crm': ['./src/pages/CRM.jsx'],
          'tasks': ['./src/pages/Tasks.jsx'],

          // Utility chunks
          'charts': ['recharts'],
          'forms': ['react-hook-form', '@hookform/resolvers'],
          'utils': ['date-fns', 'clsx', 'tailwind-merge'],

          // Large libraries
          'xlsx': ['xlsx'],
          'jspdf': ['jspdf']
        },

        // Nomes de arquivos otimizados
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },

    // Otimizações de build
    chunkSizeWarningLimit: 1000, // Avisar sobre chunks grandes
    minify: 'esbuild', // Minificação rápida
    sourcemap: false, // Desabilitar sourcemaps em produção

    // Preload modules for better performance
    modulePreload: {
      polyfill: false
    }
  },

  // Otimizações de dependências
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'date-fns',
      'framer-motion',
      'lucide-react'
    ],
    exclude: ['xlsx', 'jspdf'] // Lazy load heavy libraries
  },


});
