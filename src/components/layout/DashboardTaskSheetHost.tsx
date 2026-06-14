'use client'

import { useEffect } from 'react'
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet'
import { useGroupsStore } from '@/stores/useGroupsStore'
import type { Tag, Task, TaskGroup } from '@/types'

interface DashboardTaskSheetHostProps {
  tasks: Task[]
  groups: TaskGroup[]
  tags: Tag[]
}

export function DashboardTaskSheetHost({ tasks, groups, tags }: DashboardTaskSheetHostProps) {
  const setGroups = useGroupsStore((state) => state.setGroups)

  useEffect(() => {
    setGroups(groups)
  }, [groups, setGroups])

  return <TaskDetailSheet tasks={tasks} groups={groups} tags={tags} />
}
