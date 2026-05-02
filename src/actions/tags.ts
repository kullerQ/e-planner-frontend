'use server'

import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { backendFetch, backendFetchJson } from '@/lib/api/server'
import { tagNameSchema } from '@/lib/validation'
import type { Tag } from '@/types'

const tagIdSchema = z.string().min(1, 'Tag id is required')

const createTagSchema = z.object({
  name: tagNameSchema,
})

const renameTagSchema = z.object({
  id: tagIdSchema,
  name: tagNameSchema,
})

async function assertResponse(response: Response, action: string): Promise<void> {
  if (!response.ok) {
    throw new Error(`Failed to ${action}`)
  }
}

function revalidateTagCaches(): void {
  revalidateTag('tags', 'max')
  revalidateTag('tasks', 'max')
}

export async function getTags(): Promise<Tag[]> {
  return backendFetchJson<Tag[]>('/tags', {
    next: { tags: ['tags'] },
  })
}

export async function createTag(rawData: unknown): Promise<Tag> {
  const parsed = createTagSchema.safeParse(rawData)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid tag name')
  }

  const response = await backendFetch('/tags', {
    method: 'POST',
    body: parsed.data,
  })
  await assertResponse(response, 'create tag')
  const createdTag = (await response.json()) as Tag
  revalidateTagCaches()
  return createdTag
}

export async function renameTag(rawData: unknown): Promise<Tag> {
  const parsed = renameTagSchema.safeParse(rawData)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid tag update payload')
  }

  const response = await backendFetch(`/tags/${parsed.data.id}`, {
    method: 'PATCH',
    body: { name: parsed.data.name },
  })
  await assertResponse(response, 'rename tag')
  const updatedTag = (await response.json()) as Tag
  revalidateTagCaches()
  return updatedTag
}

export async function deleteTag(rawTagId: unknown): Promise<void> {
  const parsedTagId = tagIdSchema.safeParse(rawTagId)
  if (!parsedTagId.success) {
    throw new Error('Invalid tag id')
  }

  const response = await backendFetch(`/tags/${parsedTagId.data}`, {
    method: 'DELETE',
  })
  await assertResponse(response, 'delete tag')
  revalidateTagCaches()
}
