import { FolderCanvas } from '@/components/folders/FolderCanvas'
import { backendFetchJson } from '@/lib/api/server'
import { getServerMessages } from '@/lib/i18n/server'
import { isDevOfflineMockEnabled } from '@/lib/offline/runtime'
import type { Task, TaskGroup } from '@/types'

export default async function FoldersPage() {
  const messages = await getServerMessages()
  const isOfflineMock = await isDevOfflineMockEnabled()

  let tasks: Task[]
  let groups: TaskGroup[]

  try {
    ;[tasks, groups] = await Promise.all([
      backendFetchJson<Task[]>('/tasks', { next: { tags: ['tasks'] } }),
      backendFetchJson<TaskGroup[]>('/groups', { next: { tags: ['groups'] } }),
    ])
  } catch {
    return (
      <main className="p-6 overflow-y-auto h-full">
        <h1 className="text-2xl font-semibold text-foreground">{messages.dashboard.folders.title}</h1>
        <section className="mt-4 rounded-md border border-border/50 bg-muted/40 p-4 text-sm text-muted-foreground">
          {isOfflineMock
            ? messages.dashboard.offline.folders
            : messages.dashboard.folders.foldersLoadError}
        </section>
      </main>
    )
  }

  // Sort groups by order
  const sortedGroups = [...groups].sort((a, b) => a.order - b.order)

  return (
    <main className="p-6 overflow-y-auto h-full">
      <h1 className="text-2xl font-semibold text-foreground">{messages.dashboard.folders.title}</h1>
      <section className="mt-4 h-[calc(100%-3rem)]">
        <FolderCanvas groups={sortedGroups} tasks={tasks} />
      </section>
    </main>
  )
}
