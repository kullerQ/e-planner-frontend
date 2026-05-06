'use server'

import { getCurrentUserProfile } from '@/lib/auth/currentUser'
import type { User } from '@/types'

export async function getCurrentUser(): Promise<User | null> {
  return getCurrentUserProfile()
}
