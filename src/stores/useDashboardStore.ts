'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WidgetPlacement } from '@/types'
import { DEFAULT_WIDGET_LAYOUT } from '@/lib/constants'

interface DashboardStore {
  layout: WidgetPlacement[]
  isEditMode: boolean
  setLayout: (layout: WidgetPlacement[]) => void
  enterEditMode: () => void
  exitEditMode: () => void
  removeWidget: (instanceId: string) => void
  addWidget: (placement: WidgetPlacement) => void
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      layout: DEFAULT_WIDGET_LAYOUT,
      isEditMode: false,
      setLayout: (layout) => set({ layout }),
      enterEditMode: () => set({ isEditMode: true }),
      exitEditMode: () => set({ isEditMode: false }),
      removeWidget: (instanceId) =>
        set((state) => ({
          layout: state.layout.filter((p) => p.instanceId !== instanceId),
        })),
      addWidget: (placement) =>
        set((state) => ({
          layout: [...state.layout, placement],
        })),
    }),
    {
      name: 'e-planner-dashboard-layout',
      version: 3,
      migrate: (persistedState) => persistedState as DashboardStore,
    }
  )
)
