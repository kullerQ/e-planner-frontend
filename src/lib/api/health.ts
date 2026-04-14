const HEALTH_CACHE_TTL_MS = 3_000
const HEALTH_TIMEOUT_MS = 1_200

type HealthCacheEntry = {
  checkedAt: number
  value: boolean
}

let healthCache: HealthCacheEntry | null = null

function getApiBaseUrl(): string | null {
  const apiUrl = process.env['API_URL']
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

  try {
    return await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
    })
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

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return false
  }

  if (typeof payload !== 'object' || payload === null) {
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
