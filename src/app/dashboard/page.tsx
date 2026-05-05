import { backendFetchJson } from '@/lib/api/server'
import { isDevOfflineMockEnabled } from '@/lib/offline/runtime'
import { OFFLINE_DAILY_PHRASE } from '@/lib/mock/offlineContent'
import type { Task, TaskGroup, Tag } from '@/types'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

export interface ActivityEntry {
  date: string
  count: number
}

interface DailyPhraseResponse {
  text: string
  attribution?: string | undefined
}

async function fetchTasks(): Promise<Task[]> {
  try {
    return await backendFetchJson<Task[]>('/tasks')
  } catch {
    return []
  }
}

async function fetchGroups(): Promise<TaskGroup[]> {
  try {
    return await backendFetchJson<TaskGroup[]>('/groups')
  } catch {
    return []
  }
}

async function fetchTags(): Promise<Tag[]> {
  try {
    return await backendFetchJson<Tag[]>('/tags')
  } catch {
    return []
  }
}

async function fetchActivity(): Promise<ActivityEntry[]> {
  try {
    return await backendFetchJson<ActivityEntry[]>('/activity')
  } catch {
    return []
  }
}

async function fetchDailyPhrase(): Promise<DailyPhraseResponse | null> {
  try {
    return await backendFetchJson<DailyPhraseResponse>('/daily-phrase')
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  const isOfflineMock = await isDevOfflineMockEnabled()

  const [tasks, groups, tags, phraseData, activityData] = await Promise.all([
    isOfflineMock ? [] : fetchTasks(),
    isOfflineMock ? [] : fetchGroups(),
    isOfflineMock ? [] : fetchTags(),
    isOfflineMock
      ? { text: OFFLINE_DAILY_PHRASE.text, attribution: undefined }
      : (await fetchDailyPhrase()) ?? { text: OFFLINE_DAILY_PHRASE.text, attribution: undefined },
    isOfflineMock ? [] : fetchActivity(),
  ])

  return (
    <main className="flex flex-col h-full overflow-y-auto">
      <DashboardClient
        tasks={tasks}
        groups={groups}
        tags={tags}
        phrase={phraseData.text}
        attribution={phraseData.attribution}
        activityData={activityData}
      />
    </main>
  )
}
