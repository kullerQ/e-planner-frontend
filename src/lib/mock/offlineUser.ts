import type { User } from '@/types'

export const OFFLINE_USER: User = {
  id: 'offline-user',
  name: 'User',
  email: 'user@email.com',
  avatarUrl: null,
  preferences: { language: 'en' },
}
