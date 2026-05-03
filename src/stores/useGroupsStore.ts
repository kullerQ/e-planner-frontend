'use client'

import { create } from 'zustand'
import type { TaskGroup } from '@/types'

interface GroupsStore {
  groups: TaskGroup[]
  initialized: boolean
  setGroups: (groups: TaskGroup[]) => void
  addGroup: (group: TaskGroup) => void
  updateGroup: (group: TaskGroup) => void
  removeGroup: (groupId: string) => void
}

export const useGroupsStore = create<GroupsStore>()((set) => ({
  groups: [],
  initialized: false,
  setGroups: (groups) => set({ groups, initialized: true }),
  addGroup: (group) =>
    set((state) => ({ groups: [...state.groups, group] })),
  updateGroup: (group) =>
    set((state) => ({
      groups: state.groups.map((g) => (g.id === group.id ? group : g)),
    })),
  removeGroup: (groupId) =>
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== groupId),
    })),
}))
