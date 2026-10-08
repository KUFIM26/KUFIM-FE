// `mock` keeps the in-memory Figma demo. `api` reads and writes through the KUFIM backend.
export const dataSource: 'mock' | 'api' =
  import.meta.env.VITE_DATA_SOURCE === 'api' ? 'api' : 'mock'
export const isApiMode = dataSource === 'api'

// Leave empty to call the same origin. The admin session and XSRF cookies only work
// when the API is served from the same site, so deploy it behind a `/api` rewrite.
export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
