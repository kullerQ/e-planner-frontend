import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Task, TaskGroup } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Getter for task color
export function resolveTaskColor(task: Task, group: TaskGroup | null): string {
  if (task.colorInherited && group !== null) return group.colorHex
  return task.colorHex
}

// Format ISO date string to human-readable with time (e.g. "Mar 30, 14:30")
export function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

// Returns true if an ISO date string is in the past
export function isOverdue(iso: string | null): boolean {
  if (iso === null) return false
  return new Date(iso) < new Date()
}

// Returns true if due date is within the next 24 hours (and not yet overdue)
export function isDueSoon(iso: string | null): boolean {
  if (iso === null) return false
  const due = new Date(iso).getTime()
  const now = Date.now()
  return due >= now && due - now <= 24 * 60 * 60 * 1000
}

export function randomGroupColor(): string {
  const palette = [
    '#4ade80', '#60a5fa', '#f472b6', '#fb923c', '#a78bfa',
    '#34d399', '#facc15', '#f87171', '#38bdf8', '#c084fc',
  ]
  const index = Math.floor(Math.random() * palette.length)
  return palette[index] ?? '#4ade80'
}

// Returns "N days ago" relative time label
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

// Returns "in N days" label for auto-deletion countdown
export function daysUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now()
  const days = Math.ceil(diff / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'in 1 day'
  return `in ${days} days`
}
