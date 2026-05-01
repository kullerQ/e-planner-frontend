import { TaskListClient } from './TaskListClient'
import { messages } from '@/lib/messages'
import type { Task, TaskGroup } from '@/types'

async function fetchJson<T>(url: string, tag: string): Promise<T> {
  const response = await fetch(url, {
    next: { tags: [tag] },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch ${tag}`)
  }

  return response.json() as Promise<T>
}

export default async function TasksPage() {
  try {
    const apiUrl = process.env['API_URL']
    if (!apiUrl) {
      throw new Error('API_URL is not configured')
    }

    const [tasks, groups] = await Promise.all([
      fetchJson<Task[]>(`${apiUrl}/tasks`, 'tasks'),
      fetchJson<TaskGroup[]>(`${apiUrl}/groups`, 'groups'),
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
