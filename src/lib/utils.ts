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
export function formatDueDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
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

/** Past-oriented day buckets (same rules as before: under 24h uses the “today” tier). */
export function relativeTime(iso: string, locale: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) {
    return '—'
  }
  const diffMs = Date.now() - then
  const days = Math.floor(diffMs / 86_400_000)
  const auto = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const always = new Intl.RelativeTimeFormat(locale, { numeric: 'always' })
  if (days <= 0) {
    return auto.format(0, 'day')
  }
  return always.format(-days, 'day')
}

/** Future-oriented countdown in whole days (ceil), localized via Intl. */
export function daysUntil(iso: string, locale: string): string {
  const target = new Date(iso).getTime()
  if (Number.isNaN(target)) {
    return '—'
  }
  const diffMs = target - Date.now()
  const days = Math.ceil(diffMs / 86_400_000)
  const auto = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const always = new Intl.RelativeTimeFormat(locale, { numeric: 'always' })
  if (days <= 0) {
    return auto.format(0, 'day')
  }
  return always.format(days, 'day')
}
