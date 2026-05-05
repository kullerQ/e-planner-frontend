import { backendFetchJson } from '@/lib/api/server'
import { getServerMessages } from '@/lib/i18n/server'
import { isDevOfflineMockEnabled } from '@/lib/offline/runtime'
import type { Task } from '@/types'
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
  const serverMessages = await getServerMessages()
  const phraseFallback = serverMessages.offline.fallbackDailyPhrase

  const [tasks, phraseData, activityData] = await Promise.all([
    isOfflineMock ? [] : fetchTasks(),
    isOfflineMock
      ? { text: phraseFallback, attribution: undefined }
      : (await fetchDailyPhrase()) ?? { text: phraseFallback, attribution: undefined },
    isOfflineMock ? [] : fetchActivity(),
  ])

  return (
    <main className="flex flex-col h-full overflow-y-auto">
      <DashboardClient
        tasks={tasks}
        phrase={phraseData.text}
        attribution={phraseData.attribution}
        activityData={activityData}
      />
    </main>
  )
}
