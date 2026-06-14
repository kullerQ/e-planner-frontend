'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Messages } from '@/lib/i18n/types'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  Calendar01Icon,
  Calendar03Icon,
  Cancel01Icon,
  Checkmark,
  CheckmarkCircle01Icon,
  Folder01Icon,
  InformationCircleIcon,
  ListViewIcon,
  MoreVerticalIcon,
  Search01Icon,
  SortByDown02Icon,
  SortByUp02Icon,
  Tag01Icon,
} from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BulkSelectionPanel } from '@/components/tasks/BulkSelectionPanel'
import { TaskRow } from '@/components/tasks/TaskRow'
import { ColorPickerPopover } from '@/components/shared/ColorPickerPopover'
import { DeleteGroupDialog } from '@/components/groups/DeleteGroupDialog'
import { renameGroup, updateGroupColor } from '@/actions/groups'
import { filterTasks, groupTasks, sortTasks } from '@/lib/taskFilters'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/messages'
import {
  type GroupByDimension,
  type SortByDimension,
  useFilterStore,
} from '@/stores/useFilterStore'
import { useTaskSheetStore } from '@/stores/useTaskSheetStore'
import { useSelectionStore } from '@/stores/useSelectionStore'
import { useDebounce } from '@/hooks/useDebounce'
import { toast } from 'sonner'
import type { Tag, Task, TaskGroup, TaskStatus } from '@/types'

interface TaskListClientProps {
  tasks: Task[]
  groups: TaskGroup[]
  tags: Tag[]
}

// Complexity and priority controls are intentionally hidden in the current UI.
const HIDDEN_GROUP_BY_DIMENSIONS: ReadonlyArray<GroupByDimension> = ['priority', 'complexity']
const HIDDEN_SORT_BY_DIMENSIONS: ReadonlyArray<SortByDimension> = ['priority', 'complexity']

function parseGroupKey(key: string): { dimension: string; value: string } {
  const [dimension, value] = key.split(':')
  return {
    dimension: dimension ?? 'none',
    value: value ?? 'all',
  }
}

function getGroupLabel(
  key: string,
  groupsById: Map<string, TaskGroup>,
  tagsById: Map<string, Tag>,
  taskList: Messages['taskList'],
  taskStatus: Messages['tasks']['status'],
): string {
  const parsed = parseGroupKey(key)
  if (parsed.dimension === 'folder') {
    if (parsed.value === 'none') {
      return taskList.groups.ungrouped
    }
    return groupsById.get(parsed.value)?.name ?? taskList.groups.ungrouped
  }

  if (parsed.dimension === 'tag') {
    if (parsed.value === 'none') {
      return taskList.groups.noTag
    }
    return tagsById.get(parsed.value)?.name ?? taskList.groups.noTag
  }

  if (parsed.dimension === 'priority') {
    return parsed.value.replaceAll('_', ' ')
  }
  if (parsed.dimension === 'status') {
    const s = parsed.value as TaskStatus
    if (s === 'todo' || s === 'in_progress' || s === 'delayed' || s === 'completed') {
      return taskStatus[s]
    }
    return parsed.value.replaceAll('_', ' ')
  }
  if (parsed.dimension === 'date') {
    if (parsed.value === 'overdue') return taskList.groups.overdue
    if (parsed.value === 'today') return taskList.groups.today
    if (parsed.value === 'upcoming') return taskList.groups.upcoming
    return taskList.groups.noDueDate
  }
  return taskList.groups.allTasks
}

function getGroupSwatchColor(key: string, groupsById: Map<string, TaskGroup>): string {
  const parsed = parseGroupKey(key)
  if (parsed.dimension !== 'folder') {
    return 'hsl(var(--muted-foreground))'
  }
  if (parsed.value === 'none') {
    return 'hsl(var(--muted-foreground))'
  }
  return groupsById.get(parsed.value)?.colorHex ?? 'hsl(var(--muted-foreground))'
}

