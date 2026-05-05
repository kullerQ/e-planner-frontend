'use client'

import { useSettingsStore } from '@/stores/useSettingsStore'

export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6

export const DEFAULT_WEEK_STARTS_ON: WeekStartsOn = 1

export function useWeekStartsOn(): WeekStartsOn {
  return useSettingsStore((state) => state.weekStartsOn)
}
