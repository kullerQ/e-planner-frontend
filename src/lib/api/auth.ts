import { clientApiFetch } from '@/lib/api'
import type { User } from '@/types'

export async function getMe(): Promise<User> {
  return clientApiFetch<User>('/users/me')
}
