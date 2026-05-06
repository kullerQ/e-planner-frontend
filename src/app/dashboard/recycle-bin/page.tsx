import { RecycleBinClient } from './RecycleBinClient'
import { serverApiFetchJson } from '@/lib/api/server'
import { getServerMessages } from '@/lib/i18n/server'
import type { Task } from '@/types'

export default async function RecycleBinPage() {
  const t = await getServerMessages()

  let tasks: Task[]
  try {
    tasks = await serverApiFetchJson<Task[]>('/tasks?deleted=true', {
      next: { tags: ['tasks'] },
    })
  } catch {
    return (
      <main className="p-6 overflow-y-auto h-full">
        <h1 className="text-2xl font-semibold text-foreground">{t.dashboard.recycleBin.title}</h1>
        <section className="mt-4 rounded-md border border-border/50 bg-muted/40 p-4 text-sm text-muted-foreground">
          {t.dashboard.tasks.connectionHint}
        </section>
      </main>
    )
  }

  const deletedTasks = tasks.filter((task) => task.deletedAt !== null)
  return <RecycleBinClient tasks={deletedTasks} />
}
