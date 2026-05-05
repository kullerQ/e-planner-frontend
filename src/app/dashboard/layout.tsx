import { AppSidebar } from '@/components/layout/AppSidebar'
import { getCurrentUser } from '@/actions/user'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar user={user} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
