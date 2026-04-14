'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CalendarVisibilityStore {
  hiddenGroupIds: Set<string>
  toggleGroup: (groupId: string) => void
  showAll: () => void
}

interface CalendarVisibilityPersistedState {
  hiddenGroupIds: string[]
}

export const useCalendarVisibilityStore = create<CalendarVisibilityStore>()(
  persist(
    (set) => ({
      hiddenGroupIds: new Set<string>(),
      toggleGroup: (groupId) =>
        set((state) => {
          const next = new Set(state.hiddenGroupIds)
          if (next.has(groupId)) {
            next.delete(groupId)
          } else {
            next.add(groupId)
          }
          return { hiddenGroupIds: next }
        }),
      showAll: () => set({ hiddenGroupIds: new Set<string>() }),
    }),
    {
      name: 'e-planner-calendar-visibility',
      partialize: (state) => ({
        hiddenGroupIds: Array.from(state.hiddenGroupIds),
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as CalendarVisibilityPersistedState | undefined
        return {
          ...currentState,
          hiddenGroupIds: new Set(persisted?.hiddenGroupIds ?? []),
        }
      },
    }
  )
)
