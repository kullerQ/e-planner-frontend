import { messages } from '@/lib/messages'
import { OFFLINE_TASKS_PLACEHOLDER } from '@/lib/mock/offlineContent'
import { isDevOfflineMockEnabled } from '@/lib/offline/runtime'

export default async function TasksPage() {
  const isOfflineMock = await isDevOfflineMockEnabled()

  return (
    <main className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold text-foreground">Tasks</h1>
      {isOfflineMock ? (
        <section className="rounded-md border border-border/50 bg-muted/40 p-4 text-sm text-muted-foreground">
          {OFFLINE_TASKS_PLACEHOLDER.items.length === 0 ? messages.dashboard.offline.tasks : null}
        </section>
      ) : (
        <section className="rounded-md border border-border/50 bg-muted/40 p-4 text-sm text-muted-foreground">
          Tasks list is connected to backend data.
        </section>
      )}
    </main>
  )
}
