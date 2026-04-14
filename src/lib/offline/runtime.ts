import { isBackendHealthy } from '@/lib/api/health'

export async function isBackendOffline(): Promise<boolean> {
  return !(await isBackendHealthy())
}

export async function isDevOfflineMockEnabled(): Promise<boolean> {
  if (process.env['NODE_ENV'] !== 'development') {
    return false
  }

  return isBackendOffline()
}