export function TaskListClient({ tasks, groups, tags }: TaskListClientProps) {
  const router = useRouter()
  const { t } = useI18n()
  const tasksMessages = t.dashboard.tasks
  const groupByOptions = useMemo(
    () => [
      { value: 'none' as const, label: t.taskList.groupBy.none, icon: ListViewIcon },
      { value: 'folder' as const, label: t.taskList.groupBy.folder, icon: Folder01Icon },
      { value: 'tag' as const, label: t.taskList.groupBy.tag, icon: CheckmarkCircle01Icon },
      { value: 'date' as const, label: t.taskList.groupBy.date, icon: Calendar03Icon },
      { value: 'status' as const, label: t.taskList.groupBy.status, icon: InformationCircleIcon },
    ],
    [t.taskList.groupBy],
  )
  const sortByOptions = useMemo(
    () => [
      { value: 'date' as const, label: t.taskList.sortBy.date, icon: Calendar03Icon },
      { value: 'tag' as const, label: t.taskList.sortBy.tag, icon: Tag01Icon },
      { value: 'title' as const, label: t.taskList.sortBy.title, icon: Search01Icon },
      { value: 'created' as const, label: t.taskList.sortBy.created, icon: Calendar01Icon },
      { value: 'status' as const, label: t.taskList.sortBy.status, icon: InformationCircleIcon },
    ],
    [t.taskList.sortBy],
  )
  const searchQuery = useFilterStore((state) => state.searchQuery)
  const groupBy = useFilterStore((state) => state.groupBy)
  const sortBy = useFilterStore((state) => state.sortBy)
  const sortDirection = useFilterStore((state) => state.sortDirection)
  const hasHydrated = useFilterStore((state) => state.hasHydrated)
  const setSearchQuery = useFilterStore((state) => state.setSearchQuery)
  const setGroupBy = useFilterStore((state) => state.setGroupBy)
  const setSortBy = useFilterStore((state) => state.setSortBy)
  const toggleSortDirection = useFilterStore((state) => state.toggleSortDirection)
  const openTaskSheet = useTaskSheetStore((state) => state.open)
  const closeTaskSheetForce = useTaskSheetStore((state) => state.closeForce)
  const isSelecting = useSelectionStore((state) => state.isSelecting)
  const selectedIds = useSelectionStore((state) => state.selectedIds)
  const enterSelectMode = useSelectionStore((state) => state.enterSelectMode)
  const exitSelectMode = useSelectionStore((state) => state.exitSelectMode)
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks)
  const pendingRestoreIdsRef = useRef<Set<string>>(new Set())
  const deletedTaskSnapshotsRef = useRef<Map<string, Task>>(new Map())
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [optimisticGroups, setOptimisticGroups] = useState<TaskGroup[]>(groups)

  // Inline rename state
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null)
  const [deleteGroupName, setDeleteGroupName] = useState('')

  useEffect(() => {
    setOptimisticTasks((currentTasks) => {
      const pendingRestoreIds = pendingRestoreIdsRef.current
      const serverTaskIds = new Set(tasks.map((task) => task.id))

      for (const taskId of pendingRestoreIds) {
        if (serverTaskIds.has(taskId)) {
          pendingRestoreIds.delete(taskId)
        }
      }

      const mergedTasks = [...tasks]
      for (const task of currentTasks) {
        if (pendingRestoreIds.has(task.id) && !serverTaskIds.has(task.id)) {
          mergedTasks.push(task)
        }
      }

      return mergedTasks
    })
  }, [tasks])

  useEffect(() => {
    setOptimisticGroups(groups)
  }, [groups])

  useEffect(() => {
    if (!isSelecting) {
      return
    }

    closeTaskSheetForce()
  }, [closeTaskSheetForce, isSelecting])

  useEffect(() => {
    if (!isSelecting) {
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }
      exitSelectMode()
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [exitSelectMode, isSelecting])

  const effectiveSearchQuery = searchQuery
  const effectiveGroupBy: GroupByDimension =
    !HIDDEN_GROUP_BY_DIMENSIONS.includes(groupBy) ? groupBy : 'none'
  const effectiveSortBy: SortByDimension =
    !HIDDEN_SORT_BY_DIMENSIONS.includes(sortBy) ? sortBy : 'date'
  const effectiveSortDirection = sortDirection
  const debouncedQuery = useDebounce(effectiveSearchQuery, 200)

  function handleTaskStatusOptimistic(taskId: string, status: TaskStatus) {
    setOptimisticTasks((currentTasks) =>
      currentTasks.map((task) => (task.id === taskId ? { ...task, status } : task))
    )
  }

  function handleBulkDeleted(taskIds: string[]) {
    const deletedIdSet = new Set(taskIds)
    setOptimisticTasks((currentTasks) => currentTasks.filter((task) => !deletedIdSet.has(task.id)))
  }

  function handleBulkRestored(taskIds: string[]) {
    const restoredTasks = taskIds
      .map((taskId) => tasksById.get(taskId))
      .filter((task): task is Task => task !== undefined)

    if (restoredTasks.length === 0) {
      return
    }

    setOptimisticTasks((currentTasks) => {
      const existingTaskIds = new Set(currentTasks.map((task) => task.id))
      const nextTasks = [...currentTasks]
      for (const task of restoredTasks) {
        if (!existingTaskIds.has(task.id)) {
          nextTasks.push(task)
        }
      }
      return nextTasks
    })
  }

  function handleTaskDeleted(taskId: string) {
    pendingRestoreIdsRef.current.delete(taskId)
    setOptimisticTasks((currentTasks) => {
      const deletedTask = currentTasks.find((task) => task.id === taskId)
      if (deletedTask !== undefined) {
        deletedTaskSnapshotsRef.current.set(taskId, deletedTask)
      }
      return currentTasks.filter((task) => task.id !== taskId)
    })
    closeTaskSheetForce()
  }

  function handleTaskRestored(restoredTask: Task) {
    const snapshot = deletedTaskSnapshotsRef.current.get(restoredTask.id) ?? restoredTask
    deletedTaskSnapshotsRef.current.delete(restoredTask.id)
    pendingRestoreIdsRef.current.add(snapshot.id)
    setOptimisticTasks((currentTasks) => {
      if (currentTasks.some((task) => task.id === snapshot.id)) {
        return currentTasks
      }
      return [...currentTasks, snapshot]
    })
  }

  function handleTaskRestoreSuccess() {
    router.refresh()
  }

  function handleBulkTagsAdded(taskIds: string[], tagIds: string[]) {
    const updatedTaskIdSet = new Set(taskIds)
    const tagsToAdd = tagIds
      .map((tagId) => tagsById.get(tagId))
      .filter((tag): tag is Tag => tag !== undefined)

    if (tagsToAdd.length === 0) {
      return
    }

    setOptimisticTasks((currentTasks) =>
      currentTasks.map((task) => {
        if (!updatedTaskIdSet.has(task.id)) {
          return task
        }

        const mergedTagsById = new Map(task.tags.map((tag) => [tag.id, tag] as const))
        for (const tag of tagsToAdd) {
          mergedTagsById.set(tag.id, tag)
        }

        return {
          ...task,
          tags: Array.from(mergedTagsById.values()),
        }
      })
    )
  }

  function handleBulkMoved(taskIds: string[], groupId: string | null) {
    const movedTaskIdSet = new Set(taskIds)
    setOptimisticTasks((currentTasks) =>
      currentTasks.map((task) =>
        movedTaskIdSet.has(task.id)
          ? { ...task, groupId }
          : task
      )
    )
  }

  const groupedTasks = useMemo(() => {
    const grouped = groupTasks(optimisticTasks, effectiveGroupBy, optimisticGroups)
    const withSortedTasks = new Map<string, Task[]>()
    for (const [key, bucket] of grouped.entries()) {
      withSortedTasks.set(key, sortTasks(bucket, effectiveSortBy, effectiveSortDirection))
    }
    return withSortedTasks
  }, [optimisticTasks, optimisticGroups, effectiveGroupBy, effectiveSortBy, effectiveSortDirection])

  const matchedTaskIds = useMemo(() => {
    return new Set(filterTasks(optimisticTasks, debouncedQuery).map((task) => task.id))
  }, [optimisticTasks, debouncedQuery])

  const groupsById = useMemo(() => {
    return new Map(optimisticGroups.map((group) => [group.id, group] as const))
  }, [optimisticGroups])
  const tagsById = useMemo(() => {
    return new Map(tags.map((tag) => [tag.id, tag] as const))
  }, [tags])
  const tasksById = useMemo(() => {
    return new Map(tasks.map((task) => [task.id, task] as const))
  }, [tasks])

  function toggleGroupCollapse(groupKey: string) {
    setCollapsedGroups((current) => ({
      ...current,
      [groupKey]: !current[groupKey],
    }))
  }

  // Inline rename handlers
  function startRenaming(group: TaskGroup) {
    setRenamingGroupId(group.id)
    setRenameValue(group.name)
  }

  function cancelRenaming() {
    setRenamingGroupId(null)
    setRenameValue('')
  }

  async function submitRename(groupId: string) {
    const trimmed = renameValue.trim()
    if (trimmed.length === 0) {
      cancelRenaming()
      return
    }

    // Optimistic update
    setOptimisticGroups((current) =>
      current.map((g) => (g.id === groupId ? { ...g, name: trimmed } : g))
    )
    setRenamingGroupId(null)
    setRenameValue('')

    try {
      await renameGroup(groupId, trimmed)
    } catch (error) {
      // Revert on error
      setOptimisticGroups(groups)
      const message = error instanceof Error ? error.message : t.dashboard.folders.renameError
      toast.error(message)
    }
  }

  function handleRenameKeyDown(event: React.KeyboardEvent, groupId: string) {
    if (event.key === 'Enter') {
      event.preventDefault()
      submitRename(groupId)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancelRenaming()
    }
  }

  // Color change handler
  async function handleColorChange(groupId: string, colorHex: string) {
    // Optimistic update
    setOptimisticGroups((current) =>
      current.map((g) => (g.id === groupId ? { ...g, colorHex } : g))
    )

    try {
      await updateGroupColor(groupId, colorHex)
    } catch (error) {
      // Revert on error
      setOptimisticGroups(groups)
      const message = error instanceof Error ? error.message : t.dashboard.folders.colorUpdateError
      toast.error(message)
    }
  }

  // Delete dialog handlers
  function openDeleteDialog(group: TaskGroup) {
    setDeleteGroupId(group.id)
    setDeleteGroupName(group.name)
    setDeleteDialogOpen(true)
  }

  function handleGroupDeleted() {
    // Optimistically remove the group and its tasks from UI
    setOptimisticGroups((current) => current.filter((g) => g.id !== deleteGroupId))
    setOptimisticTasks((current) => current.filter((t) => t.groupId !== deleteGroupId))
  }

  const selectedSortByOption = sortByOptions.find((option) => option.value === effectiveSortBy)
  const selectedGroupByOption = groupByOptions.find((option) => option.value === effectiveGroupBy)

  return (
    <>
      <div className="flex h-full overflow-hidden">
        <main className="min-w-0 flex-1 p-6 overflow-y-auto">
          <header className="flex items-center justify-between gap-4 pb-5 border-b border-border/50 mb-6">
            <h1 className="text-2xl font-semibold text-foreground">{tasksMessages.title}</h1>
            <Button type="button" onClick={() => openTaskSheet(null)}>
              {t.taskList.newTaskButton}
            </Button>
          </header>

          <section className="flex flex-wrap items-center gap-3 mb-5">
            <div className="relative w-full min-w-[220px] max-w-[360px]">
              <HugeiconsIcon
                icon={Search01Icon}
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder={tasksMessages.searchPlaceholder}
                value={effectiveSearchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9 pr-9"
              />
              <button
                type="button"
                aria-label={t.taskList.clearSearch}
                onClick={() => setSearchQuery('')}
                className={cn(
                  'absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-opacity',
                  effectiveSearchQuery.length > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={12} />
              </button>
            </div>

            <Select
              value={effectiveGroupBy}
              onValueChange={(value) => setGroupBy(value as GroupByDimension)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t.taskList.groupByLabel}>
                  <span className="inline-flex items-center gap-2">
                    {selectedGroupByOption ? (
                      <HugeiconsIcon icon={selectedGroupByOption.icon} size={14} className="text-muted-foreground" />
                    ) : null}
                    <span>{selectedGroupByOption?.label ?? t.taskList.groupByLabel}</span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {groupByOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="inline-flex items-center gap-2">
                      <HugeiconsIcon icon={option.icon} size={14} className="text-muted-foreground" />
                      <span>{option.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="w-[184px] justify-between">
              <span className="inline-flex items-center gap-2">
                <HugeiconsIcon
                  icon={effectiveSortDirection === 'asc' ? SortByUp02Icon : SortByDown02Icon}
                  size={14}
                  className="text-muted-foreground"
                />
                <span>{selectedSortByOption?.label ?? t.taskList.orderByLabel}</span>
              </span>
              <HugeiconsIcon icon={ArrowDown01Icon} size={14} className="text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[220px] p-1">
            {sortByOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSortBy(option.value as SortByDimension)}
                className={cn(
                  'flex min-h-11 w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                  'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-ring focus-visible:ring-offset-1'
                )}
              >
                <span className="inline-flex w-4 items-center justify-center">
                  {effectiveSortBy === option.value ? <HugeiconsIcon icon={Checkmark} size={14} /> : null}
                </span>
                <span className="inline-flex items-center gap-2">
                  <HugeiconsIcon icon={option.icon} size={14} className="text-muted-foreground" />
                  <span>{option.label}</span>
                </span>
              </button>
            ))}
            <div className="my-1 border-t border-border/50" />
            <button
              type="button"
              onClick={() => {
                if (effectiveSortDirection === 'asc') {
                  return
                }
                toggleSortDirection()
              }}
              className={cn(
                'flex min-h-11 w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-ring focus-visible:ring-offset-1'
              )}
            >
              <span className="inline-flex w-4 items-center justify-center">
                {effectiveSortDirection === 'asc' ? <HugeiconsIcon icon={Checkmark} size={14} /> : null}
              </span>
              <span className="inline-flex items-center gap-2">
                <HugeiconsIcon icon={SortByUp02Icon} size={14} className="text-muted-foreground" />
                <span>{t.taskList.ascending}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (effectiveSortDirection === 'desc') {
                  return
                }
                toggleSortDirection()
              }}
              className={cn(
                'flex min-h-11 w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-ring focus-visible:ring-offset-1'
              )}
            >
              <span className="inline-flex w-4 items-center justify-center">
                {effectiveSortDirection === 'desc' ? <HugeiconsIcon icon={Checkmark} size={14} /> : null}
              </span>
              <span className="inline-flex items-center gap-2">
                <HugeiconsIcon icon={SortByDown02Icon} size={14} className="text-muted-foreground" />
                <span>{t.taskList.descending}</span>
              </span>
            </button>
          </PopoverContent>
        </Popover>

            <Button
              type="button"
              variant={isSelecting ? 'default' : 'outline'}
              onClick={() => {
                if (isSelecting) {
                  exitSelectMode()
                  return
                }
                enterSelectMode()
              }}
              className="min-w-[132px] justify-center"
            >
              {isSelecting ? t.taskList.doneButton.replace('{count}', String(selectedIds.size)) : t.taskList.selectButton}
            </Button>
          </section>

          <section className="rounded-md border border-border/50 bg-card/50 overflow-hidden">
            {!hasHydrated ? (
              <div className="p-6 text-sm text-muted-foreground">{t.taskList.loading}</div>
            ) : null}
            {hasHydrated && groupedTasks.size === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">{tasksMessages.empty}</div>
            ) : null}
            {hasHydrated ? (
              Array.from(groupedTasks.entries()).map(([groupKey, groupedTaskList]) => {
                const parsedGroupKey = parseGroupKey(groupKey)
                const isCollapsed = collapsedGroups[groupKey] === true
                const visibleCount = groupedTaskList.reduce((count, task) => {
                  return count + (debouncedQuery.length === 0 || matchedTaskIds.has(task.id) ? 1 : 0)
                }, 0)
                const shouldRenderHeader = effectiveGroupBy !== 'none'
                const groupLabel = getGroupLabel(groupKey, groupsById, tagsById, t.taskList, t.tasks.status)
                const groupColor = getGroupSwatchColor(groupKey, groupsById)
                const shouldRenderFolderActions =
                  parsedGroupKey.dimension === 'folder' &&
                  parsedGroupKey.value !== 'none' &&
                  groupsById.has(parsedGroupKey.value)

                const currentGroup = shouldRenderFolderActions
                  ? groupsById.get(parsedGroupKey.value)
                  : undefined
                const isRenaming = currentGroup !== undefined && renamingGroupId === currentGroup.id

                return (
                  <div key={groupKey}>
                    {shouldRenderHeader ? (
                      <div className="sticky top-0 z-10 bg-muted/30 border-b border-border/50 px-4 py-2 flex items-center justify-between">
                        {isRenaming ? (
                          <div className="flex items-center gap-2 flex-1 mr-2">
                            <span
                              className="size-3 rounded-sm"
                              style={{ backgroundColor: groupColor }}
                            />
                            <Input
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => currentGroup && handleRenameKeyDown(e, currentGroup.id)}
                              onBlur={() => currentGroup && submitRename(currentGroup.id)}
                              className="h-8 text-sm flex-1"
                              autoFocus
                              aria-label={t.dashboard.folders.aria.renameInput}
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleGroupCollapse(groupKey)}
                            className="flex items-center gap-2 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm px-1"
                            aria-label={t.taskList.groupAria.replace('{action}', isCollapsed ? t.taskList.expandGroup : t.taskList.collapseGroup).replace('{name}', groupLabel)}
                          >
                            <HugeiconsIcon
                              icon={ArrowDown01Icon}
                              size={14}
                              className={cn('transition-transform', isCollapsed && '-rotate-90')}
                            />
                            <span className="size-3 rounded-sm" style={{ backgroundColor: groupColor }} />
                            <span className="text-sm font-semibold text-foreground capitalize">{groupLabel}</span>
                            <span className="text-xs text-muted-foreground">({visibleCount})</span>
                          </button>
                        )}
                        {shouldRenderFolderActions && currentGroup && !isRenaming ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="min-h-11 min-w-11 inline-flex items-center justify-center text-sm text-muted-foreground rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                                aria-label={t.taskList.groupActionsAria.replace('{name}', groupLabel)}
                              >
                                <HugeiconsIcon icon={MoreVerticalIcon} size={16} />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-48 p-2">
                              <div className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  onClick={() => startRenaming(currentGroup)}
                                  className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                                >
                                  {t.dashboard.folders.menu.rename}
                                </button>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                                    >
                                      {t.dashboard.folders.menu.changeColor}
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent align="end" className="w-[240px] p-3">
                                    <ColorPickerPopover
                                      value={currentGroup.colorHex}
                                      onChange={(colorHex) => handleColorChange(currentGroup.id, colorHex)}
                                    />
                                  </PopoverContent>
                                </Popover>
                                <button
                                  type="button"
                                  onClick={() => openDeleteDialog(currentGroup)}
                                  className="w-full rounded-sm px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                                >
                                  {t.dashboard.folders.menu.delete}
                                </button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : null}
                      </div>
                    ) : null}

                    <div className={cn(isCollapsed && 'hidden')}>
                      {groupedTaskList.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          group={task.groupId !== null ? (groupsById.get(task.groupId) ?? null) : null}
                          isHiddenBySearch={debouncedQuery.length > 0 && !matchedTaskIds.has(task.id)}
                          searchQuery={debouncedQuery}
                          onTaskStatusOptimistic={handleTaskStatusOptimistic}
                          onTaskDeleted={handleTaskDeleted}
                          onTaskRestored={handleTaskRestored}
                          onTaskRestoreSuccess={handleTaskRestoreSuccess}
                        />
                      ))}
                    </div>
                  </div>
                )
              })
            ) : null}
          </section>
        </main>
        {isSelecting ? (
          <BulkSelectionPanel
            groups={groups}
            tags={tags}
            onBulkDeleted={handleBulkDeleted}
            onBulkRestored={handleBulkRestored}
            onBulkMoved={handleBulkMoved}
            onBulkTagsAdded={handleBulkTagsAdded}
          />
        ) : null}
      </div>

      <DeleteGroupDialog
        groupId={deleteGroupId}
        groupName={deleteGroupName}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={handleGroupDeleted}
      />
    </>
  )
}
