import { apiFetch } from '@/lib/api'
import type { Tag } from '@/types'

interface CreateTagPayload {
  name: string
}

interface RenameTagPayload {
  name: string
}

export function getTags(): Promise<Tag[]> {
  return apiFetch<Tag[]>('/tags')
}

export function createTag(payload: CreateTagPayload): Promise<Tag> {
  return apiFetch<Tag>('/tags', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function renameTag(tagId: string, payload: RenameTagPayload): Promise<Tag> {
  return apiFetch<Tag>(`/tags/${tagId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteTag(tagId: string): Promise<void> {
  return apiFetch<void>(`/tags/${tagId}`, {
    method: 'DELETE',
  })
}
