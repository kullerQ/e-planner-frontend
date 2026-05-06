function getClientApiBaseUrl(): string {
  const apiUrl = process.env['NEXT_PUBLIC_API_URL']
  if (!apiUrl || apiUrl.trim().length === 0) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured')
  }
  return apiUrl.replace(/\/$/, '')
}

function isApiDebugLoggingEnabled(): boolean {
  return process.env['NEXT_PUBLIC_API_DEBUG_LOGS'] === 'true'
}

function logClientRequestStart(method: string, url: string): void {
  if (!isApiDebugLoggingEnabled()) {
    return
  }
  console.info(`[frontend:api:client] ${method} ${url}`)
}

function logClientRequestSuccess(method: string, url: string, status: number): void {
  if (!isApiDebugLoggingEnabled()) {
    return
  }
  console.info(`[frontend:api:client] ${method} ${url} -> ${status}`)
}

function logClientRequestError(method: string, url: string, error: unknown): void {
  console.error(`[frontend:api:client] ${method} ${url} -> network/error`, error)
}

export async function clientApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getClientApiBaseUrl()
  const url = `${baseUrl}${path}`
  const method = init?.method ?? 'GET'
  logClientRequestStart(method, url)

  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      credentials: 'include',
    })
  } catch (error) {
    logClientRequestError(method, url, error)
    throw error
  }

  logClientRequestSuccess(method, url, res.status)

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export { createTag, deleteTag, getTags, renameTag } from './tags'
