export type TaskPriority = 'critical' | 'high' | 'medium' | 'low' | 'none'

export type TaskStatus =
  | 'todo'
  | 'in_progress'
  | 'delayed'
  | 'completed'
  | 'cancelled'

export interface ChecklistItem {
  id: string
  text: string
  completed: boolean
  order: number
}

export interface Tag {
  id: string
  name: string
}

export interface Task {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  groupId: string | null
  tags: Tag[]
  notes: string | null
  checklist: ChecklistItem[]
  colorHex: string
  colorInherited: boolean
  deletedAt: string | null
  deletedAutoAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskGroup {
  id: string
  name: string
  colorHex: string
  taskCount: number
  order: number
  createdAt: string
}

export interface User {
  id: string
  name: string
  email: string
  avatarUrl: string | null
}

export interface WidgetPlacement {
  widgetId: string
  instanceId: string
  colStart: number
  colEnd: number
  rowStart: number
  rowEnd: number
}
