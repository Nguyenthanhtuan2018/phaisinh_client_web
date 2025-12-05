import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@waves/shared': fileURLToPath(new URL('../shared/src', import.meta.url))
    }
  },
  optimizeDeps: {
    include: ['lightweight-charts']
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      },
      // Proxy to VPS WebSocket
      '/vps-ws': {
        target: 'wss://web4.vps.com.vn',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/vps-ws/, '/Push/socket.io'),
        headers: {
          'Origin': 'https://smartoneweb.vps.com.vn'
        }
      }
    }
  }
});
