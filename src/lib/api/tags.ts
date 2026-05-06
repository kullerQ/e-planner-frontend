import { clientApiFetch } from '@/lib/api'
import type { Tag } from '@/types'

interface CreateTagPayload {
  name: string
}

interface RenameTagPayload {
  name: string
}

export function getTags(): Promise<Tag[]> {
  return clientApiFetch<Tag[]>('/tags')
}

export function createTag(payload: CreateTagPayload): Promise<Tag> {
  return clientApiFetch<Tag>('/tags', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function renameTag(tagId: string, payload: RenameTagPayload): Promise<Tag> {
  return clientApiFetch<Tag>(`/tags/${tagId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteTag(tagId: string): Promise<void> {
  return clientApiFetch<void>(`/tags/${tagId}`, {
    method: 'DELETE',
  })
}
