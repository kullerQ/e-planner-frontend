'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { WidgetCanvas } from '@/components/dashboard/WidgetCanvas'
import { useI18n } from '@/lib/messages'
import type { Task } from '@/types'
import type { ActivityEntry } from '@/app/dashboard/page'

interface DashboardClientProps {
  tasks: Task[]
  phrase: string
  attribution: string | undefined
  activityData: ActivityEntry[]
}

function formatGreetingDate(locale: string): string {
  return new Date().toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function DashboardClient({ tasks, phrase, attribution, activityData }: DashboardClientProps) {
  const { t, locale } = useI18n()
  const router = useRouter()

  const [dateLabel, setDateLabel] = useState<string>('')
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks)

  useEffect(() => {
    setOptimisticTasks(tasks)
  }, [tasks])

  useEffect(() => {
    setDateLabel(formatGreetingDate(locale))
  }, [locale])

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
            {t.dashboard.title}
          </h1>
          {dateLabel && (
            <p className="text-xs text-muted-foreground">{dateLabel}</p>
          )}
        </div>
      </div>
      <WidgetCanvas tasks={optimisticTasks} phrase={phrase} attribution={attribution} activityData={activityData} onStatusUpdated={handleTaskStatusUpdated} onTaskDeleted={handleTaskDeleted} onRefresh={handleRefresh} />
    </>
  )
}
