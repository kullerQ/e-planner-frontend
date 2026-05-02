'use client'

import { Fragment, useEffect, useState, useTransition } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon, Calendar03Icon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { updateTaskStatus } from '@/actions/tasks'
import { StatusBadge } from '@/components/tasks/StatusBadge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn, formatDueDate, isOverdue, resolveTaskColor } from '@/lib/utils'
import { useSelectionStore } from '@/stores/useSelectionStore'
import { useTaskSheetStore } from '@/stores/useTaskSheetStore'
import type { Task, TaskGroup, TaskStatus } from '@/types'

interface TaskRowProps {
  task: Task
  group: TaskGroup | null
  isHiddenBySearch: boolean
  searchQuery: string
  onTaskStatusOptimistic?: (taskId: string, status: TaskStatus) => void
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

export function TaskRow({
  task,
  group,
  isHiddenBySearch,
  searchQuery,
  onTaskStatusOptimistic,
}: TaskRowProps) {
  const openTaskSheet = useTaskSheetStore((state) => state.open)
  const statusOverride = useTaskSheetStore((state) => state.statusOverrides[task.id])
  const setStatusOverride = useTaskSheetStore((state) => state.setStatusOverride)
  const clearStatusOverride = useTaskSheetStore((state) => state.clearStatusOverride)
  const isSelecting = useSelectionStore((state) => state.isSelecting)
  const selectedIds = useSelectionStore((state) => state.selectedIds)
  const toggleSelection = useSelectionStore((state) => state.toggleSelection)

  const [statusError, setStatusError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const displayStatus = statusOverride ?? task.status
  const isSelected = selectedIds.has(task.id)
  const taskColor = resolveTaskColor(task, group)
  const hiddenTagCount = Math.max(0, task.tags.length - 2)
  const isTaskOverdue = isOverdue(task.dueDate)

  useEffect(() => {
    if (statusOverride === task.status) {
      clearStatusOverride(task.id)
    }
  }, [clearStatusOverride, statusOverride, task.id, task.status])

  function handleOpenTask() {
    openTaskSheet(task.id)
  }

  function handleStatusChange(nextStatus: TaskStatus) {
    if (nextStatus === displayStatus || isPending) {
      return
    }

    setStatusError(null)
    const previousStatus = displayStatus

    startTransition(async () => {
      setStatusOverride(task.id, nextStatus)
      onTaskStatusOptimistic?.(task.id, nextStatus)

      try {
        await updateTaskStatus(task.id, { status: nextStatus })
      } catch {
        setStatusOverride(task.id, previousStatus)
        onTaskStatusOptimistic?.(task.id, previousStatus)
        setStatusError('Status update failed. Please try again.')
        toast.error('Failed to update task status')
      }
    })
  }

  function handleToggleCompleted() {
    const nextStatus: TaskStatus = displayStatus === 'completed' ? 'todo' : 'completed'
    handleStatusChange(nextStatus)
  }

  function handleRowClick() {
    if (isSelecting) {
      toggleSelection(task.id)
      return
    }
    handleOpenTask()
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleRowClick()
        }
      }}
      className={cn(
        'group min-h-[44px] py-2.5 px-4 border-l-[3px] border-b border-border/40 rounded-md',
        'flex items-center gap-3 transition-colors',
        'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        isSelected && 'ring-2 ring-inset ring-ring/80',
        isHiddenBySearch && 'hidden'
      )}
      style={{ borderLeftColor: taskColor }}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          handleToggleCompleted()
        }}
        className={cn(
          'inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
            displayStatus === 'completed' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        )}
        aria-label={displayStatus === 'completed' ? 'Mark as to do' : 'Mark as completed'}
      >
        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} />
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm font-medium truncate',
            displayStatus === 'completed' && 'text-muted-foreground line-through'
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
              className={cn(
                'group/status min-h-11 min-w-11 inline-flex items-center justify-center rounded-sm cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
              )}
              aria-label="Update task status"
            >
              <StatusBadge
                status={displayStatus}
                className="transition-all duration-150 group-hover/status:brightness-125 group-hover/status:shadow-sm group-hover/status:bg-accent/70"
              />
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
                    displayStatus === option.value && 'bg-accent text-accent-foreground'
                  )}
                  onClick={() => handleStatusChange(option.value)}
                >
                  <span>{option.label}</span>
                  {displayStatus === option.value ? <HugeiconsIcon icon={ArrowDown01Icon} size={14} /> : null}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        {statusError !== null ? <p className="text-xs text-destructive">{statusError}</p> : null}
      </div>
    </div>
  )
}
