'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type GroupByDimension =
  | 'none' | 'folder' | 'tag' | 'priority'
  | 'complexity' | 'date' | 'status'

export type SortByDimension =
  | 'date' | 'priority' | 'complexity'
  | 'tag' | 'title' | 'created' | 'status'

export type SortDirection = 'asc' | 'desc'

interface FilterStore {
  searchQuery: string
  groupBy: GroupByDimension
  sortBy: SortByDimension
  sortDirection: SortDirection
  setSearchQuery: (q: string) => void
  setGroupBy: (g: GroupByDimension) => void
  setSortBy: (s: SortByDimension) => void
  toggleSortDirection: () => void
  reset: () => void
}

const DEFAULT_STATE = {
  searchQuery: '',
  groupBy: 'none' as GroupByDimension,
  sortBy: 'date' as SortByDimension,
  sortDirection: 'asc' as SortDirection,
}

export const useFilterStore = create<FilterStore>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      setSearchQuery: (q) => set({ searchQuery: q }),
      setGroupBy: (g) => set({ groupBy: g }),
      setSortBy: (s) => set({ sortBy: s }),
      toggleSortDirection: () =>
        set((state) => ({ sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc' })),
      reset: () => set(DEFAULT_STATE),
    }),
    { name: 'e-planner-filter-state' }
  )
)
