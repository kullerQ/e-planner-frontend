import { getServerMessages } from '@/lib/i18n/server'
import { OFFLINE_USER } from '@/lib/mock/offlineUser'
import { isDevOfflineMockEnabled } from '@/lib/offline/runtime'
import { serverApiFetch } from '@/lib/api/server'
import { SettingsTabs } from './SettingsTabs'
import type { User } from '@/types'

async function getUser(): Promise<User | null> {
  try {
    const res = await serverApiFetch('/users/me')
    if (!res.ok) return null
    return await res.json() as User
  } catch {
    return null
  }
}

export default async function SettingsPage() {
  const t = await getServerMessages()
  const isOfflineMock = await isDevOfflineMockEnabled()
  const user = isOfflineMock
    ? OFFLINE_USER
    : await getUser()

  if (!user) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold text-foreground">{t.settings.title}</h1>
        <p className="mt-4 text-muted-foreground">{t.settings.profileLoadError}</p>
      </main>
    )
  }

  return (
    <main className="h-full overflow-y-auto">
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-foreground mb-6">{t.settings.title}</h1>

        {isOfflineMock ? (
          <p className="rounded-md border border-border/50 bg-muted/40 p-3 text-sm text-muted-foreground mb-6">
            {t.offline.devModeHint}
          </p>
        ) : null}
      </div>

      <SettingsTabs user={user} />
    </main>
  )
}
