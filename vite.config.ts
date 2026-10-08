import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Proxying keeps the API on the page's origin, which the admin session and XSRF cookies need.
  const target = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8080'
  const proxy = {
    // Host is kept so Spring sees same-origin requests, including from a phone on the LAN.
    '/api': { target },
    '/ws': { target, ws: true },
  }
  return {
    plugins: [react(), tailwindcss()],
    server: { proxy },
    preview: { proxy },
  }
})
