import type { Task, TaskGroup, TaskPriority, TaskStatus } from '@/types'
import type { GroupByDimension, SortByDimension, SortDirection } from '@/stores/useFilterStore'

const priorityOrder: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
}

const statusOrder: Record<TaskStatus, number> = {
  todo: 0,
  in_progress: 1,
  delayed: 2,
  completed: 3,
}

type TaskWithComplexity = Task & { complexity?: string | number | null }

function getTaskComplexity(task: Task): string {
  const complexity = (task as TaskWithComplexity).complexity
  if (complexity === null || complexity === undefined) {
    return 'none'
  }
  return String(complexity).toLowerCase()
}

function getTaskDateBucket(task: Task): string {
  if (task.dueDate === null) {
    return 'none'
  }

  const now = new Date()
  const due = new Date(task.dueDate)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()

  if (dueDay < today) {
    return 'overdue'
  }
  if (dueDay === today) {
    return 'today'
  }
  return 'upcoming'
}

function getComparableValue(task: Task, sortBy: SortByDimension): number | string {
  if (sortBy === 'priority') {
    return priorityOrder[task.priority]
  }
  if (sortBy === 'status') {
    return statusOrder[task.status]
  }
  if (sortBy === 'date') {
    return task.dueDate === null ? Number.MAX_SAFE_INTEGER : new Date(task.dueDate).getTime()
  }
  if (sortBy === 'created') {
    return new Date(task.createdAt).getTime()
  }
  if (sortBy === 'title') {
    return task.title.toLowerCase()
  }
  if (sortBy === 'tag') {
    const firstTag = task.tags[0]
    return firstTag?.name.toLowerCase() ?? ''
  }
  return getTaskComplexity(task)
}

export function filterTasks(tasks: Task[], query: string): Task[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (normalizedQuery.length === 0) {
    return tasks
  }

  return tasks.filter((task) => {
    const inTitle = task.title.toLowerCase().includes(normalizedQuery)
    const inTags = task.tags.some((tag) => tag.name.toLowerCase().includes(normalizedQuery))
    const inNotes = task.notes?.toLowerCase().includes(normalizedQuery) ?? false
    return inTitle || inTags || inNotes
  })
}

export function groupTasks(
  tasks: Task[],
  dimension: GroupByDimension,
  groups: TaskGroup[]
): Map<string, Task[]> {
  const grouped = new Map<string, Task[]>()
  const groupsById = new Map(groups.map((group) => [group.id, group] as const))

  for (const task of tasks) {
    let key = 'none:all'

    if (dimension === 'folder') {
      key = `folder:${task.groupId ?? 'none'}`
    } else if (dimension === 'tag') {
      key = `tag:${task.tags[0]?.id ?? 'none'}`
    } else if (dimension === 'priority') {
      key = `priority:${task.priority}`
    } else if (dimension === 'complexity') {
      key = `complexity:${getTaskComplexity(task)}`
    } else if (dimension === 'date') {
      key = `date:${getTaskDateBucket(task)}`
    } else if (dimension === 'status') {
      key = `status:${task.status}`
    }

    if (dimension === 'folder') {
      const folderId = task.groupId
      if (folderId !== null && !groupsById.has(folderId)) {
        key = 'folder:none'
      }
    }

    const bucket = grouped.get(key)
    if (bucket === undefined) {
      grouped.set(key, [task])
    } else {
      bucket.push(task)
    }
  }

  return grouped
}

export function sortTasks(
  tasks: Task[],
  sortBy: SortByDimension,
  direction: SortDirection
): Task[] {
  const sorted = [...tasks].sort((left, right) => {
    const leftValue = getComparableValue(left, sortBy)
    const rightValue = getComparableValue(right, sortBy)

    if (leftValue < rightValue) {
      return -1
    }
    if (leftValue > rightValue) {
      return 1
    }
    return 0
  })

  return direction === 'asc' ? sorted : sorted.reverse()
}
