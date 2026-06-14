'use client'
import { useMemo, useState, useTransition, useRef } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Calendar01Icon, Tick02Icon, Clock01Icon, AlertCircleIcon, Delete02Icon, Tick01Icon } from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/messages'
import type { Task, TaskStatus } from '@/types'
import { useTaskSheetStore } from '@/stores/useTaskSheetStore'
import { updateTaskStatus, softDeleteTask } from '@/actions/tasks'
import { restoreTask } from '@/actions/recycle-bin'
import { TASK_STATUS_STYLES } from '@/components/tasks/StatusBadge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { softDeleteWithUndo } from '@/lib/tasks/softDeleteWithUndo'
import { toast } from 'sonner'

interface TodaysTasksWidgetProps {
  tasks: Task[] | undefined
  onStatusUpdated: ((taskId: string, newStatus: TaskStatus) => void) | undefined
  onTaskDeleted: ((taskId: string) => void) | undefined
  onTaskRestored: ((taskId: string) => void) | undefined
  onRefresh: (() => void) | undefined
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfToday(): Date {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

function isTodayOrOverdue(task: Task): boolean {
  if (!task.dueDate) return false
  const due = new Date(task.dueDate)
  due.setHours(0, 0, 0, 0)
  return due <= endOfToday()
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate) return false
  const due = new Date(task.dueDate)
  due.setHours(0, 0, 0, 0)
  return due < startOfToday()
}

function isToday(task: Task): boolean {
  if (!task.dueDate) return false
  const due = new Date(task.dueDate)
  due.setHours(0, 0, 0, 0)
  const today = startOfToday()
  return due.getTime() === today.getTime()
}

function hasTime(dueDate: string): boolean {
  const d = new Date(dueDate)
  return d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0
}

function formatTaskTime(dueDate: string, locale: string): string | null {
  if (!hasTime(dueDate)) return null
  const d = new Date(dueDate)
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatTaskDate(dueDate: string, locale: string): string {
  const d = new Date(dueDate)
  return d.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  })
}

const STATUS_STYLE = TASK_STATUS_STYLES

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'delayed', 'completed']

