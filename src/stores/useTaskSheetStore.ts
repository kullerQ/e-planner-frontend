'use client'
import { create } from 'zustand'
import type { TaskStatus } from '@/types'

interface TaskSheetStore {
  isOpen: boolean
  taskId: string | null
  initialValues: { groupId?: string; dueDate?: string } | undefined
  statusOverrides: Record<string, TaskStatus>
  /** Blocks task sheet opens while a row delete confirmation dialog is open. */
  deleteConfirmTaskId: string | null
  /** Skips unsaved-changes guard when closing programmatically (delete/undo). */
  forceClosePending: boolean
  open: (
    taskId: string | null,
    initialValues?: { groupId?: string; dueDate?: string }
  ) => void
  close: () => void
  closeForce: () => void
  acknowledgeForceClose: () => void
  setDeleteConfirmTaskId: (taskId: string | null) => void
  setStatusOverride: (taskId: string, status: TaskStatus) => void
  clearStatusOverride: (taskId: string) => void
}

export const useTaskSheetStore = create<TaskSheetStore>()((set) => ({
  isOpen: false,
  taskId: null,
  initialValues: undefined,
  statusOverrides: {},
  deleteConfirmTaskId: null,
  forceClosePending: false,
  open: (taskId, initialValues) =>
    set((state) => {
      if (state.deleteConfirmTaskId !== null) {
        return state
      }
      return { isOpen: true, taskId, initialValues }
    }),
  close: () => set({ isOpen: false, taskId: null, initialValues: undefined }),
  closeForce: () =>
    set({
      forceClosePending: true,
      isOpen: false,
      taskId: null,
      initialValues: undefined,
    }),
  acknowledgeForceClose: () => set({ forceClosePending: false }),
  setDeleteConfirmTaskId: (taskId) => set({ deleteConfirmTaskId: taskId }),
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
