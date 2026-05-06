import { AppSidebar } from '@/components/layout/AppSidebar'
import { DashboardTaskSheetHost } from '@/components/layout/DashboardTaskSheetHost'
import { getCurrentUser } from '@/actions/user'
import { serverApiFetchJson } from '@/lib/api/server'
import type { Tag, Task, TaskGroup } from '@/types'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  let tasks: Task[] = []
  let groups: TaskGroup[] = []
  let tags: Tag[] = []

  try {
    ;[tasks, groups, tags] = await Promise.all([
      serverApiFetchJson<Task[]>('/tasks', { next: { tags: ['tasks'] } }),
      serverApiFetchJson<TaskGroup[]>('/groups', { next: { tags: ['groups'] } }),
      serverApiFetchJson<Tag[]>('/tags', { next: { tags: ['tags'] } }),
    ])
  } catch {}

  const sortedGroups = [...groups].sort((a, b) => a.order - b.order)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar user={user} />
      <main className="flex-1 overflow-hidden">{children}</main>
      <div className="contents">
        <DashboardTaskSheetHost tasks={tasks} groups={sortedGroups} tags={tags} />
      </div>
    </div>
  )
}
