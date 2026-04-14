import { messages } from '@/lib/messages'
import { OFFLINE_RECYCLE_BIN_PLACEHOLDER } from '@/lib/mock/offlineContent'
import { isDevOfflineMockEnabled } from '@/lib/offline/runtime'

export default async function RecycleBinPage() {
  const isOfflineMock = await isDevOfflineMockEnabled()

  return (
    <main className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold text-foreground">Recycle Bin</h1>
      {isOfflineMock ? (
        <section className="rounded-md border border-border/50 bg-muted/40 p-4 text-sm text-muted-foreground">
          {OFFLINE_RECYCLE_BIN_PLACEHOLDER.items.length === 0
            ? messages.dashboard.offline.recycleBin
            : null}
        </section>
      ) : (
        <section className="rounded-md border border-border/50 bg-muted/40 p-4 text-sm text-muted-foreground">
          Deleted tasks are loaded from backend.
        </section>
      )}
    </main>
  )
}
