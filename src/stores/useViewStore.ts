'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type CalendarViewMode = 'day' | 'week' | 'month'

interface ViewStore {
  calendarView: CalendarViewMode
  setCalendarView: (view: CalendarViewMode) => void
}

export const useViewStore = create<ViewStore>()(
  persist(
    (set) => ({
      calendarView: 'week',
      setCalendarView: (view) => set({ calendarView: view }),
    }),
    { name: 'e-planner-calendar-view' }
  )
)
