import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // Add this to prevent process.env errors
    'process.env': {}
  },
  server: {
    host: '127.0.0.1',
    port: 3002,
    strictPort: true,
    hmr: { host: '127.0.0.1', port: 3002 }
  }
})
