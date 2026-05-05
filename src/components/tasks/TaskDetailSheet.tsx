'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  Calendar03Icon,
  Cancel01Icon,
  Delete02Icon,
  Edit02Icon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { createTag, deleteTag, renameTag } from '@/actions/tags'
import { createTask, softDeleteTask, updateTask } from '@/actions/tasks'
import { StatusBadge } from '@/components/tasks/StatusBadge'
import { TaskNotesMarkdown } from '@/components/tasks/TaskNotesMarkdown'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TimePicker } from '@/components/ui/time-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { apiFetch } from '@/lib/api'
import { useWeekStartsOn } from '@/lib/preferences'
import { buildValidationSchemas } from '@/lib/validation'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/messages'
import { useTaskSheetStore } from '@/stores/useTaskSheetStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import type { Tag, Task, TaskGroup, TaskStatus } from '@/types'

interface TaskDetailSheetProps {
  tasks: Task[]
  groups: TaskGroup[]
  tags: Tag[]
  onTaskUpdated?: (updatedTask: Task) => void
}

interface DraftState {
  title: string
  status: TaskStatus
  // Priority is intentionally hidden in the current UI and kept as a data stub.
  priority: Task['priority']
  dueDate: string | null
  groupId: string | null
  tagIds: string[]
  notes: string
}


function toDate(iso: string | null): Date | undefined {
  if (iso === null) {
    return undefined
  }
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function formatDueDateLabel(
  iso: string | null,
  t: { tasks: { dueDateEmpty: string } },
  locale: string,
): string {
  if (iso === null) {
    return t.tasks.dueDateEmpty
  }
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) {
    return t.tasks.dueDateEmpty
  }
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed)
}

