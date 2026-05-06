import { cache } from 'react'
import { serverApiFetch } from '@/lib/api/server'
import { isDevOfflineMockEnabled } from '@/lib/offline/runtime'
import { OFFLINE_USER } from '@/lib/mock/offlineUser'
import type { User } from '@/types'

export const getCurrentUserProfile = cache(async (): Promise<User | null> => {
  if (await isDevOfflineMockEnabled()) {
    return OFFLINE_USER
  }

  try {
    const res = await serverApiFetch('/users/me', { cache: 'no-store' })
    if (!res.ok) {
      return null
    }
    return (await res.json()) as User
  } catch {
    return null
  }
})
