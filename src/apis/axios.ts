import axios from 'axios'
import type { ApiResponse } from './type'
import i18n from '../i18n'
import { englishErrors } from '../i18n/errors'

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
      throw new Error(i18n.t('errors.badResponse'))
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
    if (error.response?.status === 429) return i18n.t('errors.tooMany')
    if (!error.response) return i18n.t('errors.offline')
    const serverError = error.response.data?.error
    // 서버 문구는 한국어뿐이라, 영어 화면에서는 코드로 고른 문구나 일반 문구를 보여준다.
    if (i18n.language !== 'ko')
      return englishErrors[serverError?.code ?? ''] || i18n.t('errors.failed')
    return serverError?.message || i18n.t('errors.failed')
  }
  return error instanceof Error ? error.message : i18n.t('errors.failed')
}

export function isNotFound(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 404
}
export default api
