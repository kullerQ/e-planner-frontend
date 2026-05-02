'use client'

import { useEffect, useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  Calendar03Icon,
  Cancel01Icon,
  Checkmark,
  CheckmarkCircle01Icon,
  Folder01Icon,
  InformationCircleIcon,
  ListViewIcon,
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
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet'
import { filterTasks, groupTasks, sortTasks } from '@/lib/taskFilters'
import { cn } from '@/lib/utils'
import { messages } from '@/lib/messages'
import {
  type GroupByDimension,
  type SortByDimension,
  useFilterStore,
} from '@/stores/useFilterStore'
import { useTaskSheetStore } from '@/stores/useTaskSheetStore'
import { useSelectionStore } from '@/stores/useSelectionStore'
import { useDebounce } from '@/hooks/useDebounce'
import type { Tag, Task, TaskGroup, TaskStatus } from '@/types'

interface TaskListClientProps {
  tasks: Task[]
  groups: TaskGroup[]
  tags: Tag[]
}

const groupByOptions = [
  { value: 'none' as const, label: '—', icon: ListViewIcon },
  { value: 'folder' as const, label: 'Folder', icon: Folder01Icon },
  { value: 'tag' as const, label: 'Tag', icon: CheckmarkCircle01Icon },
  { value: 'date' as const, label: 'Date', icon: Calendar03Icon },
  { value: 'status' as const, label: 'Status', icon: InformationCircleIcon },
]

const sortByOptions = [
  { value: 'date' as const, label: 'Date', icon: Calendar03Icon },
  { value: 'tag' as const, label: 'Tag', icon: Tag01Icon },
  { value: 'title' as const, label: 'Title', icon: Search01Icon },
  { value: 'created' as const, label: 'Created', icon: Folder01Icon },
  { value: 'status' as const, label: 'Status', icon: InformationCircleIcon },
]

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
  tagsById: Map<string, Tag>
): string {
  const parsed = parseGroupKey(key)
  if (parsed.dimension === 'folder') {
    if (parsed.value === 'none') {
      return 'Ungrouped'
    }
    return groupsById.get(parsed.value)?.name ?? 'Ungrouped'
  }

  if (parsed.dimension === 'tag') {
    if (parsed.value === 'none') {
      return 'No tag'
    }
    return tagsById.get(parsed.value)?.name ?? 'No tag'
  }

  if (parsed.dimension === 'priority') {
    return parsed.value.replaceAll('_', ' ')
  }
  if (parsed.dimension === 'status') {
    return parsed.value.replaceAll('_', ' ')
  }
  if (parsed.dimension === 'date') {
    if (parsed.value === 'overdue') return 'Overdue'
    if (parsed.value === 'today') return 'Today'
    if (parsed.value === 'upcoming') return 'Upcoming'
    return 'No due date'
  }
  return 'All tasks'
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
  const tasksMessages = messages.dashboard.tasks
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
  const closeTaskSheet = useTaskSheetStore((state) => state.close)
  const isSelecting = useSelectionStore((state) => state.isSelecting)
  const selectedIds = useSelectionStore((state) => state.selectedIds)
  const enterSelectMode = useSelectionStore((state) => state.enterSelectMode)
  const exitSelectMode = useSelectionStore((state) => state.exitSelectMode)
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setOptimisticTasks(tasks)
  }, [tasks])

  useEffect(() => {
    if (!isSelecting) {
      return
    }

    closeTaskSheet()
  }, [closeTaskSheet, isSelecting])

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

  const groupedTasks = useMemo(() => {
    const grouped = groupTasks(optimisticTasks, effectiveGroupBy, groups)
    const withSortedTasks = new Map<string, Task[]>()
    for (const [key, bucket] of grouped.entries()) {
      withSortedTasks.set(key, sortTasks(bucket, effectiveSortBy, effectiveSortDirection))
    }
    return withSortedTasks
  }, [optimisticTasks, groups, effectiveGroupBy, effectiveSortBy, effectiveSortDirection])

  const matchedTaskIds = useMemo(() => {
    return new Set(filterTasks(optimisticTasks, debouncedQuery).map((task) => task.id))
  }, [optimisticTasks, debouncedQuery])

  const groupsById = useMemo(() => {
    return new Map(groups.map((group) => [group.id, group] as const))
  }, [groups])
  const tagsById = useMemo(() => {
    return new Map(tags.map((tag) => [tag.id, tag] as const))
  }, [tags])

  function toggleGroupCollapse(groupKey: string) {
    setCollapsedGroups((current) => ({
      ...current,
      [groupKey]: !current[groupKey],
    }))
  }

  const selectedSortByOption = sortByOptions.find((option) => option.value === effectiveSortBy)
  const selectedGroupByOption = groupByOptions.find((option) => option.value === effectiveGroupBy)

  return (
    <>
      <div className="flex min-h-full">
        <main className="min-w-0 flex-1 p-6">
          <header className="flex items-center justify-between gap-4 pb-5 border-b border-border/50 mb-6">
            <h1 className="text-2xl font-semibold text-foreground">{tasksMessages.title}</h1>
            <Button type="button" onClick={() => openTaskSheet(null)}>
              [+ New Task]
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
                aria-label="Clear search"
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
                <SelectValue placeholder="Group by">
                  <span className="inline-flex items-center gap-2">
                    {selectedGroupByOption ? (
                      <HugeiconsIcon icon={selectedGroupByOption.icon} size={14} className="text-muted-foreground" />
                    ) : null}
                    <span>{selectedGroupByOption?.label ?? 'Group by'}</span>
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
                <span>{selectedSortByOption?.label ?? 'Order by'}</span>
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
                <span>Ascending</span>
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
                <span>Descending</span>
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
              {isSelecting ? `Done (${selectedIds.size})` : 'Select'}
            </Button>
          </section>

          <section className="rounded-md border border-border/50 bg-card/50 overflow-hidden">
            {!hasHydrated ? (
              <div className="p-6 text-sm text-muted-foreground">Loading tasks...</div>
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
                const groupLabel = getGroupLabel(groupKey, groupsById, tagsById)
                const groupColor = getGroupSwatchColor(groupKey, groupsById)
                const shouldRenderFolderActions =
                  parsedGroupKey.dimension === 'folder' &&
                  parsedGroupKey.value !== 'none' &&
                  groupsById.has(parsedGroupKey.value)

                return (
                  <div key={groupKey}>
                    {shouldRenderHeader ? (
                      <div className="sticky top-0 z-10 bg-muted/30 border-b border-border/50 px-4 py-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => toggleGroupCollapse(groupKey)}
                          className="flex items-center gap-2 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm px-1"
                          aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} group ${groupLabel}`}
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
                        {shouldRenderFolderActions ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="min-h-11 px-2 text-sm text-muted-foreground rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                                aria-label={`Group actions for ${groupLabel}`}
                              >
                                ...
                              </button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-44 p-1">
                              <button
                                type="button"
                                className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                              >
                                Rename
                              </button>
                              <button
                                type="button"
                                className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                              >
                                Change Color
                              </button>
                              <button
                                type="button"
                                className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                              >
                                Delete
                              </button>
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
            onBulkTagsAdded={handleBulkTagsAdded}
          />
        ) : null}
      </div>
      {!isSelecting ? <TaskDetailSheet tasks={optimisticTasks} groups={groups} tags={tags} /> : null}
    </>
  )
}
