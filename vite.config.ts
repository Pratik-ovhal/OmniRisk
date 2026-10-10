import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nominatim/, ''),
        headers: {
          'User-Agent': 'OmniRisk-DecisionSupport/1.0 (contact: admin@omnirisk.local)',
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './assets'),
      'assets': path.resolve(__dirname, './assets'),
      'assests': path.resolve(__dirname, './assests'),
    },
  },
})
