'use client'

import { useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Cancel01Icon,
  Search01Icon,
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
import { TaskRow } from '@/components/tasks/TaskRow'
import { filterTasks, groupTasks, sortTasks } from '@/lib/taskFilters'
import { cn } from '@/lib/utils'
import { messages } from '@/lib/messages'
import {
  type GroupByDimension,
  type SortByDimension,
  useFilterStore,
} from '@/stores/useFilterStore'
import { useTaskSheetStore } from '@/stores/useTaskSheetStore'
import { useDebounce } from '@/hooks/useDebounce'
import type { Task, TaskGroup } from '@/types'

interface TaskListClientProps {
  tasks: Task[]
  groups: TaskGroup[]
}

const groupByOptions: Array<{ value: GroupByDimension; label: string }> = [
  { value: 'none', label: '—' },
  { value: 'folder', label: 'Folder' },
  { value: 'tag', label: 'Tag' },
  { value: 'priority', label: 'Priority' },
  { value: 'complexity', label: 'Complexity' },
  { value: 'date', label: 'Date' },
  { value: 'status', label: 'Status' },
]

const sortByOptions: Array<{ value: SortByDimension; label: string }> = [
  { value: 'date', label: 'Date' },
  { value: 'priority', label: 'Priority' },
  { value: 'complexity', label: 'Complexity' },
  { value: 'tag', label: 'Tag' },
  { value: 'title', label: 'Title' },
  { value: 'created', label: 'Created' },
  { value: 'status', label: 'Status' },
]

function parseGroupKey(key: string): { dimension: string; value: string } {
  const [dimension, value] = key.split(':')
  return {
    dimension: dimension ?? 'none',
    value: value ?? 'all',
  }
}

function getGroupLabel(key: string, tasks: Task[], groupsById: Map<string, TaskGroup>): string {
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
    const firstTask = tasks[0]
    const foundTag = firstTask?.tags.find((tag) => tag.id === parsed.value)
    return foundTag?.name ?? 'No tag'
  }

  if (parsed.dimension === 'priority') {
    return parsed.value.replaceAll('_', ' ')
  }
  if (parsed.dimension === 'status') {
    return parsed.value.replaceAll('_', ' ')
  }
  if (parsed.dimension === 'complexity') {
    return parsed.value === 'none' ? 'No complexity' : parsed.value
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

export function TaskListClient({ tasks, groups }: TaskListClientProps) {
  const tasksMessages = messages.dashboard.tasks
  const searchQuery = useFilterStore((state) => state.searchQuery)
  const groupBy = useFilterStore((state) => state.groupBy)
  const sortBy = useFilterStore((state) => state.sortBy)
  const sortDirection = useFilterStore((state) => state.sortDirection)
  const setSearchQuery = useFilterStore((state) => state.setSearchQuery)
  const setGroupBy = useFilterStore((state) => state.setGroupBy)
  const setSortBy = useFilterStore((state) => state.setSortBy)
  const toggleSortDirection = useFilterStore((state) => state.toggleSortDirection)
  const openTaskSheet = useTaskSheetStore((state) => state.open)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const debouncedQuery = useDebounce(searchQuery, 200)

  const groupedTasks = useMemo(() => {
    const grouped = groupTasks(tasks, groupBy, groups)
    const withSortedTasks = new Map<string, Task[]>()
    for (const [key, bucket] of grouped.entries()) {
      withSortedTasks.set(key, sortTasks(bucket, sortBy, sortDirection))
    }
    return withSortedTasks
  }, [tasks, groups, groupBy, sortBy, sortDirection])

  const matchedTaskIds = useMemo(() => {
    return new Set(filterTasks(tasks, debouncedQuery).map((task) => task.id))
  }, [tasks, debouncedQuery])

  const groupsById = useMemo(() => {
    return new Map(groups.map((group) => [group.id, group] as const))
  }, [groups])

  function toggleGroupCollapse(groupKey: string) {
    setCollapsedGroups((current) => ({
      ...current,
      [groupKey]: !current[groupKey],
    }))
  }

  return (
    <main className="p-6">
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
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9 pr-9"
          />
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setSearchQuery('')}
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-opacity',
              searchQuery.length > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={12} />
          </button>
        </div>

        <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupByDimension)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Group by" />
          </SelectTrigger>
          <SelectContent>
            {groupByOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortByDimension)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {sortByOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
          onClick={toggleSortDirection}
        >
          <HugeiconsIcon icon={sortDirection === 'asc' ? ArrowUp01Icon : ArrowDown01Icon} size={16} />
        </Button>
      </section>

      <section className="rounded-md border border-border/50 bg-card/50 overflow-hidden">
        {groupedTasks.size === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">{tasksMessages.empty}</div>
        ) : (
          Array.from(groupedTasks.entries()).map(([groupKey, groupedTaskList]) => {
            const isCollapsed = collapsedGroups[groupKey] === true
            const visibleCount = groupedTaskList.reduce((count, task) => {
              return count + (debouncedQuery.length === 0 || matchedTaskIds.has(task.id) ? 1 : 0)
            }, 0)
            const shouldRenderHeader = groupBy !== 'none'
            const groupLabel = getGroupLabel(groupKey, groupedTaskList, groupsById)
            const groupColor = getGroupSwatchColor(groupKey, groupsById)

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
                    />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </section>
    </main>
  )
}
