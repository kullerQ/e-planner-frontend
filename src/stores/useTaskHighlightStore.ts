'use client'

import { create } from 'zustand'

interface TaskHighlightStore {
  pendingIds: string[]
  requestHighlight: (taskId: string) => void
  clearPending: (taskId: string) => void
}

export const useTaskHighlightStore = create<TaskHighlightStore>()((set) => ({
  pendingIds: [],
  requestHighlight: (taskId) =>
    set((state) =>
      state.pendingIds.includes(taskId)
        ? state
        : { pendingIds: [...state.pendingIds, taskId] }
    ),
  clearPending: (taskId) =>
    set((state) => ({
      pendingIds: state.pendingIds.filter((id) => id !== taskId),
    })),
}))
