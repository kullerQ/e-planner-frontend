import { cache } from 'react'
import { getCurrentUserProfile } from '@/lib/auth/currentUser'
import { loadMessages } from './loadMessages'
import type { Locale, Messages } from './types'

export const getUserLocale = cache(async (): Promise<Locale> => {
  const user = await getCurrentUserProfile()
  if (!user) {
    return 'en-US'
  }

  return user.preferences?.language ?? 'en-US'
})

export const getServerMessages = cache(async (): Promise<Messages> => {
  const locale = await getUserLocale()
  return loadMessages(locale)
})
