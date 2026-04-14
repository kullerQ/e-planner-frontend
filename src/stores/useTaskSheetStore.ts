'use client'
import { create } from 'zustand'

interface TaskSheetStore {
  isOpen: boolean
  taskId: string | null
  initialValues: { groupId?: string; dueDate?: string } | undefined
  open: (
    taskId: string | null,
    initialValues?: { groupId?: string; dueDate?: string }
  ) => void
  close: () => void
}

export const useTaskSheetStore = create<TaskSheetStore>()((set) => ({
  isOpen: false,
  taskId: null,
  initialValues: undefined,
  open: (taskId, initialValues) => set({ isOpen: true, taskId, initialValues }),
  close: () => set({ isOpen: false, taskId: null, initialValues: undefined }),
}))
