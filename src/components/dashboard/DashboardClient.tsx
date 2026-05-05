'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import { PencilEdit01Icon } from '@hugeicons/core-free-icons'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { WidgetCanvas } from '@/components/dashboard/WidgetCanvas'
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet'
import { messages } from '@/lib/messages'
import type { Task, TaskGroup, Tag } from '@/types'
import type { ActivityEntry } from '@/app/dashboard/page'

interface DashboardClientProps {
  tasks: Task[]
  groups: TaskGroup[]
  tags: Tag[]
  phrase: string
  attribution: string | undefined
  activityData: ActivityEntry[]
}

function formatGreetingDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function DashboardClient({ tasks, groups, tags, phrase, attribution, activityData }: DashboardClientProps) {
  const router = useRouter()
  const isEditMode = useDashboardStore((s) => s.isEditMode)
  const enterEditMode = useDashboardStore((s) => s.enterEditMode)

  const [dateLabel, setDateLabel] = useState<string>('')
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks)

  useEffect(() => {
    setOptimisticTasks(tasks)
  }, [tasks])

  useEffect(() => {
    const id = setTimeout(() => setDateLabel(formatGreetingDate()), 0)
    return () => clearTimeout(id)
  }, [])

  const handleTaskStatusUpdated = useCallback((taskId: string, newStatus: Task['status']) => {
    setOptimisticTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    )
  }, [])

  const handleTaskDeleted = useCallback((taskId: string) => {
    setOptimisticTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, isDeleted: true } : t))
    )
  }, [])

  const handleRefresh = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <>
      <div className="flex items-end justify-between gap-4 px-6 pt-6 pb-4 shrink-0">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {messages.dashboard.title}
          </h1>
          {dateLabel && (
            <p className="text-xs text-muted-foreground">{dateLabel}</p>
          )}
        </div>
        {/* Edit Dashboard button - hidden for now
        {!isEditMode && (
          <button
            onClick={enterEditMode}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:border-border transition-colors shrink-0"
          >
            <HugeiconsIcon icon={PencilEdit01Icon} size={13} />
            Edit Dashboard
          </button>
        )}
        */}
      </div>
      <WidgetCanvas tasks={optimisticTasks} phrase={phrase} attribution={attribution} activityData={activityData} onStatusUpdated={handleTaskStatusUpdated} onTaskDeleted={handleTaskDeleted} onRefresh={handleRefresh} />
      <TaskDetailSheet tasks={optimisticTasks} groups={groups} tags={tags} />
    </>
  )
}
