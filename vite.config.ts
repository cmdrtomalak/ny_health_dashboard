import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000, // Increase warning limit to 1000kB
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['recharts', 'framer-motion'],
        }
      }
    }
  },
  preview: {
    allowedHosts: ['health.dragonflyzen.cc'], 
    port: 3000
  }
})
