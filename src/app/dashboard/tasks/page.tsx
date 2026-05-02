import { TaskListClient } from './TaskListClient'
import { backendFetchJson } from '@/lib/api/server'
import { messages } from '@/lib/messages'
import type { Task, TaskGroup } from '@/types'

export default async function TasksPage() {
  try {
    const [tasks, groups] = await Promise.all([
      backendFetchJson<Task[]>('/tasks', { next: { tags: ['tasks'] } }),
      backendFetchJson<TaskGroup[]>('/groups', { next: { tags: ['groups'] } }),
    ])

    return <TaskListClient tasks={tasks} groups={groups} />
  } catch {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold text-foreground">{messages.dashboard.tasks.title}</h1>
        <section className="mt-4 rounded-md border border-border/50 bg-muted/40 p-4 text-sm text-muted-foreground">
          {messages.dashboard.tasks.connectionHint}
        </section>
      </main>
    )
  }
}