export function TodaysTasksWidget({ tasks = [], onStatusUpdated, onTaskDeleted, onTaskRestored, onRefresh }: TodaysTasksWidgetProps) {
  const { t, locale } = useI18n()

  const statusMeta = useMemo(
    (): Record<TaskStatus, { label: string; dot: string; text: string }> => ({
      todo: { label: t.tasks.status.todo, ...STATUS_STYLE.todo },
      in_progress: { label: t.tasks.status.in_progress, ...STATUS_STYLE.in_progress },
      delayed: { label: t.tasks.status.delayed, ...STATUS_STYLE.delayed },
      completed: { label: t.tasks.status.completed, ...STATUS_STYLE.completed },
    }),
    [t.tasks.status],
  )
  const open = useTaskSheetStore((s) => s.open)
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [openStatusId, setOpenStatusId] = useState<string | null>(null)
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<Task | null>(null)

  const eligible = tasks
    .filter((t) => !t.isDeleted && t.status !== 'completed' && isTodayOrOverdue(t))
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })

  // Stable ordered ID list — only updates when tasks enter or leave the list
  const orderedIdsRef = useRef<string[]>([])

  // Sync synchronously (during render) so the first paint is never empty
  const currentIds = new Set(eligible.map((t) => t.id))
  const filtered = orderedIdsRef.current.filter((id) => currentIds.has(id))
  const trackedIds = new Set(filtered)
  const newIds = eligible.filter((t) => !trackedIds.has(t.id)).map((t) => t.id)
  orderedIdsRef.current = [...filtered, ...newIds]

  const eligibleMap = new Map(eligible.map((t) => [t.id, t]))
  const todaysTasks = orderedIdsRef.current
    .map((id) => eligibleMap.get(id))
    .filter((t): t is NonNullable<typeof t> => t !== undefined)
    .slice(0, 10)

  const allDone =
    tasks.length > 0 &&
    tasks.filter((t) => !t.isDeleted && isTodayOrOverdue(t)).every((t) => t.status === 'completed')

  function handleStatusSelect(e: React.MouseEvent, task: Task, newStatus: TaskStatus) {
    e.stopPropagation()
    setOpenStatusId(null)
    if (newStatus === task.status) return
    const previousStatus = task.status
    onStatusUpdated?.(task.id, newStatus)
    startTransition(async () => {
      try {
        await updateTaskStatus(task.id, { status: newStatus })
        onRefresh?.()
      } catch {
        onStatusUpdated?.(task.id, previousStatus)
        toast.error(t.tasks.statusUpdateFailed)
      }
    })
  }

  function handleDeleteClick(e: React.MouseEvent, task: Task) {
    e.stopPropagation()
    if (isPending || deletingId !== null) {
      return
    }
    setConfirmDeleteTask(task)
  }

  function handleConfirmDelete() {
    const task = confirmDeleteTask
    if (!task) {
      return
    }

    setDeletingId(task.id)
    startTransition(async () => {
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
          onTaskDeleted?.(deletedTask.id)
        },
        onOptimisticRestore: (restoredTask) => {
          onTaskRestored?.(restoredTask.id)
        },
        onDeleteSuccess: () => {
          onRefresh?.()
        },
        onRestoreSuccess: () => {
          onRefresh?.()
        },
      })
      setConfirmDeleteTask(null)
      setDeletingId(null)
    })
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{t.widgets.todaysTasks.title}</span>
          {!allDone && todaysTasks.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary min-w-[20px]">
              {todaysTasks.length}
            </span>
          )}
        </div>
        {allDone && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            {t.widgets.todaysTasks.allDone}
            <HugeiconsIcon icon={Tick02Icon} size={12} />
          </span>
        )}
      </div>

      {todaysTasks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/60">
            <HugeiconsIcon icon={Calendar01Icon} size={18} className="opacity-60" />
          </div>
          <span className="text-xs">{t.widgets.todaysTasks.nothingDue}</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin pr-1 -mr-1">
          {todaysTasks.map((task) => {
            const meta = statusMeta[task.status]
            const isTaskToday = isToday(task)
            const overdue = isOverdue(task)
            const time = isTaskToday && task.dueDate ? formatTaskTime(task.dueDate, locale) : null
            const allDay = isTaskToday && task.dueDate && !hasTime(task.dueDate) ? t.widgets.todaysTasks.allDay : null
            const date = overdue && task.dueDate ? formatTaskDate(task.dueDate, locale) : null
            const isDeleting = deletingId === task.id
            const isBusy = isPending || isDeleting
            return (
              <div
                key={task.id}
                role="button"
                tabIndex={0}
                aria-busy={isBusy}
                aria-disabled={isBusy}
                onClick={() => {
                  if (isBusy) return
                  open(task.id)
                }}
                onKeyDown={(e) => {
                  if (isBusy) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    open(task.id)
                  }
                }}
                className={cn(
                  'group/task flex w-full items-center gap-2.5 rounded-lg border border-border/40 bg-muted/30 p-2.5 transition-colors cursor-pointer text-left',
                  'hover:bg-muted/60 hover:border-border',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isBusy && 'cursor-progress opacity-70',
                )}
              >
                {/* Main content: title row + status/tags row */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  {/* Row 1: [emoji] title */}
                  <div className="flex items-center gap-2 min-w-0">
                    {overdue && (
                      <span aria-label={t.widgets.todaysTasks.overdue} className="shrink-0 text-xs leading-none">
                        😢
                      </span>
                    )}
                    <span className="flex-1 truncate text-sm font-semibold text-foreground">
                      {task.title}
                    </span>
                  </div>

                  {/* Row 2: status popover + tags */}
                  <div className="flex items-center gap-2 min-w-0">
                    <Popover
                      open={openStatusId === task.id}
                      onOpenChange={(open) => {
                        setOpenStatusId(open ? task.id : null)
                      }}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          disabled={isBusy}
                          className={cn(
                            'shrink-0 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide',
                            'rounded-sm transition-colors cursor-pointer hover:opacity-70',
                            meta.text,
                            isBusy && 'opacity-50 cursor-not-allowed',
                          )}
                        >
                          <span className={cn('block size-1.5 rounded-full', meta.dot)} />
                          {meta.label}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        side="bottom"
                        align="start"
                        className="w-40 p-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {STATUS_ORDER.map((s) => {
                          const sm = statusMeta[s]
                          const isActive = task.status === s
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={(e) => handleStatusSelect(e, task, s)}
                              className={cn(
                                'w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-[11px] font-medium transition-colors',
                                isActive
                                  ? 'bg-muted text-foreground'
                                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                              )}
                            >
                              <span className={cn('block size-1.5 rounded-full shrink-0', sm.dot)} />
                              <span className="flex-1 text-left">{sm.label}</span>
                              {isActive && (
                                <HugeiconsIcon icon={Tick01Icon} size={11} className="shrink-0 text-primary" />
                              )}
                            </button>
                          )
                        })}
                      </PopoverContent>
                    </Popover>
                    {task.tags.length > 0 && (
                      <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                        {task.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center rounded-sm bg-card/90 border border-border/60 px-1.5 py-px text-[10px] font-medium text-muted-foreground truncate max-w-[88px]"
                          >
                            {tag.name}
                          </span>
                        ))}
                        {task.tags.length > 3 && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            +{task.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: date vertically centered + delete */}
                <div className="flex items-center gap-2 shrink-0 self-center">
                  {(time || allDay || date) && (
                    <span
                      className={cn(
                        'inline-flex min-h-[1.625rem] items-center gap-1.5 rounded-full border px-2.5 text-xs font-bold leading-none tabular-nums',
                        overdue
                          ? 'border-destructive/50 bg-destructive/20 text-destructive'
                          : 'border-border/80 bg-card/70 text-foreground',
                      )}
                    >
                      <span className="inline-flex items-center justify-center leading-none translate-y-px" aria-hidden="true">
                        <HugeiconsIcon
                          icon={overdue ? AlertCircleIcon : Clock01Icon}
                          size={13}
                        />
                      </span>
                      {time || allDay || date}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteClick(e, task)}
                    disabled={isBusy}
                    className={cn(
                      'p-1.5 rounded-sm',
                      'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
                      'transition-colors cursor-pointer',
                      'opacity-0 group-hover/task:opacity-100 focus:opacity-100',
                      isDeleting && 'opacity-100',
                      isBusy && 'opacity-50 cursor-not-allowed',
                    )}
                    title={t.widgets.todaysTasks.moveToRecycleBin}
                    aria-label={t.widgets.todaysTasks.deleteAria}
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <ConfirmDialog
        open={confirmDeleteTask !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDeleteTask(null)
          }
        }}
        title={t.tasks.deleteConfirmTitle}
        description={t.tasks.deleteConfirmDescription.replace('{title}', confirmDeleteTask?.title ?? '')}
        confirmLabel={t.tasks.deleteConfirmAction}
        onConfirm={handleConfirmDelete}
        isPending={isPending && deletingId !== null}
      />
    </div>
  )
}
