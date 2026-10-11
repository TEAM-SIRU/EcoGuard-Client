import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/v1': {
          target: env.ECOGUARD_SERVER_URL || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  }
})
