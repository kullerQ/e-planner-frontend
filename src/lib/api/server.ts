import { cookies } from 'next/headers'

interface BackendFetchOptions extends Omit<RequestInit, 'body'> {
  auth?: boolean
  body?: BodyInit | object | null
}

function getApiBaseUrl(): string {
  const apiUrl = process.env['API_URL']
  if (!apiUrl || apiUrl.trim().length === 0) {
    throw new Error('API_URL is not configured')
  }
  return apiUrl.replace(/\/$/, '')
}

function isBodyInit(value: unknown): value is BodyInit {
  return (
    typeof value === 'string' ||
    value instanceof URLSearchParams ||
    value instanceof FormData ||
    value instanceof Blob ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value) ||
    value instanceof ReadableStream
  )
}

async function buildHeaders(
  auth: boolean,
  rawHeaders: HeadersInit | undefined,
  body: BodyInit | object | null | undefined
): Promise<Headers> {
  const headers = new Headers(rawHeaders)

  if (auth) {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    if (!token) {
      throw new Error('Missing auth token')
    }
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (body !== undefined && body !== null && !isBodyInit(body) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return headers
}

function normalizeBody(body: BodyInit | object | null | undefined): BodyInit | undefined {
  if (body === undefined || body === null) {
    return undefined
  }
  if (isBodyInit(body)) {
    return body
  }
  return JSON.stringify(body)
}

export async function backendFetch(path: string, options: BackendFetchOptions = {}): Promise<Response> {
  const { auth = true, headers, body, ...init } = options
  const baseUrl = getApiBaseUrl()
  const nextHeaders = await buildHeaders(auth, headers, body)
  const normalizedBody = normalizeBody(body)

  const requestInit: RequestInit = {
    ...init,
    headers: nextHeaders,
    ...(normalizedBody !== undefined ? { body: normalizedBody } : {}),
  }

  return fetch(`${baseUrl}${path}`, requestInit)
}

export async function backendFetchJson<T>(path: string, options: BackendFetchOptions = {}): Promise<T> {
  const response = await backendFetch(path, options)
  if (!response.ok) {
    throw new Error(`Backend request failed with status ${response.status}`)
  }
  return response.json() as Promise<T>
}
