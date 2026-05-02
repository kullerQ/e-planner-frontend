'use client'
import { create } from 'zustand'
import type { TaskStatus } from '@/types'

interface TaskSheetStore {
  isOpen: boolean
  taskId: string | null
  initialValues: { groupId?: string; dueDate?: string } | undefined
  statusOverrides: Record<string, TaskStatus>
  open: (
    taskId: string | null,
    initialValues?: { groupId?: string; dueDate?: string }
  ) => void
  close: () => void
  setStatusOverride: (taskId: string, status: TaskStatus) => void
  clearStatusOverride: (taskId: string) => void
}

export const useTaskSheetStore = create<TaskSheetStore>()((set) => ({
  isOpen: false,
  taskId: null,
  initialValues: undefined,
  statusOverrides: {},
  open: (taskId, initialValues) => set({ isOpen: true, taskId, initialValues }),
  close: () => set({ isOpen: false, taskId: null, initialValues: undefined }),
  setStatusOverride: (taskId, status) =>
    set((state) => {
      if (state.statusOverrides[taskId] === status) {
        return state
      }
      return {
        statusOverrides: {
          ...state.statusOverrides,
          [taskId]: status,
        },
      }
    }),
  clearStatusOverride: (taskId) =>
    set((state) => {
      if (!(taskId in state.statusOverrides)) {
        return state
      }
      const nextOverrides = { ...state.statusOverrides }
      delete nextOverrides[taskId]
      return {
        statusOverrides: nextOverrides,
      }
    }),
}))
