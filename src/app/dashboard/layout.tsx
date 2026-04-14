import Link from 'next/link'
import { messages } from '@/lib/messages'
import { OFFLINE_USER } from '@/lib/mock/offlineUser'
import { isDevOfflineMockEnabled } from '@/lib/offline/runtime'

const DASHBOARD_NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/tasks', label: 'Tasks' },
  { href: '/dashboard/calendar', label: 'Calendar' },
  { href: '/dashboard/folders', label: 'Folders' },
  { href: '/dashboard/recycle-bin', label: 'Recycle Bin' },
  { href: '/dashboard/settings', label: 'Settings' },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isOfflineMock = await isDevOfflineMockEnabled()
  const userName = isOfflineMock ? OFFLINE_USER.name : 'Authenticated user'
  const userEmail = isOfflineMock ? OFFLINE_USER.email : 'Backend profile'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-card/90">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-lg font-semibold">{messages.dashboard.welcome}</p>
            <p className="text-sm text-muted-foreground">
              {userName} · {userEmail}
            </p>
          </div>
          {isOfflineMock ? (
            <p className="rounded-md border border-border/50 bg-muted/40 px-3 py-1 text-sm text-muted-foreground">
              {messages.offline.devModeHint}
            </p>
          ) : null}
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-6 md:grid-cols-[220px_1fr]">
        <aside className="rounded-lg border border-border/60 bg-card p-3">
          <nav className="flex flex-col gap-1">
            {DASHBOARD_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div>{children}</div>
      </div>
    </div>
  )
}
