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
import { taskTitleSchema } from '@/lib/validation'
import { cn } from '@/lib/utils'
import { useTaskSheetStore } from '@/stores/useTaskSheetStore'
import type { Tag, Task, TaskGroup, TaskStatus } from '@/types'

interface TaskDetailSheetProps {
  tasks: Task[]
  groups: TaskGroup[]
  tags: Tag[]
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

const statusOptions: Array<{ value: TaskStatus; label: string }> = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'delayed', label: 'Delayed' },
  { value: 'completed', label: 'Completed' },
]

function toDate(iso: string | null): Date | undefined {
  if (iso === null) {
    return undefined
  }
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function formatDueDateLabel(iso: string | null): string {
  if (iso === null) {
    return 'No due date'
  }
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) {
    return 'No due date'
  }
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

function emptyDraft(initialValues: { groupId?: string; dueDate?: string } | undefined): DraftState {
  return {
    title: '',
    status: 'todo',
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

export function TaskDetailSheet({ tasks, groups, tags }: TaskDetailSheetProps) {
  const router = useRouter()
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

  const [draft, setDraft] = useState<DraftState>(() => emptyDraft(initialValues))
  const [baseline, setBaseline] = useState<DraftState>(() => emptyDraft(initialValues))
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
    const nextDraft =
      mode === 'create'
        ? emptyDraft(initialValues)
        : sourceTaskWithOverrides !== null
          ? draftFromTask(sourceTaskWithOverrides)
          : emptyDraft(initialValues)

    setDraft(nextDraft)
    setBaseline(nextDraft)
    setFieldError({})
    setTagQuery('')
  }, [mode, sourceTaskWithOverrides, initialValues])

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
      setFieldFailure('title', parsed.error.issues[0]?.message ?? 'Title is required')
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
        setFieldFailure('submit', 'Could not create task. Please try again.')
      }
    })
  }

  async function handleSaveAll() {
    if (mode === 'create' || taskId === null) {
      return
    }
    const parsed = taskTitleSchema.safeParse(draft.title.trim())
    if (!parsed.success) {
      setFieldFailure('title', parsed.error.issues[0]?.message ?? 'Title is required')
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
        router.refresh()
      } catch {
        setFieldFailure('submit', 'Could not save task changes.')
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
        toast.info('Task moved to Recycle Bin')
        closeSheet()
        router.refresh()
      } catch {
        setFieldFailure('submit', 'Delete failed. Please try again.')
      }
    })
  }

  function requestCloseSheet() {
    if (mode === 'edit' && hasUnsavedChanges) {
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
        toast.error('Tag already exists or could not be created.')
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
      toast.error('Tag name is required.')
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
        toast.error('Could not rename tag.')
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
        toast.error('Could not delete tag.')
      }
    })
  }

  async function handleSaveAndClose() {
    if (mode === 'create') {
      closeSheet()
      return
    }

    const parsed = taskTitleSchema.safeParse(draft.title.trim())
    if (!parsed.success || taskId === null) {
      setFieldFailure('title', parsed.error?.issues[0]?.message ?? 'Title is required')
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
      setFieldFailure('submit', 'Could not save task changes.')
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
            <SheetTitle className="text-base">{mode === 'create' ? 'Create Task' : 'Task Details'}</SheetTitle>
            <SheetDescription className="sr-only">
              {mode === 'create'
                ? 'Create a new task with metadata and notes.'
                : 'Edit task metadata and notes.'}
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
                      setFieldFailure('title', parsed.error.issues[0]?.message ?? 'Title is required')
                      return
                    }
                    setDraftField('title', parsed.data)
                  }
                  if (event.key === 'Escape') {
                    resetField('title')
                  }
                }}
                placeholder="Task title"
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
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex min-h-11 w-full items-center rounded-sm px-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                        aria-label="Update status"
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
                <p className="text-xs text-muted-foreground">Due date</p>
                <div className="relative">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-label="Pick due date"
                        className={cn(
                          'flex min-h-11 w-full cursor-pointer items-center justify-between rounded-sm border border-border/60 bg-background px-3 text-left text-sm transition-colors hover:bg-accent/40',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                          draft.dueDate === null && 'text-muted-foreground',
                          draft.dueDate !== null && 'pr-9'
                        )}
                      >
                        <span>{formatDueDateLabel(draft.dueDate)}</span>
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
                          const iso = nextDate ? nextDate.toISOString() : null
                          setDraftField('dueDate', iso)
                        }}
                        weekStartsOn={weekStartsOn}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {draft.dueDate !== null ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftField('dueDate', null)
                      }}
                      aria-label="Clear due date"
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
                <p className="text-xs text-muted-foreground">Tags</p>
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
                          aria-label={`Remove tag ${tag?.name ?? tagId}`}
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
                        aria-label="Add tag"
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
                        placeholder="Search tags"
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
                            <span>Create &quot;{tagQuery.trim()}&quot;</span>
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
                                      Cancel
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="min-h-9"
                                      onClick={handleRenameTag}
                                      disabled={isTagMutationPending}
                                    >
                                      Save
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
                                      aria-label={`Rename tag ${tag.name}`}
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
                                      aria-label={`Delete tag ${tag.name}`}
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
                            No matching tags yet.
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
                <p className="text-xs text-muted-foreground">Group</p>
                <Select
                  value={selectedGroupValue}
                  onValueChange={(value) => {
                    const nextGroupId = value === 'none' ? null : value
                    setDraftField('groupId', nextGroupId)
                  }}
                >
                  <SelectTrigger className="min-h-11">
                    <SelectValue placeholder="No folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No folder</SelectItem>
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
                Delete Task
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
                Cancel
              </Button>
              <Button
                type="button"
                className="min-h-11"
                onClick={mode === 'create' ? handleCreate : handleSaveAll}
                disabled={isPending}
              >
                {mode === 'create' ? 'Create Task' : 'Save Changes'}
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
            <AlertDialogTitle>Save changes before closing?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in this task. Save them before closing the details sheet?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Keep editing</AlertDialogCancel>
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
              Discard changes
            </AlertDialogAction>
            <AlertDialogAction
              className="min-h-11"
              onClick={(event) => {
                event.preventDefault()
                void handleSaveAndClose()
              }}
            >
              Save and close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  )
}
