import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const backendPort = isDev ? 5191 : 3191;
  const frontendPort = isDev ? 5192 : 3000;

  const proxyConfig = {
    '/api': {
      target: `http://127.0.0.1:${backendPort}`,
      changeOrigin: true
    },
    '/ws': {
      target: `ws://127.0.0.1:${backendPort}`,
      ws: true
    }
  };

  return {
    plugins: [react()],
    build: {
      chunkSizeWarningLimit: 1000,
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
      port: frontendPort,
      proxy: proxyConfig
    },
    server: {
      port: frontendPort,
      proxy: proxyConfig
    }
  };
});
