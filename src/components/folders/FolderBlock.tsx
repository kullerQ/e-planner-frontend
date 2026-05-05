'use client'

import { useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  PlusSignIcon,
  Search01Icon,
  Cancel01Icon,
  Edit02Icon,
  Delete02Icon,
} from '@hugeicons/core-free-icons'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { ColorPickerPopover } from '@/components/shared/ColorPickerPopover'
import { useTaskSheetStore } from '@/stores/useTaskSheetStore'
import { renameGroup, updateGroupColor } from '@/actions/groups'
import { updateTaskField } from '@/actions/tasks'
import { messages } from '@/lib/messages'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Task, TaskGroup, TaskStatus } from '@/types'

interface FolderBlockProps {
  group: TaskGroup
  tasks: Task[]
  ungroupedTasks: Task[]
  onDeleteClick: (group: TaskGroup) => void
  onOptimisticUpdate?: (group: TaskGroup) => void
  onTaskMoved?: (taskId: string, groupId: string | null) => void
}

const STATUS_DOT_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-secondary-foreground/40',
  in_progress: 'bg-blue-500',
  delayed: 'bg-orange-500',
  completed: 'bg-primary',
}

export function FolderBlock({
  group,
  tasks,
  ungroupedTasks,
  onDeleteClick,
  onOptimisticUpdate,
  onTaskMoved,
}: FolderBlockProps) {
  const openTaskSheet = useTaskSheetStore((state) => state.open)

  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(group.name)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const filteredUngrouped = useMemo(() => {
    if (searchQuery.trim().length === 0) return ungroupedTasks
    const normalized = searchQuery.toLowerCase()
    return ungroupedTasks.filter((t) => t.title.toLowerCase().includes(normalized))
  }, [ungroupedTasks, searchQuery])

  function handleTaskClick(taskId: string) {
    openTaskSheet(taskId)
  }

  function handleCreateNewTask() {
    setAddMenuOpen(false)
    openTaskSheet(null, { groupId: group.id })
  }

  async function handleRemoveTask(taskId: string) {
    try {
      await updateTaskField(taskId, 'groupId', null)
      onTaskMoved?.(taskId, null)
      toast.success(messages.dashboard.folders.taskRemoved)
    } catch {
      toast.error(messages.dashboard.folders.taskRemoveError)
    }
  }

  async function handleAddExistingTask(taskId: string) {
    try {
      await updateTaskField(taskId, 'groupId', group.id)
      onTaskMoved?.(taskId, group.id)
      setAddMenuOpen(false)
      setSearchQuery('')
      toast.success(messages.dashboard.folders.taskAdded)
    } catch {
      toast.error(messages.dashboard.folders.taskAddError)
    }
  }

  function startRenaming() {
    setIsRenaming(true)
    setRenameValue(group.name)
  }

  function cancelRenaming() {
    setIsRenaming(false)
    setRenameValue(group.name)
  }

  async function submitRename() {
    const trimmed = renameValue.trim()
    if (trimmed.length === 0 || trimmed === group.name) {
      cancelRenaming()
      return
    }

    // Optimistic update
    const updatedGroup = { ...group, name: trimmed }
    onOptimisticUpdate?.(updatedGroup)
    setIsRenaming(false)

    try {
      await renameGroup(group.id, trimmed)
    } catch (error) {
      // Revert on error
      onOptimisticUpdate?.(group)
      const message = error instanceof Error ? error.message : messages.dashboard.folders.renameError
      toast.error(message)
    }
  }

  function handleRenameKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault()
      submitRename()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancelRenaming()
    }
  }

  async function handleColorChange(colorHex: string) {
    // Optimistic update
    const updatedGroup = { ...group, colorHex }
    onOptimisticUpdate?.(updatedGroup)

    try {
      await updateGroupColor(group.id, colorHex)
    } catch (error) {
      // Revert on error
      onOptimisticUpdate?.(group)
      const message = error instanceof Error ? error.message : messages.dashboard.folders.colorUpdateError
      toast.error(message)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group bg-card/90 backdrop-blur-sm border border-border/60 rounded-lg h-[220px]',
        'flex flex-col',
        'transition-shadow duration-150 ease-out',
        isDragging && 'shadow-xl scale-[1.01] opacity-90 z-50 duration-150 ease-out'
      )}
    >
      {/* Header row */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="size-4 rounded-sm flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
              style={{ backgroundColor: group.colorHex }}
              aria-label={messages.folders.changeColor}
            />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[240px] p-3">
            <ColorPickerPopover
              value={group.colorHex}
              onChange={handleColorChange}
            />
          </PopoverContent>
        </Popover>

        {isRenaming ? (
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={submitRename}
            className="h-7 text-sm flex-1"
            autoFocus
            aria-label={messages.dashboard.folders.aria.renameInput}
          />
        ) : (
          <span
            className={cn(
              'text-base font-semibold text-foreground flex-1 truncate',
              'cursor-grab active:cursor-grabbing'
            )}
            {...attributes}
            {...listeners}
            suppressHydrationWarning
          >
            {group.name}
          </span>
        )}

        {/* Rename button */}
        <button
          type="button"
          onClick={startRenaming}
          className={cn(
            'size-6 inline-flex items-center justify-center rounded-sm text-muted-foreground',
            'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
            'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          aria-label={`Rename ${group.name}`}
        >
          <HugeiconsIcon icon={Edit02Icon} size={14} />
        </button>

        {/* Delete button */}
        <button
          type="button"
          onClick={() => onDeleteClick(group)}
          className={cn(
            'size-6 inline-flex items-center justify-center rounded-sm text-muted-foreground',
            'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
            'hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          aria-label={`Delete ${group.name}`}
        >
          <HugeiconsIcon icon={Delete02Icon} size={14} />
        </button>
      </div>

      {/* Task list - scrollable with max height */}
      <div className="px-4 py-1 max-h-[240px] overflow-y-auto scrollbar-thin scrollbar-thumb-border/60 scrollbar-track-transparent">
        {tasks.length === 0 ? (
          <div className="text-xs text-muted-foreground/60 py-2 italic">
            {messages.folders.noTasks}
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="group/task flex items-center gap-1 -mx-2 px-2 rounded-md hover:bg-accent/60 transition-colors duration-100"
            >
              <button
                type="button"
                onClick={() => handleTaskClick(task.id)}
                className={cn(
                  'flex-1 min-w-0 text-left text-sm text-muted-foreground py-2 flex items-center gap-2',
                  'group-hover/task:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm'
                )}
              >
                <span
                  className={cn('size-2 rounded-full flex-shrink-0', STATUS_DOT_COLORS[task.status])}
                  aria-hidden="true"
                />
                <span className="truncate">{task.title}</span>
              </button>
              <button
                type="button"
                onClick={() => handleRemoveTask(task.id)}
                className={cn(
                  'flex-shrink-0 size-5 inline-flex items-center justify-center rounded-sm',
                  'text-muted-foreground/0 group-hover/task:text-muted-foreground',
                  'hover:!text-destructive focus-visible:text-destructive',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'transition-colors'
                )}
                aria-label={`Remove ${task.title} from folder`}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 pt-2 border-t border-border/40 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {tasks.length} {tasks.length !== 1 ? messages.folders.tasks : messages.folders.task}
        </span>
        <Popover open={addMenuOpen} onOpenChange={setAddMenuOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-xs text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-1"
            >
              {messages.folders.addTask}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-2">
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={handleCreateNewTask}
                className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 flex items-center gap-2"
              >
                <HugeiconsIcon icon={PlusSignIcon} size={14} className="text-primary" />
                <span>{messages.folders.createNewTask}</span>
              </button>

              {ungroupedTasks.length > 0 ? (
                <>
                  <div className="my-1 border-t border-border/50" />

                  <div className="relative px-1">
                    <HugeiconsIcon
                      icon={Search01Icon}
                      size={12}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={messages.folders.searchUngrouped}
                      className="h-7 w-full rounded-sm bg-muted/50 pl-6 pr-6 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:bg-muted/80 transition-colors"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} size={10} />
                      </button>
                    )}
                  </div>

                  <div className="max-h-[160px] overflow-y-auto scrollbar-thin mt-1">
                    {filteredUngrouped.length === 0 ? (
                      <p className="px-2 py-3 text-center text-xs text-muted-foreground/60">
                        {messages.folders.noTasksMatch}
                      </p>
                    ) : (
                      filteredUngrouped.map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => handleAddExistingTask(task.id)}
                          className="w-full rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 flex items-center gap-2"
                        >
                          <span
                            className={cn('size-1.5 rounded-full flex-shrink-0', STATUS_DOT_COLORS[task.status])}
                            aria-hidden="true"
                          />
                          <span className="truncate text-muted-foreground">{task.title}</span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
