import { RecycleBinClient } from './RecycleBinClient'
import { backendFetchJson } from '@/lib/api/server'
import { getServerMessages } from '@/lib/i18n/server'
import type { Task } from '@/types'

export default async function RecycleBinPage() {
  const messages = await getServerMessages()

  let tasks: Task[]
  try {
    tasks = await backendFetchJson<Task[]>('/tasks?deleted=true', {
      next: { tags: ['tasks'] },
    })
  } catch {
    return (
      <main className="p-6 overflow-y-auto h-full">
        <h1 className="text-2xl font-semibold text-foreground">{messages.dashboard.recycleBin.title}</h1>
        <section className="mt-4 rounded-md border border-border/50 bg-muted/40 p-4 text-sm text-muted-foreground">
          {messages.dashboard.tasks.connectionHint}
        </section>
      </main>
    )
  }

  const deletedTasks = tasks.filter((task) => task.deletedAt !== null)
  return <RecycleBinClient tasks={deletedTasks} />
}
