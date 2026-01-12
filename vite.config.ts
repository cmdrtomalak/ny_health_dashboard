import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  const isDev = mode === 'development';
  // Use env var PORT if available, else default.
  // Note: config/index.ts also handles PORT for backend.
  // We need to ensure we use the same logic or separate vars.
  // The user requested "Make these configurable via .env file".
  // Let's look for PROD_PORT/DEV_PORT or similar, but since we are in Vite context,
  // we are defining FRONTEND ports here mostly.

  // Backend port for proxy
  const backendPort = parseInt(env.PORT || (isDev ? '5191' : '3190'), 10);

  // Frontend port
  // Allow VITE_PORT or FRONTEND_PORT to override defaults
  const defaultFrontendPort = isDev ? 5192 : 3000;
  const frontendPort = parseInt(env.FRONTEND_PORT || env.VITE_PORT || String(defaultFrontendPort), 10);

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
