import type { Task, TaskGroup } from '@/types'
import { clientApiFetch } from './index'

export function getTasks(): Promise<Task[]> {
  return clientApiFetch<Task[]>('/tasks')
}

export function getGroups(): Promise<TaskGroup[]> {
  return clientApiFetch<TaskGroup[]>('/groups')
}
