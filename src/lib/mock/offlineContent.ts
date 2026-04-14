import { messages } from '@/lib/messages'

export interface OfflineListPlaceholder {
  readonly items: readonly []
}

export interface OfflineDailyPhrasePlaceholder {
  readonly text: string
  readonly offline: true
}

export const OFFLINE_TASKS_PLACEHOLDER: OfflineListPlaceholder = {
  items: [],
}

export const OFFLINE_RECYCLE_BIN_PLACEHOLDER: OfflineListPlaceholder = {
  items: [],
}

export const OFFLINE_CALENDAR_PLACEHOLDER: OfflineListPlaceholder = {
  items: [],
}

export const OFFLINE_FOLDERS_PLACEHOLDER: OfflineListPlaceholder = {
  items: [],
}

export const OFFLINE_DAILY_PHRASE: OfflineDailyPhrasePlaceholder = {
  text: messages.offline.fallbackDailyPhrase,
  offline: true,
}
