import { messages } from '@/lib/messages'
import { OFFLINE_USER } from '@/lib/mock/offlineUser'
import { isDevOfflineMockEnabled } from '@/lib/offline/runtime'

export default async function SettingsPage() {
  const isOfflineMock = await isDevOfflineMockEnabled()
  const user = isOfflineMock
    ? OFFLINE_USER
    : {
        name: 'Authenticated user',
        email: 'Backend profile',
      }

  return (
    <main className="space-y-6 p-6 overflow-y-auto h-full">
      <h1 className="text-2xl font-semibold text-foreground">{messages.settings.title}</h1>
      {isOfflineMock ? (
        <p className="rounded-md border border-border/50 bg-muted/40 p-3 text-sm text-muted-foreground">
          {messages.offline.devModeHint}
        </p>
      ) : null}

      <section className="rounded-lg border border-border/60 bg-card p-4">
        <h2 className="text-base font-medium text-foreground">{messages.settings.profile}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{user.name}</p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </section>

      <section className="rounded-lg border border-border/60 bg-card p-4">
        <h2 className="text-base font-medium text-foreground">{messages.settings.account}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
      </section>
    </main>
  )
}