function formatTimeInputValue(iso: string | null): string {
  if (iso === null) {
    return ''
  }
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }
  const hours = String(parsed.getHours()).padStart(2, '0')
  const minutes = String(parsed.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function combineDateAndTime(date: Date, timeValue: string): string {
  const next = new Date(date)
  const match = /^(\d{2}):(\d{2})$/.exec(timeValue)
  if (match) {
    next.setHours(Number(match[1]), Number(match[2]), 0, 0)
  } else {
    next.setHours(0, 0, 0, 0)
  }
  return next.toISOString()
}

function emptyDraft(
  initialValues: { groupId?: string; dueDate?: string } | undefined,
  defaultStatus: TaskStatus = 'todo'
): DraftState {
  return {
    title: '',
    status: defaultStatus,
    priority: 'medium',
    dueDate: initialValues?.dueDate ?? null,
    groupId: initialValues?.groupId ?? null,
    tagIds: [],
    notes: '',
  }
}

function draftFromTask(task: Task): DraftState {
  return {
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    groupId: task.groupId,
    tagIds: task.tags.map((tag) => tag.id),
    notes: task.notes ?? '',
  }
}

function normalizeTagName(value: string): string {
  return value.trim().toLowerCase()
}

export function TaskDetailSheet({ tasks, groups, tags, onTaskUpdated }: TaskDetailSheetProps) {
  const { t, locale } = useI18n()
  const taskTitleSchema = useMemo(
    () => buildValidationSchemas(t.validation).taskTitleSchema,
    [t.validation],
  )
  const router = useRouter()

  const statusOptions = useMemo(
    (): Array<{ value: TaskStatus; label: string }> => [
      { value: 'todo', label: t.tasks.status.todo },
      { value: 'in_progress', label: t.tasks.status.in_progress },
      { value: 'delayed', label: t.tasks.status.delayed },
      { value: 'completed', label: t.tasks.status.completed },
    ],
    [t.tasks.status],
  )
  const isOpen = useTaskSheetStore((state) => state.isOpen)
  const taskId = useTaskSheetStore((state) => state.taskId)
  const initialValues = useTaskSheetStore((state) => state.initialValues)
  const statusOverride = useTaskSheetStore((state) =>
    state.taskId === null ? undefined : state.statusOverrides[state.taskId]
  )
  const setStatusOverride = useTaskSheetStore((state) => state.setStatusOverride)
  const clearStatusOverride = useTaskSheetStore((state) => state.clearStatusOverride)
  const closeSheet = useTaskSheetStore((state) => state.close)
  const weekStartsOn = useWeekStartsOn()
  const defaultStatus = useSettingsStore((state) => state.defaultStatus)

  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task] as const)), [tasks])
  const [loadedTask, setLoadedTask] = useState<Task | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadTask() {
      if (taskId === null) {
        setLoadedTask(null)
        return
      }

      const fromList = taskMap.get(taskId)
      if (fromList) {
        setLoadedTask(fromList)
        return
      }

      try {
        const fetched = await apiFetch<Task>(`/tasks/${taskId}`)
        if (!cancelled) {
          setLoadedTask(fetched)
        }
      } catch {
        if (!cancelled) {
          setLoadedTask(null)
        }
      }
    }

    void loadTask()
    return () => {
      cancelled = true
    }
  }, [taskId, taskMap])

  const mode: 'create' | 'edit' = taskId === null ? 'create' : 'edit'
  const selectedTaskId = taskId ?? ''
  const sourceTask = mode === 'edit' ? (loadedTask ?? taskMap.get(selectedTaskId) ?? null) : null
  const sourceTaskWithOverrides = useMemo(() => {
    if (sourceTask === null || statusOverride === undefined) {
      return sourceTask
    }
    return { ...sourceTask, status: statusOverride }
  }, [sourceTask, statusOverride])

  const [draft, setDraft] = useState<DraftState>(() => emptyDraft(initialValues, defaultStatus))
  const [baseline, setBaseline] = useState<DraftState>(() => emptyDraft(initialValues, defaultStatus))
  const [fieldError, setFieldError] = useState<Record<string, string>>({})
  const [tagQuery, setTagQuery] = useState('')
  const [availableTags, setAvailableTags] = useState<Tag[]>(() =>
    [...tags].sort((left, right) => left.name.localeCompare(right.name))
  )
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editingTagName, setEditingTagName] = useState('')
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isTagMutationPending, startTagMutation] = useTransition()
  const titleRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }
    const nextDraft =
      mode === 'create'
        ? emptyDraft(initialValues, defaultStatus)
        : sourceTaskWithOverrides !== null
          ? draftFromTask(sourceTaskWithOverrides)
          : emptyDraft(initialValues, defaultStatus)

    setDraft(nextDraft)
    setBaseline(nextDraft)
    setFieldError({})
    setTagQuery('')
  }, [isOpen, mode, sourceTaskWithOverrides, initialValues, defaultStatus])

  useEffect(() => {
    if (!isOpen) {
      return
    }
    titleRef.current?.focus()
    titleRef.current?.select()
  }, [isOpen, taskId])

  const visibleTags = useMemo(() => {
    const normalized = tagQuery.trim().toLowerCase()
    if (normalized.length === 0) {
      return availableTags
    }
    return availableTags.filter((tag) => tag.name.toLowerCase().includes(normalized))
  }, [availableTags, tagQuery])

  const exactTagMatch = useMemo(() => {
    const normalizedQuery = normalizeTagName(tagQuery)
    if (normalizedQuery.length === 0) {
      return undefined
    }
    return availableTags.find((tag) => normalizeTagName(tag.name) === normalizedQuery)
  }, [availableTags, tagQuery])

  const canCreateTagFromQuery = normalizeTagName(tagQuery).length > 0 && exactTagMatch === undefined

  const selectedTagSet = useMemo(() => new Set(draft.tagIds), [draft.tagIds])
  const tagsById = useMemo(() => new Map(availableTags.map((tag) => [tag.id, tag] as const)), [availableTags])
  const hasUnsavedChanges = useMemo(() => {
    return (
      draft.title !== baseline.title ||
      draft.status !== baseline.status ||
      draft.priority !== baseline.priority ||
      draft.dueDate !== baseline.dueDate ||
      draft.groupId !== baseline.groupId ||
      draft.notes !== baseline.notes ||
      draft.tagIds.length !== baseline.tagIds.length ||
      draft.tagIds.some((tagId, index) => tagId !== baseline.tagIds[index])
    )
  }, [baseline, draft])

  function clearFieldError(field: string) {
    setFieldError((current) => {
      if (!(field in current)) {
        return current
      }
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  function setFieldFailure(field: string, message: string) {
    setFieldError((current) => ({ ...current, [field]: message }))
  }

  function setDraftField<K extends keyof DraftState>(field: K, value: DraftState[K]) {
    setDraft((current) => ({ ...current, [field]: value }))
    clearFieldError(String(field))
  }

  function resetField<K extends keyof DraftState>(field: K) {
    setDraft((current) => ({ ...current, [field]: baseline[field] }))
    clearFieldError(String(field))
  }

  async function handleCreate() {
    const parsed = taskTitleSchema.safeParse(draft.title.trim())
    if (!parsed.success) {
      setFieldFailure('title', parsed.error.issues[0]?.message ?? t.validation.taskTitleRequired)
      return
    }

    startTransition(async () => {
      try {
        await createTask({
          title: parsed.data,
          status: draft.status,
          priority: draft.priority,
          dueDate: draft.dueDate,
          groupId: draft.groupId,
          tagIds: draft.tagIds,
          notes: draft.notes.length > 0 ? draft.notes : null,
        })
        closeSheet()
        router.refresh()
      } catch {
        setFieldFailure('submit', t.tasks.errorCreate)
      }
    })
  }

  async function handleSaveAll() {
    if (mode === 'create' || taskId === null) {
      return
    }
    const parsed = taskTitleSchema.safeParse(draft.title.trim())
    if (!parsed.success) {
      setFieldFailure('title', parsed.error.issues[0]?.message ?? t.validation.taskTitleRequired)
      return
    }

    startTransition(async () => {
      try {
        await updateTask(taskId, {
          title: parsed.data,
          status: draft.status,
          priority: draft.priority,
          dueDate: draft.dueDate,
          groupId: draft.groupId,
          tagIds: draft.tagIds,
          notes: draft.notes.length > 0 ? draft.notes : null,
        })
        setBaseline({ ...draft, title: parsed.data })
        // Optimistically update parent with new task data
        if (onTaskUpdated && sourceTask) {
          const updatedTags = draft.tagIds
            .map((id) => availableTags.find((t) => t.id === id))
            .filter((t): t is Tag => t !== undefined)
          onTaskUpdated({
            ...sourceTask,
            title: parsed.data,
            status: draft.status,
            priority: draft.priority,
            dueDate: draft.dueDate,
            groupId: draft.groupId,
            tags: updatedTags,
            notes: draft.notes.length > 0 ? draft.notes : null,
          })
        }
        router.refresh()
      } catch {
        setFieldFailure('submit', t.tasks.errorSave)
      }
    })
  }

  async function handleDelete() {
    if (taskId === null) {
      return
    }
    startTransition(async () => {
      try {
        await softDeleteTask(taskId)
        toast.info(t.tasks.movedToRecycle)
        closeSheet()
        router.refresh()
      } catch {
        setFieldFailure('submit', t.tasks.errorDelete)
      }
    })
  }

  function requestCloseSheet() {
    if (hasUnsavedChanges) {
      setConfirmCloseOpen(true)
      return
    }
    closeSheet()
  }

  function toggleTagSelection(tagId: string) {
    const next = selectedTagSet.has(tagId)
      ? draft.tagIds.filter((id) => id !== tagId)
      : [...draft.tagIds, tagId]
    setDraftField('tagIds', next)
  }

  function applyCreatedTagLocally(created: Tag) {
    setAvailableTags((current) => {
      if (current.some((tag) => tag.id === created.id)) {
        return current
      }
      return [...current, created].sort((left, right) => left.name.localeCompare(right.name))
    })
    if (!selectedTagSet.has(created.id)) {
      setDraftField('tagIds', [...draft.tagIds, created.id])
    }
  }

  function handleCreateTagFromQuery() {
    const nextName = tagQuery.trim()
    if (nextName.length === 0 || isTagMutationPending) {
      return
    }

    startTagMutation(async () => {
      try {
        const createdTag = await createTag({ name: nextName })
        applyCreatedTagLocally(createdTag)
        setTagQuery('')
      } catch {
        toast.error(t.tasks.tagCreateError)
      }
    })
  }

  function beginTagRename(tag: Tag) {
    setEditingTagId(tag.id)
    setEditingTagName(tag.name)
  }

  function handleRenameTag() {
    if (editingTagId === null || isTagMutationPending) {
      return
    }

    const nextName = editingTagName.trim()
    if (nextName.length === 0) {
      toast.error(t.tasks.tagNameRequired)
      return
    }

    const currentTag = tagsById.get(editingTagId)
    if (currentTag && normalizeTagName(currentTag.name) === normalizeTagName(nextName)) {
      setEditingTagId(null)
      setEditingTagName('')
      return
    }

    startTagMutation(async () => {
      try {
        const updatedTag = await renameTag({ id: editingTagId, name: nextName })
        setAvailableTags((current) =>
          current
            .map((tag) => (tag.id === updatedTag.id ? updatedTag : tag))
            .sort((left, right) => left.name.localeCompare(right.name))
        )
        setEditingTagId(null)
        setEditingTagName('')
      } catch {
        toast.error(t.tasks.tagRenameError)
      }
    })
  }

  function handleDeleteTag(tagId: string) {
    if (isTagMutationPending) {
      return
    }

    startTagMutation(async () => {
      try {
        await deleteTag(tagId)
        setAvailableTags((current) => current.filter((tag) => tag.id !== tagId))
        if (selectedTagSet.has(tagId)) {
          setDraftField(
            'tagIds',
            draft.tagIds.filter((id) => id !== tagId)
          )
        }
      } catch {
        toast.error(t.tasks.tagDeleteError)
      }
    })
  }

  async function handleSaveAndClose() {
    const parsed = taskTitleSchema.safeParse(draft.title.trim())
    if (!parsed.success) {
      setFieldFailure('title', parsed.error?.issues[0]?.message ?? t.validation.taskTitleRequired)
      return
    }

    if (mode === 'create') {
      try {
        await createTask({
          title: parsed.data,
          status: draft.status,
          priority: draft.priority,
          dueDate: draft.dueDate,
          groupId: draft.groupId,
          tagIds: draft.tagIds,
          notes: draft.notes.length > 0 ? draft.notes : null,
        })
        setConfirmCloseOpen(false)
        closeSheet()
        router.refresh()
      } catch {
        setFieldFailure('submit', t.tasks.errorCreate)
      }
      return
    }

    if (taskId === null) {
      setFieldFailure('submit', t.tasks.errorSave)
      return
    }

    try {
      await updateTask(taskId, {
        title: parsed.data,
        status: draft.status,
        priority: draft.priority,
        dueDate: draft.dueDate,
        groupId: draft.groupId,
        tagIds: draft.tagIds,
        notes: draft.notes.length > 0 ? draft.notes : null,
      })
      setBaseline({ ...draft, title: parsed.data })
      setConfirmCloseOpen(false)
      closeSheet()
      router.refresh()
    } catch {
      setFieldFailure('submit', t.tasks.errorSave)
    }
  }

  const sheetKey = taskId ?? 'create'
  const selectedGroupValue = draft.groupId ?? 'none'

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? undefined : requestCloseSheet())}>
      <SheetContent
        key={sheetKey}
        side="right"
        className={cn(
          'w-full max-w-lg p-0',
          'bg-background/90 backdrop-blur-md border-l border-border/60',
          'data-[state=open]:duration-300 data-[state=open]:ease-out',
          'data-[state=closed]:duration-300 data-[state=closed]:ease-out'
        )}
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="space-y-0 border-b border-border/50 px-5 pb-3 pt-5">
            <SheetTitle className="text-base">{mode === 'create' ? t.tasks.createTitle : t.tasks.editTitle}</SheetTitle>
            <SheetDescription className="sr-only">
              {mode === 'create'
                ? t.tasks.createDescription
                : t.tasks.editDescription}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            <div className="space-y-1">
              <Input
                ref={titleRef}
                value={draft.title}
                onChange={(event) => setDraftField('title', event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    const parsed = taskTitleSchema.safeParse(draft.title.trim())
                    if (!parsed.success) {
                      setFieldFailure('title', parsed.error.issues[0]?.message ?? t.validation.taskTitleRequired)
                      return
                    }
                    setDraftField('title', parsed.data)
                  }
                  if (event.key === 'Escape') {
                    resetField('title')
                  }
                }}
                placeholder={t.tasks.titlePlaceholder}
                className={cn(
                  'h-12 rounded-none border-0 border-b-2 border-border/60 bg-transparent px-2 text-xl font-semibold shadow-none transition-colors',
                  'placeholder:text-muted-foreground/60',
                  'hover:border-border focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0'
                )}
              />
              {fieldError.title !== undefined ? (
                <p className="mt-1 text-xs text-destructive">{fieldError.title}</p>
              ) : null}
            </div>

            <div className="space-y-4 rounded-lg border border-border/60 bg-card/80 p-3 backdrop-blur-sm">
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{t.tasks.statusLabel}</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex min-h-11 w-full items-center rounded-sm px-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                        aria-label={t.tasks.statusAction}
                      >
                        <StatusBadge status={draft.status} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-52 p-2">
                      <div className="flex flex-col gap-1">
                        {statusOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={cn(
                              'flex min-h-11 items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm',
                              'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                              draft.status === option.value && 'bg-accent text-accent-foreground'
                            )}
                            onClick={() => {
                              setDraftField('status', option.value)
                              if (mode === 'edit' && taskId !== null && sourceTask !== null) {
                                if (option.value === sourceTask.status) {
                                  clearStatusOverride(taskId)
                                } else {
                                  setStatusOverride(taskId, option.value)
                                }
                              }
                            }}
                          >
                            {option.label}
                            {draft.status === option.value ? (
                              <HugeiconsIcon icon={ArrowDown01Icon} size={14} />
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {fieldError.status !== undefined ? (
                    <p className="mt-1 text-xs text-destructive">{fieldError.status}</p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t.tasks.dueDate}</p>
                <div className="relative">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-label={t.tasks.dueDateAction}
                        className={cn(
                          'flex min-h-11 w-full cursor-pointer items-center justify-between rounded-sm border border-border/60 bg-background px-3 text-left text-sm transition-colors hover:bg-accent/40',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                          draft.dueDate === null && 'text-muted-foreground',
                          draft.dueDate !== null && 'pr-9'
                        )}
                      >
                        <span>{formatDueDateLabel(draft.dueDate, t, locale)}</span>
                        <HugeiconsIcon
                          icon={Calendar03Icon}
                          size={16}
                          className="text-muted-foreground"
                        />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={toDate(draft.dueDate)}
                        onSelect={(nextDate) => {
                          if (!nextDate) {
                            setDraftField('dueDate', null)
                            return
                          }
                          const existingTime = formatTimeInputValue(draft.dueDate)
                          setDraftField(
                            'dueDate',
                            combineDateAndTime(nextDate, existingTime)
                          )
                        }}
                        weekStartsOn={weekStartsOn}
                        initialFocus
                      />
                      <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2">
                        <span className="text-xs text-muted-foreground">
                          {t.tasks.dueDateTime}
                        </span>
                        <TimePicker
                          aria-label={t.tasks.dueDateTime}
                          value={formatTimeInputValue(draft.dueDate)}
                          onChange={(nextTime) => {
                            const base = toDate(draft.dueDate) ?? new Date()
                            setDraftField(
                              'dueDate',
                              combineDateAndTime(base, nextTime)
                            )
                          }}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                  {draft.dueDate !== null ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftField('dueDate', null)
                      }}
                      aria-label={t.tasks.dueDateClear}
                      className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={14} />
                    </button>
                  ) : null}
                </div>
                {fieldError.dueDate !== undefined ? (
                  <p className="mt-1 text-xs text-destructive">{fieldError.dueDate}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t.tasks.tags}</p>
                <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-sm border border-border/60 bg-background p-2">
                  {draft.tagIds.map((tagId) => {
                    const tag = tagsById.get(tagId)
                    return (
                      <span
                        key={tagId}
                        className={cn(
                          'inline-flex min-h-9 items-center justify-between gap-2 rounded-sm border border-border/60 px-2.5 py-1 text-xs',
                          'bg-secondary/70 text-secondary-foreground'
                        )}
                      >
                        <span className="truncate">{tag?.name ?? tagId}</span>
                        <button
                          type="button"
                          className={cn(
                            'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm',
                            'text-muted-foreground hover:bg-accent hover:text-foreground',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
                          )}
                          onClick={() => {
                            const next = draft.tagIds.filter((id) => id !== tagId)
                            setDraftField('tagIds', next)
                          }}
                          aria-label={t.tasks.tagsRemoveAria.replace('{name}', tag?.name ?? tagId)}
                        >
                          <HugeiconsIcon icon={Cancel01Icon} size={12} />
                        </button>
                      </span>
                    )
                  })}

                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-dashed border-border text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                        aria-label={t.tasks.tagsAdd}
                      >
                        <HugeiconsIcon icon={PlusSignIcon} size={14} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-72 space-y-2">
                      <Input
                        value={tagQuery}
                        onChange={(event) => setTagQuery(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter') {
                            return
                          }
                          event.preventDefault()
                          if (exactTagMatch) {
                            toggleTagSelection(exactTagMatch.id)
                            setTagQuery('')
                            return
                          }
                          if (canCreateTagFromQuery) {
                            handleCreateTagFromQuery()
                          }
                        }}
                        placeholder={t.tasks.tagsSearch}
                      />
                      <div className="max-h-40 space-y-1 overflow-y-auto">
                        {canCreateTagFromQuery ? (
                          <button
                            type="button"
                            onClick={handleCreateTagFromQuery}
                            disabled={isTagMutationPending}
                            className={cn(
                            'flex min-h-11 w-full items-center justify-between rounded-sm px-2 text-sm',
                              'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
                            )}
                          >
                            <span>{t.tasks.tagsCreate.replace('{name}', tagQuery.trim())}</span>
                            <HugeiconsIcon icon={PlusSignIcon} size={14} />
                          </button>
                        ) : null}
                        {visibleTags.map((tag) => {
                          const selected = selectedTagSet.has(tag.id)
                          const isEditing = editingTagId === tag.id
                          return (
                            <div key={tag.id} className="rounded-sm border border-transparent p-1 hover:border-border/50">
                              {isEditing ? (
                                <div className="space-y-2">
                                  <Input
                                    value={editingTagName}
                                    onChange={(event) => setEditingTagName(event.target.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter') {
                                        event.preventDefault()
                                        handleRenameTag()
                                      }
                                      if (event.key === 'Escape') {
                                        setEditingTagId(null)
                                        setEditingTagName('')
                                      }
                                    }}
                                  />
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="min-h-9"
                                      onClick={() => {
                                        setEditingTagId(null)
                                        setEditingTagName('')
                                      }}
                                    >
                                      {t.tasks.tagsCancel}
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="min-h-9"
                                      onClick={handleRenameTag}
                                      disabled={isTagMutationPending}
                                    >
                                      {t.tasks.tagsSave}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className={cn(
                                    'flex min-h-11 items-center gap-1 rounded-sm px-1',
                                    selected && 'bg-accent text-accent-foreground'
                                  )}
                                >
                                  <button
                                    type="button"
                                    className={cn(
                                      'flex min-h-11 flex-1 items-center rounded-sm px-2 text-sm text-left',
                                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
                                    )}
                                    onClick={() => toggleTagSelection(tag.id)}
                                  >
                                    <span>{tag.name}</span>
                                  </button>
                                  <div className="ml-auto flex items-center gap-1">
                                    <button
                                      type="button"
                                      className={cn(
                                        'inline-flex h-8 w-8 items-center justify-center rounded-sm',
                                        'text-muted-foreground hover:bg-background/70 hover:text-foreground',
                                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
                                      )}
                                      aria-label={t.tasks.tagsRenameAria.replace('{name}', tag.name)}
                                      onClick={() => beginTagRename(tag)}
                                      disabled={isTagMutationPending}
                                    >
                                      <HugeiconsIcon icon={Edit02Icon} size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      className={cn(
                                        'inline-flex h-8 w-8 items-center justify-center rounded-sm',
                                        'text-destructive/90 hover:bg-background/70 hover:text-destructive',
                                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
                                      )}
                                      aria-label={t.tasks.tagsDeleteAria.replace('{name}', tag.name)}
                                      onClick={() => handleDeleteTag(tag.id)}
                                      disabled={isTagMutationPending}
                                    >
                                      <HugeiconsIcon icon={Delete02Icon} size={14} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                        {visibleTags.length === 0 && !canCreateTagFromQuery ? (
                          <p className="px-2 py-1 text-sm text-muted-foreground">
                            {t.tasks.tagsEmpty}
                          </p>
                        ) : null}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                {fieldError.tagIds !== undefined ? (
                  <p className="mt-1 text-xs text-destructive">{fieldError.tagIds}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t.tasks.group}</p>
                <Select
                  value={selectedGroupValue}
                  onValueChange={(value) => {
                    const nextGroupId = value === 'none' ? null : value
                    setDraftField('groupId', nextGroupId)
                  }}
                >
                  <SelectTrigger className="min-h-11">
                    <SelectValue placeholder={t.tasks.groupNone} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.tasks.groupNone}</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldError.groupId !== undefined ? (
                  <p className="mt-1 text-xs text-destructive">{fieldError.groupId}</p>
                ) : null}
              </div>
            </div>

            <Separator />

            <TaskNotesMarkdown
              taskId={taskId}
              notes={draft.notes}
              onNotesChange={(nextNotes) => setDraftField('notes', nextNotes)}
            />
          </div>

          <footer className="flex items-center justify-between gap-2 border-t border-border/50 px-5 py-4">
            {mode === 'edit' ? (
              <Button type="button" variant="destructive" className="min-h-11" onClick={handleDelete}>
                {t.tasks.deleteTask}
              </Button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={requestCloseSheet}
                disabled={isPending}
              >
                {t.tasks.cancel}
              </Button>
              <Button
                type="button"
                className="min-h-11"
                onClick={mode === 'create' ? handleCreate : handleSaveAll}
                disabled={isPending}
              >
                {mode === 'create' ? t.tasks.createAction : t.tasks.saveChanges}
              </Button>
            </div>
          </footer>

          {fieldError.submit !== undefined ? (
            <p className="px-5 pb-4 text-xs text-destructive">{fieldError.submit}</p>
          ) : null}
        </div>
      </SheetContent>
      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.tasks.confirmCloseTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.tasks.confirmCloseDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">{t.tasks.keepEditing}</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault()
                if (taskId !== null) {
                  clearStatusOverride(taskId)
                }
                closeSheet()
                setConfirmCloseOpen(false)
              }}
            >
              {t.tasks.discardChanges}
            </AlertDialogAction>
            <AlertDialogAction
              className="min-h-11"
              onClick={(event) => {
                event.preventDefault()
                void handleSaveAndClose()
              }}
            >
              {t.tasks.saveAndClose}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  )
}
