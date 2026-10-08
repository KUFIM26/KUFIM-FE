import { apiBaseUrl } from './config'
import { getClientToken } from './token'

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export const adminUnauthorizedEvent = 'kufim:admin-unauthorized'

type Envelope<T> = {
  success: boolean
  data: T
  error: { code: string; message: string; details?: unknown } | null
}
type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
  idempotencyKey?: string
  signal?: AbortSignal
  accept?: string
}

function readCookie(name: string) {
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const params = new URLSearchParams()
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  const search = params.toString()
  return `${apiBaseUrl}/api/v1${path}${search ? `?${search}` : ''}`
}

async function send(path: string, options: RequestOptions) {
  const method = options.method ?? 'GET'
  const admin = path.startsWith('/admin')
  // Error bodies are always JSON, so a binary request must still accept it.
  const headers: Record<string, string> = {
    Accept: options.accept ? `${options.accept}, application/json` : 'application/json',
  }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (!admin) headers['X-Client-Token'] = getClientToken()
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey
  if (admin && method !== 'GET') {
    const csrf = readCookie('XSRF-TOKEN')
    if (csrf) headers['X-XSRF-TOKEN'] = csrf
  }
  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'include',
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'NETWORK', '서버에 연결하지 못했어요. 네트워크를 확인해주세요.')
  }
  if (!response.ok) {
    let envelope: Envelope<unknown> | null = null
    try {
      envelope = await response.json()
    } catch {
      // Proxies and gateways can answer with HTML; fall through to the generic message.
    }
    const code = envelope?.error?.code ?? `HTTP_${response.status}`
    if (admin && response.status === 401 && !path.startsWith('/admin/auth/login'))
      window.dispatchEvent(new Event(adminUnauthorizedEvent))
    throw new ApiError(
      response.status,
      code,
      envelope?.error?.message ?? '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.',
      envelope?.error?.details,
    )
  }
  return response
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options)
  if (response.status === 204) return undefined as T
  const envelope: Envelope<T> = await response.json()
  return envelope.data
}

export async function requestBlob(path: string, accept: string) {
  const response = await send(path, { accept })
  return response.blob()
}
