import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxy = {
    '/ws': { target: env.API_PROXY_TARGET || 'http://127.0.0.1:8080', ws: true },
    '/api': { target: env.API_PROXY_TARGET || 'http://127.0.0.1:8080', changeOrigin: true },
  }
  return { plugins: [react(), tailwindcss()], server: { proxy }, preview: { proxy } }
})
