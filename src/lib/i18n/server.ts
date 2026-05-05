import { cache } from 'react'
import { backendFetch } from '@/lib/api/server'
import type { User } from '@/types'
import { loadMessages } from './loadMessages'
import type { Locale, Messages } from './types'

export const getUserLocale = cache(async (): Promise<Locale> => {
  try {
    const res = await backendFetch('/users/me', { auth: true })
    if (!res.ok) return 'en-US'
    const user = (await res.json()) as User
    return user.preferences?.language ?? 'en-US'
  } catch {
    return 'en-US'
  }
})

export const getServerMessages = cache(async (): Promise<Messages> => {
  const locale = await getUserLocale()
  return loadMessages(locale)
})
