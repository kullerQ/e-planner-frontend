import { messages } from '@/lib/messages'
import { OFFLINE_CALENDAR_PLACEHOLDER } from '@/lib/mock/offlineContent'
import { isDevOfflineMockEnabled } from '@/lib/offline/runtime'

export default async function CalendarPage() {
  const isOfflineMock = await isDevOfflineMockEnabled()

  return (
    <main className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold text-foreground">Calendar</h1>
      {isOfflineMock ? (
        <section className="rounded-md border border-border/50 bg-muted/40 p-4 text-sm text-muted-foreground">
          {OFFLINE_CALENDAR_PLACEHOLDER.items.length === 0 ? messages.dashboard.offline.calendar : null}
        </section>
      ) : (
        <section className="rounded-md border border-border/50 bg-muted/40 p-4 text-sm text-muted-foreground">
          Calendar data is connected to backend events.
        </section>
      )}
    </main>
  )
}
