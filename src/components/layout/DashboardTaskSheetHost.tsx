'use client'

import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet'
import type { Tag, Task, TaskGroup } from '@/types'

interface DashboardTaskSheetHostProps {
  tasks: Task[]
  groups: TaskGroup[]
  tags: Tag[]
}

export function DashboardTaskSheetHost({ tasks, groups, tags }: DashboardTaskSheetHostProps) {
  return <TaskDetailSheet tasks={tasks} groups={groups} tags={tags} />
}
