'use client'

import { cn } from '@/lib/utils'
import { resolveTaskColor } from '@/lib/utils'
import type { Task, TaskGroup } from '@/types'

interface CalendarTaskPillProps {
  task: Task
  group: TaskGroup | null
  onClick: () => void
}

export function CalendarTaskPill({ task, group, onClick }: CalendarTaskPillProps) {
  const color = resolveTaskColor(task, group)
  const groupColor = group?.colorHex ?? color

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'w-full text-left rounded-md px-2 py-1 text-xs font-medium cursor-pointer',
        'border transition-colors'
      )}
      style={{
        borderColor: group
          ? `color-mix(in oklab, ${groupColor} 32%, var(--border))`
          : 'var(--border)',
        backgroundColor: group
          ? `color-mix(in oklab, ${groupColor} var(--cal-task-tint), var(--card))`
          : 'var(--cal-task-neutral)',
        color: 'var(--foreground)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = group
          ? `color-mix(in oklab, ${groupColor} var(--cal-task-tint-hover), var(--card))`
          : 'var(--cal-task-neutral-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = group
          ? `color-mix(in oklab, ${groupColor} var(--cal-task-tint), var(--card))`
          : 'var(--cal-task-neutral)'
      }}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: group ? groupColor : 'var(--muted-foreground)' }}
          aria-hidden="true"
        />
        <span className="truncate">{task.title}</span>
      </span>
    </button>
  )
}

interface CalendarTaskBlockProps {
  task: Task
  group: TaskGroup | null
  totalMinutes: number
  durationMinutes: number
  startMinutes: number
  stackIndex: number
  groupSize: number
  onClick: () => void
}

export function CalendarTaskBlock({
  task,
  group,
  totalMinutes,
  durationMinutes,
  startMinutes,
  stackIndex,
  groupSize,
  onClick,
}: CalendarTaskBlockProps) {
  const color = resolveTaskColor(task, group)
  const groupColor = group?.colorHex ?? color
  const GAP_PX = 2
  const totalGaps = (groupSize - 1) * GAP_PX
  const slotTopPercent = (startMinutes / totalMinutes) * 100
  const slotHeightPercent = (durationMinutes / totalMinutes) * 100
  // Each task's height = (full slot height - total gaps) / groupSize
  // Each task's top   = slot top + index * (height + gap)

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'absolute left-0 right-1 rounded-md px-2 py-1 text-xs font-medium cursor-pointer pointer-events-auto',
        'border transition-colors z-10'
      )}
      style={{
        top: `calc(${slotTopPercent}% + (${slotHeightPercent}% - ${totalGaps}px) / ${groupSize} * ${stackIndex} + ${stackIndex * GAP_PX}px)`,
        height: `calc((${slotHeightPercent}% - ${totalGaps}px) / ${groupSize})`,
        borderColor: group
          ? `color-mix(in oklab, ${groupColor} 32%, var(--border))`
          : 'var(--border)',
        backgroundColor: group
          ? `color-mix(in oklab, ${groupColor} var(--cal-task-tint), var(--card))`
          : 'var(--cal-task-neutral)',
        color: 'var(--foreground)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = group
          ? `color-mix(in oklab, ${groupColor} var(--cal-task-tint-hover), var(--card))`
          : 'var(--cal-task-neutral-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = group
          ? `color-mix(in oklab, ${groupColor} var(--cal-task-tint), var(--card))`
          : 'var(--cal-task-neutral)'
      }}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: group ? groupColor : 'var(--muted-foreground)' }}
          aria-hidden="true"
        />
        <span className="truncate">{task.title}</span>
      </span>
    </button>
  )
}
