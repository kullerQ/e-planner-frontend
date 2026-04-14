import Link from 'next/link'
import { messages } from '@/lib/messages'
import { isDevOfflineMockEnabled } from '@/lib/offline/runtime'

export default async function OfflinePage() {
  const offlineMessages = messages.offline
  const showDevHint = await isDevOfflineMockEnabled()

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <section className="max-w-md w-full bg-card border border-border/60 rounded-lg p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">{offlineMessages.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{offlineMessages.description}</p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            {offlineMessages.tryAgain}
          </Link>
        </div>
        {showDevHint ? (
          <p className="mt-4 text-sm text-muted-foreground">{offlineMessages.devModeHint}</p>
        ) : null}
      </section>
    </main>
  )
}
