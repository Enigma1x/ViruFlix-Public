import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), VitePWA({ registerType: 'autoUpdate', injectRegister: 'auto', devOptions: { enabled: false }, workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'] } })],
  base: './',
  test: { globals: true, environment: 'jsdom', include: ['src/**/*.{test,spec}.{js,jsx}'], coverage: { provider: 'v8', reporter: ['text', 'html'] } },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react') || id.includes('react-dom')) return 'react-vendor';
          if (id.includes('react-router')) return 'router-vendor';
          if (id.includes('framer-motion')) return 'animation-vendor';
          return 'vendor';
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: { compress: { drop_console: true, drop_debugger: true } }
  },
  server: { port: 5173, strictPort: true, open: false },
  preview: { port: 4173, strictPort: true },
  define: { 'process.env.VITE_DEV_SERVER_URL': JSON.stringify('http://localhost:5173') },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } }
});
