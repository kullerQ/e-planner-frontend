'use client'

import type { TaskStatus } from '@/types'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: TaskStatus
  onClick?: () => void
  className?: string
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  delayed: 'Delayed',
  completed: 'Completed',
}

const STATUS_STYLES: Record<TaskStatus, { bg: string; text: string; border: string; dot: string }> = {
  todo: {
    bg: 'bg-secondary',
    text: 'text-secondary-foreground',
    border: 'border-border',
    dot: 'bg-secondary-foreground/40',
  },
  in_progress: {
    bg: 'bg-blue-500/15',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
    dot: 'bg-blue-500',
  },
  delayed: {
    bg: 'bg-orange-500/15',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-500/30',
    dot: 'bg-orange-500',
  },
  completed: {
    bg: 'bg-primary/15',
    text: 'text-primary',
    border: 'border-primary/30',
    dot: 'bg-primary',
  },
}

interface StatusBadgeInnerProps {
  status: TaskStatus
  className?: string
}

function StatusBadgeInner({ status, className }: StatusBadgeInnerProps) {
  const styles = STATUS_STYLES[status]

  return (
    <span
      className={cn(
        'text-xs font-medium px-2 py-0.5 rounded-sm border inline-flex items-center gap-1',
        styles.bg,
        styles.text,
        styles.border,
        className
      )}
    >
      <span className={cn('size-1.5 rounded-full', styles.dot)} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  )
}

export function StatusBadge({ status, onClick, className }: StatusBadgeProps) {
  if (onClick === undefined) {
    return <StatusBadgeInner status={status} {...(className !== undefined ? { className } : {})} />
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-h-11 min-w-11 inline-flex items-center justify-center rounded-sm',
        'cursor-pointer transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
      )}
    >
      <StatusBadgeInner status={status} {...(className !== undefined ? { className } : {})} />
    </button>
  )
}
