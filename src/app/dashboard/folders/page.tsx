import { FolderCanvas } from '@/components/folders/FolderCanvas'
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet'
import { backendFetchJson } from '@/lib/api/server'
import { messages } from '@/lib/messages'
import { isDevOfflineMockEnabled } from '@/lib/offline/runtime'
import type { Tag, Task, TaskGroup } from '@/types'

export default async function FoldersPage() {
  const isOfflineMock = await isDevOfflineMockEnabled()

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
        <h1 className="text-2xl font-semibold text-foreground">{messages.dashboard.folders.title}</h1>
        <section className="mt-4 rounded-md border border-border/50 bg-muted/40 p-4 text-sm text-muted-foreground">
          {isOfflineMock
            ? messages.dashboard.offline.folders
            : 'Unable to load folders. Please check your connection.'}
        </section>
      </main>
    )
  }

  // Sort groups by order
  const sortedGroups = [...groups].sort((a, b) => a.order - b.order)

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold text-foreground">{messages.dashboard.folders.title}</h1>
      <section className="mt-4">
        <FolderCanvas groups={sortedGroups} tasks={tasks} />
      </section>
      <TaskDetailSheet tasks={tasks} groups={sortedGroups} tags={tags} />
    </main>
  )
}
