'use client'

import { useEffect } from 'react'

const POLL_INTERVAL_MS = 5_000
const REQUEST_TIMEOUT_MS = 1_200
const UNAVAILABLE_HEALTH_STATUSES = new Set([404, 405, 501])

function getApiBaseUrl(): string | null {
  const apiUrl = process.env['NEXT_PUBLIC_API_URL']
  if (!apiUrl || apiUrl.trim().length === 0) {
    return null
  }
  return apiUrl.replace(/\/$/, '')
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    return await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
    })
  } finally {
    window.clearTimeout(timeout)
  }
}

async function isBackendHealthyClientSide(): Promise<boolean> {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl) {
    return false
  }

  try {
    const healthResponse = await fetchWithTimeout(`${baseUrl}/health`)
    if (healthResponse.status >= 500) {
      return false
    }
    if (UNAVAILABLE_HEALTH_STATUSES.has(healthResponse.status)) {
      const fallbackResponse = await fetchWithTimeout(`${baseUrl}/auth/login`, { method: 'HEAD' })
      return fallbackResponse.status < 500
    }
    return healthResponse.ok
  } catch {
    return false
  }
}

export function OfflineAutoRedirect() {
  useEffect(() => {
    let active = true
    let intervalId: number | null = null

    const checkAndRedirect = async () => {
      const backendHealthy = await isBackendHealthyClientSide()
      if (!active || !backendHealthy) {
        return
      }

      if (intervalId !== null) {
        window.clearInterval(intervalId)
      }

      // Re-hit /offline so proxy can perform canonical route selection.
      window.location.assign('/offline')
    }

    void checkAndRedirect()
    intervalId = window.setInterval(() => {
      void checkAndRedirect()
    }, POLL_INTERVAL_MS)

    return () => {
      active = false
      if (intervalId !== null) {
        window.clearInterval(intervalId)
      }
    }
  }, [])

  return null
}
