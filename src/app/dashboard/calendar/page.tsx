import { backendFetchJson } from '@/lib/api/server'
import { CalendarClient } from './CalendarClient'
import type { Tag, Task, TaskGroup } from '@/types'

export default async function CalendarPage() {
  let tasks: Task[]
  let groups: TaskGroup[]
  let tags: Tag[]

  try {
    ;[tasks, groups, tags] = await Promise.all([
      backendFetchJson<Task[]>('/tasks', { next: { tags: ['tasks'] } }),
      backendFetchJson<TaskGroup[]>('/groups', { next: { tags: ['groups'] } }),
      backendFetchJson<Tag[]>('/tags', { next: { tags: ['tags'] } }),
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

  return <CalendarClient initialTasks={tasks} initialGroups={groups} tags={tags} />
}
