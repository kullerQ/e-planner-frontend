'use client'

import { Fragment, useOptimistic, useState, useTransition } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon, Calendar03Icon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { updateTaskStatus } from '@/actions/tasks'
import { StatusBadge } from '@/components/tasks/StatusBadge'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { PRIORITY_TITLE_COLORS } from '@/lib/constants'
import { cn, formatDueDate, isOverdue, resolveTaskColor } from '@/lib/utils'
import { useSelectionStore } from '@/stores/useSelectionStore'
import { useTaskSheetStore } from '@/stores/useTaskSheetStore'
import type { Task, TaskGroup, TaskStatus } from '@/types'

interface TaskRowProps {
  task: Task
  group: TaskGroup | null
  isHiddenBySearch: boolean
  searchQuery: string
}

const statusOptions: Array<{ value: TaskStatus; label: string }> = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'delayed', label: 'Delayed' },
  { value: 'completed', label: 'Completed' },
]

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function renderHighlightedText(text: string, query: string): React.ReactNode {
  const normalized = query.trim()
  if (normalized.length === 0) {
    return text
  }

  const matcher = new RegExp(`(${escapeRegExp(normalized)})`, 'gi')
  const parts = text.split(matcher)
  return parts.map((part, index) => {
    if (part.toLowerCase() === normalized.toLowerCase()) {
      return (
        <mark key={`match-${part}-${index}`} className="bg-primary/20 text-foreground rounded-[2px] px-0.5">
          {part}
        </mark>
      )
    }
    return <Fragment key={`text-${part}-${index}`}>{part}</Fragment>
  })
}

export function TaskRow({ task, group, isHiddenBySearch, searchQuery }: TaskRowProps) {
  const openTaskSheet = useTaskSheetStore((state) => state.open)
  const isSelecting = useSelectionStore((state) => state.isSelecting)
  const selectedIds = useSelectionStore((state) => state.selectedIds)
  const toggleSelection = useSelectionStore((state) => state.toggleSelection)
  const enterSelectMode = useSelectionStore((state) => state.enterSelectMode)

  const [statusError, setStatusError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(task.status)
  const isSelected = selectedIds.has(task.id)
  const taskColor = resolveTaskColor(task, group)
  const hiddenTagCount = Math.max(0, task.tags.length - 2)
  const isTaskOverdue = isOverdue(task.dueDate)

  function handleOpenTask() {
    openTaskSheet(task.id)
  }

  function handleToggleSelection(checked: boolean) {
    enterSelectMode()
    const hasTask = selectedIds.has(task.id)
    if ((checked && !hasTask) || (!checked && hasTask)) {
      toggleSelection(task.id)
    }
  }

  function handleStatusChange(nextStatus: TaskStatus) {
    if (nextStatus === optimisticStatus || isPending) {
      return
    }

    setStatusError(null)
    const previousStatus = task.status
    setOptimisticStatus(nextStatus)

    startTransition(async () => {
      try {
        await updateTaskStatus(task.id, { status: nextStatus })
      } catch {
        setOptimisticStatus(previousStatus)
        setStatusError('Status update failed. Please try again.')
        toast.error('Failed to update task status')
      }
    })
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpenTask}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleOpenTask()
        }
      }}
      className={cn(
        'group min-h-[44px] py-2.5 px-4 border-l-[3px] border-b border-border/40',
        'flex items-center gap-3 transition-colors',
        'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        isHiddenBySearch && 'hidden'
      )}
      style={{ borderLeftColor: taskColor }}
    >
      <div
        className={cn(
          'flex items-center justify-center transition-opacity',
          isSelected || isSelecting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <Checkbox
          aria-label={`Select task ${task.title}`}
          checked={isSelected}
          onCheckedChange={(checked) => handleToggleSelection(checked === true)}
          className="size-4"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm font-medium truncate',
            PRIORITY_TITLE_COLORS[task.priority],
            optimisticStatus === 'completed' && 'text-muted-foreground line-through'
          )}
        >
          {renderHighlightedText(task.title, searchQuery)}
        </p>
      </div>

      <div className="hidden lg:flex items-center gap-1 max-w-[220px]">
        {task.tags.slice(0, 2).map((tag) => (
          <span
            key={tag.id}
            className="text-xs font-medium px-2 py-0.5 rounded-sm bg-secondary text-secondary-foreground truncate"
          >
            {renderHighlightedText(tag.name, searchQuery)}
          </span>
        ))}
        {hiddenTagCount > 0 ? (
          <span className="text-xs font-medium px-2 py-0.5 rounded-sm bg-secondary text-secondary-foreground">
            +{hiddenTagCount}
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          'hidden md:flex items-center gap-1 text-xs',
          isTaskOverdue ? 'text-destructive' : 'text-muted-foreground'
        )}
      >
        <HugeiconsIcon icon={Calendar03Icon} size={12} />
        {task.dueDate !== null ? <span>{formatDueDate(task.dueDate)}</span> : <span>No due date</span>}
      </div>

      <div className="flex flex-col items-end" onClick={(event) => event.stopPropagation()}>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              aria-label="Update task status"
            >
              <StatusBadge status={optimisticStatus} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-52 p-2">
            <div className="flex flex-col gap-1">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    'w-full flex items-center justify-between rounded-sm px-2 py-1.5 text-sm text-left',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                    optimisticStatus === option.value && 'bg-accent text-accent-foreground'
                  )}
                  onClick={() => handleStatusChange(option.value)}
                >
                  <span>{option.label}</span>
                  {optimisticStatus === option.value ? <HugeiconsIcon icon={ArrowDown01Icon} size={14} /> : null}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        {statusError !== null ? <p className="mt-1 text-xs text-destructive">{statusError}</p> : null}
      </div>
    </div>
  )
}
