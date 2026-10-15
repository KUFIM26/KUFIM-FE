import axios from 'axios'
import type { ApiResponse } from './type'

export const SESSION_EXPIRED = 'kufim:session-expired'
const CLIENT_TOKEN_KEY = 'kufim.clientToken'

export function getClientToken() {
  const stored = localStorage.getItem(CLIENT_TOKEN_KEY)
  if (
    stored &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stored)
  )
    return stored
  const token = crypto.randomUUID()
  localStorage.setItem(CLIENT_TOKEN_KEY, token)
  return token
}

// Use the same-origin /api proxy by default so session and CSRF cookies work together.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  withXSRFToken: true,
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  config.headers.set('X-Client-Token', getClientToken())
  return config
})

api.interceptors.response.use(
  (response) => {
    if (
      response.status !== 204 &&
      response.config.responseType !== 'blob' &&
      (response.data?.success !== true ||
        !Object.prototype.hasOwnProperty.call(response.data, 'data'))
    ) {
      throw new Error('서버 응답을 읽을 수 없습니다. API 연결 설정을 확인해주세요.')
    }
    return response
  },
  async (error: unknown) => {
    // QR downloads request blobs; error envelopes must still be readable.
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await error.response.data.text())
      } catch {
        // Preserve non-JSON errors for the generic error message.
      }
    }
    if (
      axios.isAxiosError(error) &&
      (error.response?.status === 401 || error.response?.data?.error?.code === 'A005') &&
      error.config?.url?.startsWith('/admin/') &&
      error.config.url !== '/admin/auth/login' &&
      error.config.url !== '/admin/auth/me'
    ) {
      // Keep visitor ownership intact. The route guard handles navigation without a reload loop.
      window.dispatchEvent(new Event(SESSION_EXPIRED))
    }
    return Promise.reject(error)
  },
)

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    if (error.response?.status === 429) return '요청이 많습니다. 잠시 후 다시 시도해주세요.'
    return (
      error.response?.data?.error?.message ||
      (error.response
        ? '요청을 처리하지 못했습니다.'
        : '서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.')
    )
  }
  return error instanceof Error ? error.message : '요청을 처리하지 못했습니다.'
}

export function isNotFound(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 404
}
export default api
