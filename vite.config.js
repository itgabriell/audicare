import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true
      },
      manifest: {
        name: 'Audicare',
        short_name: 'Audicare',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'favicon.ico',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon'
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
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
