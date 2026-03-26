'use client'
import { create } from 'zustand'

interface TaskSheetStore {
  isOpen: boolean
  taskId: string | null
  open: (taskId: string | null) => void
  close: () => void
}

export const useTaskSheetStore = create<TaskSheetStore>()((set) => ({
  isOpen: false,
  taskId: null,
  open: (taskId) => set({ isOpen: true, taskId }),
  close: () => set({ isOpen: false, taskId: null }),
}))
