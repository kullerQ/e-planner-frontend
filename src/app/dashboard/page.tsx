import { messages } from '@/lib/messages'
import { OFFLINE_DAILY_PHRASE } from '@/lib/mock/offlineContent'
import { isDevOfflineMockEnabled } from '@/lib/offline/runtime'

export default async function DashboardPage() {
  const isOfflineMock = await isDevOfflineMockEnabled()
  const offlineMessages = messages.dashboard.offline

  return (
    <main className="space-y-6 p-6 overflow-y-auto h-full">
      <h1 className="text-2xl font-semibold text-foreground">{messages.dashboard.title}</h1>
      <section
        className="grid gap-4"
        style={{
          gridTemplateColumns: 'repeat(12, 1fr)',
        }}
      >
        <article className="col-span-12 rounded-lg border border-border/60 bg-card p-4 md:col-span-6">
          <h2 className="text-base font-medium text-foreground">Today&apos;s Tasks</h2>
          <p className="mt-2 rounded-md border border-border/50 bg-muted/40 p-3 text-sm text-muted-foreground">
            {isOfflineMock ? offlineMessages.todaysTasksWidget : 'Task metrics are available online.'}
          </p>
        </article>

        <article className="col-span-12 rounded-lg border border-border/60 bg-card p-4 md:col-span-6">
          <h2 className="text-base font-medium text-foreground">Activity Graph</h2>
          <p className="mt-2 rounded-md border border-border/50 bg-muted/40 p-3 text-sm text-muted-foreground">
            {isOfflineMock ? offlineMessages.activityWidget : 'Activity analytics are available online.'}
          </p>
        </article>

        <article className="col-span-12 rounded-lg border border-border/60 bg-card p-4">
          <h2 className="text-base font-medium text-foreground">Daily Phrase</h2>
          <p className="mt-2 rounded-md border border-border/50 bg-muted/40 p-3 text-sm text-muted-foreground">
            {isOfflineMock
              ? `${offlineMessages.dailyPhraseWidget}: ${OFFLINE_DAILY_PHRASE.text}`
              : 'Daily phrase is loaded from backend.'}
          </p>
        </article>
      </section>
    </main>
  )
}
