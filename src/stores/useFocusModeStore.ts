'use client'
import { create } from 'zustand'

interface FocusModeStore {
  activeTaskId: string | null
  timerState: 'idle' | 'running' | 'break'
}

export const useFocusModeStore = create<FocusModeStore>()(() => ({
  activeTaskId: null,
  timerState: 'idle',
}))
