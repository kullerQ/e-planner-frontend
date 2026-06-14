'use client'

import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Calendar03Icon,
  Checkmark,
  CheckmarkCircle01Icon,
  Delete02Icon,
} from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { restoreTask } from '@/actions/recycle-bin'
import { softDeleteTask, updateTaskStatus } from '@/actions/tasks'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge, TASK_STATUS_STYLES } from '@/components/tasks/StatusBadge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { softDeleteWithUndo } from '@/lib/tasks/softDeleteWithUndo'
import { cn, formatDueDate, isDueSoon, isOverdue } from '@/lib/utils'
import { useI18n } from '@/lib/messages'
import { useSelectionStore } from '@/stores/useSelectionStore'
import { useTaskSheetStore } from '@/stores/useTaskSheetStore'
import type { Task, TaskGroup, TaskStatus } from '@/types'

interface TaskRowProps {
  task: Task
  group: TaskGroup | null
  isHiddenBySearch: boolean
  searchQuery: string
  isNew?: boolean
  isPrevSelected?: boolean
  isNextSelected?: boolean
  onHighlightFinished?: (taskId: string) => void
  onTaskStatusOptimistic?: (taskId: string, status: TaskStatus) => void
  onTaskDeleted?: (taskId: string) => void
  onTaskRestored?: (task: Task) => void
  onTaskRestoreSuccess?: () => void
}

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
  isNew = false,
  isPrevSelected = false,
  isNextSelected = false,
  onHighlightFinished,
  onTaskStatusOptimistic,
  onTaskDeleted,
  onTaskRestored,
  onTaskRestoreSuccess,
}: TaskRowProps) {
  const { t, locale } = useI18n()

  const statusOptions = useMemo(
    (): Array<{ value: TaskStatus; label: string }> => [
      { value: 'todo', label: t.tasks.status.todo },
      { value: 'in_progress', label: t.tasks.status.in_progress },
      { value: 'delayed', label: t.tasks.status.delayed },
      { value: 'completed', label: t.tasks.status.completed },
    ],
    [t.tasks.status],
  )
  const openTaskSheet = useTaskSheetStore((state) => state.open)
  const statusOverride = useTaskSheetStore((state) => state.statusOverrides[task.id])
  const setStatusOverride = useTaskSheetStore((state) => state.setStatusOverride)
  const clearStatusOverride = useTaskSheetStore((state) => state.clearStatusOverride)
  const isSelecting = useSelectionStore((state) => state.isSelecting)
  const selectedIds = useSelectionStore((state) => state.selectedIds)
  const toggleSelection = useSelectionStore((state) => state.toggleSelection)

  const [statusError, setStatusError] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const rowRef = useRef<HTMLDivElement>(null)
  const displayStatus = statusOverride ?? task.status
  const isSelected = selectedIds.has(task.id)
  const isSelectionCollapsed = isSelected && isPrevSelected
  const isSelectionJoinedBelow = isSelected && isNextSelected
  const groupAccentColor = group !== null ? group.colorHex : 'var(--border)'
  const hiddenTagCount = Math.max(0, task.tags.length - 2)
  const isTaskOverdue = isOverdue(task.dueDate)
  const isTaskDueSoon = isDueSoon(task.dueDate)

  useEffect(() => {
    if (statusOverride === task.status) {
      clearStatusOverride(task.id)
    }
  }, [clearStatusOverride, statusOverride, task.id, task.status])

  useEffect(() => {
    if (!isNew) {
      return
    }

    const node = rowRef.current
    if (node === null) {
      return
    }

    function handleAnimationEnd(event: AnimationEvent) {
      if (event.animationName !== 'task-highlight-pop') {
        return
      }
      onHighlightFinished?.(task.id)
    }

    node.addEventListener('animationend', handleAnimationEnd)
    return () => node.removeEventListener('animationend', handleAnimationEnd)
  }, [isNew, onHighlightFinished, task.id])

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
        setStatusError(t.tasks.statusUpdateFailed)
        toast.error(t.tasks.statusUpdateFailed)
      }
    })
  }

  function handleToggleCompleted() {
    const nextStatus: TaskStatus = displayStatus === 'completed' ? 'todo' : 'completed'
    handleStatusChange(nextStatus)
  }

  function handleRowClick() {
    if (confirmDeleteOpen) {
      return
    }
    if (isSelecting) {
      toggleSelection(task.id)
      return
    }
    handleOpenTask()
  }

  function handleConfirmDeleteOpenChange(open: boolean) {
    setConfirmDeleteOpen(open)
    useTaskSheetStore.getState().setDeleteConfirmTaskId(open ? task.id : null)
  }

  function handleForceCloseSheet() {
    useTaskSheetStore.getState().closeForce()
  }

  function handleQuickDelete(event: React.MouseEvent) {
    event.stopPropagation()
    if (isPending) {
      return
    }
    setConfirmDeleteOpen(true)
  }

  function handleConfirmDelete(): Promise<void> {
    if (isPending) {
      return Promise.resolve()
    }

    return new Promise((resolve) => {
      startTransition(async () => {
        try {
          await softDeleteWithUndo({
            task,
            messages: {
              deletedToast: t.taskRow.deletedToast,
              undo: t.taskRow.undo,
              deleteError: t.taskRow.deleteError,
              restoreError: t.taskRow.restoreError,
            },
            softDelete: softDeleteTask,
            restore: restoreTask,
            onOptimisticDelete: (deletedTask) => {
              handleForceCloseSheet()
              onTaskDeleted?.(deletedTask.id)
            },
            onOptimisticRestore: (restoredTask) => {
              onTaskRestored?.(restoredTask)
            },
            onRestoreSuccess: () => {
              onTaskRestoreSuccess?.()
            },
            onBeforeUndo: () => {
              handleForceCloseSheet()
            },
          })
        } finally {
          handleConfirmDeleteOpenChange(false)
          resolve()
        }
      })
    })
  }

  return (
    <>
      <div
        ref={rowRef}
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
          'task-selection-row group relative min-h-[44px] py-2.5 px-4 border border-border/50 border-l-[3px] rounded-md',
          'bg-card shadow-sm',
          'flex items-center gap-3',
          'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          isSelectionCollapsed ? '-mt-2' : 'mt-0',
          isSelectionCollapsed && 'rounded-t-none border-t-transparent',
          isSelected && isNextSelected && 'rounded-b-none',
          isNew && 'task-highlight',
          isHiddenBySearch && 'hidden'
        )}
        style={{ borderLeftColor: groupAccentColor }}
      >
        <div
          aria-hidden="true"
          className={cn(
            'task-selection-outline pointer-events-none absolute -inset-px z-10 rounded-md border-2',
            'border-l-ring border-r-ring',
            isSelected ? 'opacity-100' : 'opacity-0',
            isSelectionCollapsed ? 'border-t-transparent rounded-t-none' : 'border-t-ring',
            isSelectionJoinedBelow ? 'border-b-transparent rounded-b-none' : 'border-b-ring'
          )}
        />
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
        aria-label={
          displayStatus === 'completed'
            ? t.tasks.markTodoToggleAria
            : t.tasks.markCompletedToggleAria
        }
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
          isTaskOverdue ? 'text-destructive' : isTaskDueSoon ? 'text-orange-400' : 'text-muted-foreground'
        )}
      >
        <HugeiconsIcon icon={Calendar03Icon} size={12} />
        {task.dueDate !== null ? (
          <span>{formatDueDate(task.dueDate, locale)}</span>
        ) : (
          <span>{t.tasks.dueDateEmpty}</span>
        )}
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
              aria-label={t.taskRow.updateStatus}
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
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={cn('size-1.5 rounded-full', TASK_STATUS_STYLES[option.value].dot)}
                      aria-hidden="true"
                    />
                    {option.label}
                  </span>
                  {displayStatus === option.value ? <HugeiconsIcon icon={Checkmark} size={14} /> : null}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        {statusError !== null ? <p className="text-xs text-destructive">{statusError}</p> : null}
      </div>

      {!isSelecting ? (
        <button
          type="button"
          onClick={handleQuickDelete}
          className={cn(
            'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-sm text-muted-foreground',
            'opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive',
            'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
          )}
          aria-label={t.taskRow.deleteAria}
        >
          <HugeiconsIcon icon={Delete02Icon} size={16} />
        </button>
      ) : null}
      </div>
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={handleConfirmDeleteOpenChange}
        title={t.tasks.deleteConfirmTitle}
        description={t.tasks.deleteConfirmDescription.replace('{title}', task.title)}
        confirmLabel={t.tasks.deleteConfirmAction}
        onConfirm={handleConfirmDelete}
        isPending={isPending}
      />
    </>
  )
}
