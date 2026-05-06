function getClientApiBaseUrl(): string {
  const apiUrl = process.env['NEXT_PUBLIC_API_URL']
  if (!apiUrl || apiUrl.trim().length === 0) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured')
  }
  return apiUrl.replace(/\/$/, '')
}

export async function clientApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getClientApiBaseUrl()
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    credentials: 'include',
  })
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export { createTag, deleteTag, getTags, renameTag } from './tags'
