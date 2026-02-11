import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente corretamente
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // REMOVIDO: define: { 'process.env': process.env } 
    // Isso causava o erro de build e expunha chaves de segurança.
    // O Vite já expõe variáveis VITE_ automaticamente via import.meta.env

    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          maximumFileSizeToCacheInBytes: 3000000 // Aumenta limite para 3MB
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
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
      sourcemap: false,
      chunkSizeWarningLimit: 1000, // Aumenta limite de aviso
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Group UI components (Radix/Lucide) together
            if (id.includes('@radix-ui') || id.includes('lucide-react')) {
              return 'vendor-ui';
            }
            // Group large utilities separately
            if (id.includes('date-fns') || id.includes('recharts') || id.includes('xlsx')) {
              return 'vendor-utils';
            }
            // Supabase isolated
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            // Framer Motion (heavy)
            if (id.includes('framer-motion')) {
              return 'vendor-animation';
            }
            // Standard node_modules
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          }
        }
      }
    }
  };
});