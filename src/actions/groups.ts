'use server'

import { cache } from 'react'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { backendFetch } from '@/lib/api/server'
import { getServerMessages } from '@/lib/i18n/server'
import { buildValidationSchemas } from '@/lib/validation'
import type { TaskGroup } from '@/types'

const groupIdSchema = z.string().min(1, 'Group id is required')

const reorderGroupsSchema = z.array(z.string().min(1))

const getGroupFieldSchemas = cache(async () =>
  buildValidationSchemas((await getServerMessages()).validation)
)

async function assertResponse(res: Response, action: string): Promise<void> {
  if (!res.ok) {
    throw new Error(`Failed to ${action}`)
  }
}

export async function createGroup(rawData: unknown): Promise<TaskGroup> {
  const { groupNameSchema, colorHexSchema } = await getGroupFieldSchemas()
  const createGroupSchema = z.object({
    name: groupNameSchema,
    colorHex: colorHexSchema,
  })
  const parsed = createGroupSchema.safeParse(rawData)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid group data')
  }

  const res = await backendFetch('/groups', {
    method: 'POST',
    body: parsed.data,
  })
  await assertResponse(res, 'create group')

  revalidateTag('groups', 'max')

  const group = (await res.json()) as TaskGroup
  return group
}

export async function renameGroup(groupId: string, name: string): Promise<void> {
  const parsedGroupId = groupIdSchema.safeParse(groupId)
  if (!parsedGroupId.success) {
    throw new Error('Invalid group id')
  }

  const { groupNameSchema } = await getGroupFieldSchemas()
  const parsedName = groupNameSchema.safeParse(name)
  if (!parsedName.success) {
    throw new Error(parsedName.error.issues[0]?.message ?? 'Invalid group name')
  }

  const res = await backendFetch(`/groups/${parsedGroupId.data}`, {
    method: 'PATCH',
    body: { name: parsedName.data },
  })
  await assertResponse(res, 'rename group')

  revalidateTag('groups', 'max')
}

export async function updateGroupColor(groupId: string, colorHex: string): Promise<void> {
  const parsedGroupId = groupIdSchema.safeParse(groupId)
  if (!parsedGroupId.success) {
    throw new Error('Invalid group id')
  }

  const { colorHexSchema } = await getGroupFieldSchemas()
  const parsedColor = colorHexSchema.safeParse(colorHex)
  if (!parsedColor.success) {
    throw new Error('Invalid color value')
  }

  const res = await backendFetch(`/groups/${parsedGroupId.data}`, {
    method: 'PATCH',
    body: { colorHex: parsedColor.data },
  })
  await assertResponse(res, 'update group color')

  revalidateTag('groups', 'max')
  revalidateTag('tasks', 'max')
}

export async function deleteGroupAndUngroup(groupId: string): Promise<void> {
  const parsedGroupId = groupIdSchema.safeParse(groupId)
  if (!parsedGroupId.success) {
    throw new Error('Invalid group id')
  }

  const res = await backendFetch(`/groups/${parsedGroupId.data}?strategy=ungroup`, {
    method: 'DELETE',
  })
  await assertResponse(res, 'delete group and ungroup tasks')

  revalidateTag('groups', 'max')
  revalidateTag('tasks', 'max')
}

export async function deleteGroupWithTasks(groupId: string): Promise<void> {
  const parsedGroupId = groupIdSchema.safeParse(groupId)
  if (!parsedGroupId.success) {
    throw new Error('Invalid group id')
  }

  const res = await backendFetch(`/groups/${parsedGroupId.data}?strategy=delete_tasks`, {
    method: 'DELETE',
  })
  await assertResponse(res, 'delete group and tasks')

  revalidateTag('groups', 'max')
  revalidateTag('tasks', 'max')
}

export async function reorderGroups(orderedIds: string[]): Promise<void> {
  const parsed = reorderGroupsSchema.safeParse(orderedIds)
  if (!parsed.success) {
    throw new Error('Invalid ordered ids')
  }

  const res = await backendFetch('/groups/batch/reorder', {
    method: 'PATCH',
    body: { orderedIds: parsed.data },
  })
  await assertResponse(res, 'reorder groups')

  revalidateTag('groups', 'max')
}
