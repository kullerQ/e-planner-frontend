import { apiFetch } from '@/lib/api'
import type { User } from '@/types'

export async function getMe(): Promise<User> {
  return apiFetch<User>('/auth/me')
}
