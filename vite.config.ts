import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/agent1': {
        target: 'https://novusautomations.net/webhook/f49d3bf6-9601-4c30-8921-abe3fba7d661',
        changeOrigin: true,
        rewrite: (path) => '',
      },
      '/api/agent2': {
        target: 'https://novusautomations.net/webhook/a13a060a-62be-4ae8-a1f3-6503d23032bb',
        changeOrigin: true,
        rewrite: (path) => '',
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          icons: ['lucide-react']
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
  }
});
