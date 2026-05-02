'use server'

import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { backendFetch } from '@/lib/api/server'
import { colorHexSchema, groupNameSchema } from '@/lib/validation'
import { randomGroupColor } from '@/lib/utils'
import type { TaskGroup } from '@/types'

const groupIdSchema = z.string().min(1, 'Group id is required')

const createGroupSchema = z.object({
  name: groupNameSchema,
  colorHex: colorHexSchema,
})

const reorderGroupsSchema = z.array(z.string().min(1))

async function assertResponse(res: Response, action: string): Promise<void> {
  if (!res.ok) {
    throw new Error(`Failed to ${action}`)
  }
}

export async function createGroup(rawData: unknown): Promise<TaskGroup> {
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

  const res = await backendFetch(`/groups/${parsedGroupId.data}?disposition=ungroup`, {
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

  const res = await backendFetch(`/groups/${parsedGroupId.data}?disposition=delete`, {
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

  const res = await backendFetch('/groups/reorder', {
    method: 'POST',
    body: { orderedIds: parsed.data },
  })
  await assertResponse(res, 'reorder groups')

  revalidateTag('groups', 'max')
}
