'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CalendarSidebarStore {
  isRightSidebarFolded: boolean
  toggleRightSidebarFold: () => void
  setRightSidebarFolded: (folded: boolean) => void
}

export const useCalendarSidebarStore = create<CalendarSidebarStore>()(
  persist(
    (set) => ({
      isRightSidebarFolded: false,
      toggleRightSidebarFold: () =>
        set((state) => ({ isRightSidebarFolded: !state.isRightSidebarFolded })),
      setRightSidebarFolded: (folded) => set({ isRightSidebarFolded: folded }),
    }),
    { name: 'e-planner-calendar-right-sidebar-folded' }
  )
)
