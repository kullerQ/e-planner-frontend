'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WeekStartsOn } from '@/lib/preferences'

export interface SettingsStore {
  weekStartsOn: WeekStartsOn
  defaultStatus: 'todo' | 'in_progress'
  setWeekStartsOn: (v: WeekStartsOn) => void
  setDefaultStatus: (s: 'todo' | 'in_progress') => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      weekStartsOn: 1, // Monday default
      defaultStatus: 'todo',
      setWeekStartsOn: (v) => set({ weekStartsOn: v }),
      setDefaultStatus: (s) => set({ defaultStatus: s }),
    }),
    {
      name: 'e-planner-settings',
      version: 2,
      migrate: (persistedState) => {
        // Remove old defaultPriority field if present
        const state = persistedState as Record<string, unknown>
        const { defaultPriority: _, ...rest } = state
        // Ensure required fields exist with defaults
        return {
          weekStartsOn: (rest.weekStartsOn as WeekStartsOn) ?? 1,
          defaultStatus: (rest.defaultStatus as 'todo' | 'in_progress') ?? 'todo',
          setWeekStartsOn: () => {},
          setDefaultStatus: () => {},
          ...rest,
        } as SettingsStore
      },
    }
  )
)
