import { TaskListClient } from './TaskListClient'
import { serverApiFetchJson } from '@/lib/api/server'
import { getServerMessages } from '@/lib/i18n/server'
import type { Tag, Task, TaskGroup } from '@/types'

export default async function TasksPage() {
  const t = await getServerMessages()
  let tasks: Task[]
  let groups: TaskGroup[]
  let tags: Tag[]

  try {
    ;[tasks, groups, tags] = await Promise.all([
      serverApiFetchJson<Task[]>('/tasks', { next: { tags: ['tasks'] } }),
      serverApiFetchJson<TaskGroup[]>('/groups', { next: { tags: ['groups'] } }),
      serverApiFetchJson<Tag[]>('/tags', { next: { tags: ['tags'] } }),
    ])
  } catch {
    return (
      <main className="p-6 overflow-y-auto h-full">
        <h1 className="text-2xl font-semibold text-foreground">{t.dashboard.tasks.title}</h1>
        <section className="mt-4 rounded-md border border-border/50 bg-muted/40 p-4 text-sm text-muted-foreground">
          {t.dashboard.tasks.connectionHint}
        </section>
      </main>
    )
  }

  return <TaskListClient tasks={tasks} groups={groups} tags={tags} />
}
