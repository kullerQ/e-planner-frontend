const HEALTH_CACHE_TTL_MS = process.env['NODE_ENV'] === 'development' ? 3_000 : 20_000
const HEALTH_TIMEOUT_MS = 1_200

function isApiDebugLoggingEnabled(): boolean {
  return process.env['API_DEBUG_LOGS'] === 'true'
}

type HealthCacheEntry = {
  checkedAt: number
  value: boolean
}

let healthCache: HealthCacheEntry | null = null

function getApiBaseUrl(): string | null {
  const apiUrl = process.env['API_URL'] ?? process.env['NEXT_PUBLIC_API_URL']
  if (!apiUrl || apiUrl.trim().length === 0) {
    return null
  }
  return apiUrl.replace(/\/$/, '')
}

function shouldUseCachedHealth(now: number): boolean {
  if (!healthCache) {
    return false
  }
  return now - healthCache.checkedAt < HEALTH_CACHE_TTL_MS
}

function setHealthCache(value: boolean, now: number): boolean {
  healthCache = { checkedAt: now, value }
  return value
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)
  const method = init?.method ?? 'GET'

  try {
    if (isApiDebugLoggingEnabled()) {
      console.info(`[frontend:api:health] ${method} ${url}`)
    }
    const response = await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
    })
    if (isApiDebugLoggingEnabled()) {
      console.info(`[frontend:api:health] ${method} ${url} -> ${response.status}`)
    }
    return response
  } catch (error) {
    console.error(`[frontend:api:health] ${method} ${url} -> network/error`, error)
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function isUnavailableHealthEndpoint(status: number): boolean {
  return status === 404 || status === 405 || status === 501
}

async function checkHealthEndpoint(baseUrl: string): Promise<boolean | 'fallback'> {
  const response = await fetchWithTimeout(`${baseUrl}/health`)

  if (response.status >= 500) {
    return false
  }

  if (isUnavailableHealthEndpoint(response.status)) {
    return 'fallback'
  }

  if (!response.ok) {
    return false
  }

  return true
}

async function checkFallbackLoginHeadProbe(baseUrl: string): Promise<boolean> {
  const response = await fetchWithTimeout(`${baseUrl}/auth/login`, { method: 'HEAD' })

  if (response.status >= 500) {
    return false
  }

  return true
}

export async function isBackendHealthy(): Promise<boolean> {
  const now = Date.now()
  if (shouldUseCachedHealth(now)) {
    return healthCache!.value
  }

  const baseUrl = getApiBaseUrl()
  if (!baseUrl) {
    return setHealthCache(false, now)
  }

  try {
    const healthResult = await checkHealthEndpoint(baseUrl)
    if (healthResult === 'fallback') {
      const fallbackResult = await checkFallbackLoginHeadProbe(baseUrl)
      return setHealthCache(fallbackResult, now)
    }
    return setHealthCache(healthResult, now)
  } catch {
    return setHealthCache(false, now)
  }
}
