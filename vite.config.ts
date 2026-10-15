import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import type { ProxyOptions } from 'vite'
import type { IncomingMessage } from 'node:http'

function isLocalOrigin(request: IncomingMessage) {
  if (!request.headers.origin) return false
  try {
    return new URL(request.headers.origin).host === request.headers.host
  } catch {
    return false
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.API_PROXY_TARGET || 'https://32-236-74-117.sslip.io'
  const origin = new URL(target).origin
  const proxy = {
    '/ws': {
      target,
      changeOrigin: true,
      ws: true,
      configure(proxy) {
        // Spring checks the handshake Origin. The browser connects to this local proxy.
        proxy.on('proxyReqWs', (request, incoming) => {
          if (isLocalOrigin(incoming)) request.setHeader('Origin', origin)
        })
      },
    },
    '/api': {
      target,
      changeOrigin: true,
      cookieDomainRewrite: '',
      configure(proxy) {
        // Rebase browser Origin/Referer along with Host for the upstream same-origin request.
        proxy.on('proxyReq', (request, incoming) => {
          if (isLocalOrigin(incoming)) {
            request.setHeader('Origin', origin)
            if (incoming.headers.referer) request.setHeader('Referer', `${origin}/`)
          }
        })
      },
    },
  } satisfies Record<string, ProxyOptions>
  return { plugins: [react(), tailwindcss()], server: { proxy }, preview: { proxy } }
})
