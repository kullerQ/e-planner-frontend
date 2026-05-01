import type { Task, TaskGroup } from '@/types'
import { apiFetch } from './index'

export function getTasks(): Promise<Task[]> {
  return apiFetch<Task[]>('/tasks')
}

export function getGroups(): Promise<TaskGroup[]> {
  return apiFetch<TaskGroup[]>('/groups')
}
