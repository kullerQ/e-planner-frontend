import { backendFetchJson } from '@/lib/api/server'
import { CalendarClient } from './CalendarClient'
import type { Task, TaskGroup } from '@/types'

export default async function CalendarPage() {
  let tasks: Task[]
  let groups: TaskGroup[]

  try {
    ;[tasks, groups] = await Promise.all([
      backendFetchJson<Task[]>('/tasks', { next: { tags: ['tasks'] } }),
      backendFetchJson<TaskGroup[]>('/groups', { next: { tags: ['groups'] } }),
    ])
  } catch {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold text-foreground">Calendar</h1>
        <section className="mt-4 rounded-md border border-border/50 bg-muted/40 p-4 text-sm text-muted-foreground">
          Unable to load calendar data. Please check your connection and try again.
        </section>
      </main>
    )
  }

  return <CalendarClient initialTasks={tasks} initialGroups={groups} />
}
