'use client'
import { create } from 'zustand'

interface SelectionStore {
  selectedIds: Set<string>
  isSelecting: boolean
  toggleSelection: (id: string) => void
  selectAll: (ids: string[]) => void
  clearSelection: () => void
  enterSelectMode: () => void
  exitSelectMode: () => void
}

export const useSelectionStore = create<SelectionStore>()((set) => ({
  selectedIds: new Set<string>(),
  isSelecting: false,
  toggleSelection: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return { selectedIds: next }
    }),
  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
  clearSelection: () => set({ selectedIds: new Set<string>() }),
  enterSelectMode: () => set({ isSelecting: true }),
  exitSelectMode: () => set({ isSelecting: false, selectedIds: new Set<string>() }),
}))
