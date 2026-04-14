import { messages } from '@/lib/messages'
import { OFFLINE_FOLDERS_PLACEHOLDER } from '@/lib/mock/offlineContent'
import { isDevOfflineMockEnabled } from '@/lib/offline/runtime'

export default async function FoldersPage() {
  const isOfflineMock = await isDevOfflineMockEnabled()

  return (
    <main className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold text-foreground">Folders</h1>
      {isOfflineMock ? (
        <section className="rounded-md border border-border/50 bg-muted/40 p-4 text-sm text-muted-foreground">
          {OFFLINE_FOLDERS_PLACEHOLDER.items.length === 0 ? messages.dashboard.offline.folders : null}
        </section>
      ) : (
        <section className="rounded-md border border-border/50 bg-muted/40 p-4 text-sm text-muted-foreground">
          Folder data is connected to backend groups.
        </section>
      )}
    </main>
  )
}
