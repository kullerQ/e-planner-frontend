'use server'

import { cache } from 'react'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { serverApiFetch } from '@/lib/api/server'
import { getServerMessages } from '@/lib/i18n/server'
import { buildValidationSchemas } from '@/lib/validation'
import type { TaskPriority, TaskStatus } from '@/types'

const updateStatusSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'delayed', 'completed']),
})

const taskStatusSchema = z.enum(['todo', 'in_progress', 'delayed', 'completed'])
const taskPrioritySchema = z.enum(['critical', 'high', 'medium', 'low', 'none'])
const taskIdSchema = z.string().min(1, 'Task id is required')
const dueDateSchema = z.string().datetime().nullable()
const groupIdSchema = z.string().min(1).nullable()
const notesSchema = z.string().max(50_000).nullable()
const bulkTaskIdsSchema = z.array(taskIdSchema).min(1, 'At least one task id is required')

const getTaskActionSchemas = cache(async () => {
  const { tagNameSchema, taskTitleSchema, colorHexSchema } = buildValidationSchemas(
    (await getServerMessages()).validation
  )
  const tagIdsSchema = z.array(tagNameSchema.or(z.string().min(1))).max(50)
  const createTaskSchema = z.object({
    title: taskTitleSchema,
    status: taskStatusSchema.default('todo'),
    priority: taskPrioritySchema.default('medium'),
    dueDate: dueDateSchema.optional(),
    groupId: groupIdSchema.optional(),
    tagIds: tagIdsSchema.optional(),
    notes: notesSchema.optional(),
    colorHex: colorHexSchema.optional(),
  })
  const updateTaskSchema = z.object({
    title: taskTitleSchema.optional(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    dueDate: dueDateSchema.optional(),
    groupId: groupIdSchema.optional(),
    tagIds: tagIdsSchema.optional(),
    notes: notesSchema.optional(),
    colorHex: colorHexSchema.optional(),
  })
  const updateTaskFieldSchema = z.discriminatedUnion('field', [
    z.object({ field: z.literal('title'), value: taskTitleSchema }),
    z.object({ field: z.literal('status'), value: taskStatusSchema }),
    z.object({ field: z.literal('priority'), value: taskPrioritySchema }),
    z.object({ field: z.literal('dueDate'), value: dueDateSchema }),
    z.object({ field: z.literal('groupId'), value: groupIdSchema }),
    z.object({ field: z.literal('tagIds'), value: tagIdsSchema }),
    z.object({ field: z.literal('notes'), value: notesSchema }),
    z.object({ field: z.literal('colorHex'), value: colorHexSchema }),
  ])
  const bulkGroupSchema = z.object({
    taskIds: bulkTaskIdsSchema,
    groupId: groupIdSchema,
  })
  const bulkPrioritySchema = z.object({
    taskIds: bulkTaskIdsSchema,
    priority: taskPrioritySchema,
  })
  const bulkTagsSchema = z.object({
    taskIds: bulkTaskIdsSchema,
    tagIds: z.array(z.string().min(1)).max(50),
  })
  const bulkDeleteSchema = z.object({
    taskIds: bulkTaskIdsSchema,
  })

  return {
    createTaskSchema,
    updateTaskSchema,
    updateTaskFieldSchema,
    bulkGroupSchema,
    bulkPrioritySchema,
    bulkTagsSchema,
    bulkDeleteSchema,
  }
})

async function assertResponse(res: Response, action: string): Promise<void> {
  if (!res.ok) {
    throw new Error(`Failed to ${action}`)
  }
}

function revalidateTaskTags(taskId: string): void {
  revalidateTag(`task-${taskId}`, 'max')
  revalidateTag('tasks', 'max')
}

export async function updateTaskStatus(taskId: string, rawData: unknown): Promise<void> {
  const parsedTaskId = taskIdSchema.safeParse(taskId)
  if (!parsedTaskId.success) {
    throw new Error('Invalid task id')
  }

  const parsed = updateStatusSchema.safeParse(rawData)
  if (!parsed.success) {
    throw new Error('Invalid status value')
  }

  const res = await serverApiFetch(`/tasks/${parsedTaskId.data}`, {
    method: 'PATCH',
    body: parsed.data,
  })
  await assertResponse(res, 'update task status')
  revalidateTaskTags(parsedTaskId.data)
}

export async function createTask(rawData: unknown): Promise<void> {
  const { createTaskSchema } = await getTaskActionSchemas()
  const parsed = createTaskSchema.safeParse(rawData)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid task data')
  }

  const payload = {
    title: parsed.data.title,
    status: parsed.data.status as TaskStatus,
    priority: parsed.data.priority as TaskPriority,
    dueDate: parsed.data.dueDate ?? null,
    groupId: parsed.data.groupId ?? null,
    tagIds: parsed.data.tagIds ?? [],
    notes: parsed.data.notes ?? null,
    ...(parsed.data.colorHex !== undefined ? { colorHex: parsed.data.colorHex } : {}),
  }

  const res = await serverApiFetch('/tasks', {
    method: 'POST',
    body: payload,
  })
  await assertResponse(res, 'create task')

  revalidateTag('tasks', 'max')
}

export async function updateTask(taskId: string, rawData: unknown): Promise<void> {
  const parsedTaskId = taskIdSchema.safeParse(taskId)
  if (!parsedTaskId.success) {
    throw new Error('Invalid task id')
  }

  const { updateTaskSchema } = await getTaskActionSchemas()
  const parsed = updateTaskSchema.safeParse(rawData)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid task update payload')
  }

  const res = await serverApiFetch(`/tasks/${parsedTaskId.data}`, {
    method: 'PATCH',
    body: parsed.data,
  })
  await assertResponse(res, 'update task')
  revalidateTaskTags(parsedTaskId.data)
}

export async function updateTaskField(taskId: string, field: string, value: unknown): Promise<void> {
  const parsedTaskId = taskIdSchema.safeParse(taskId)
  if (!parsedTaskId.success) {
    throw new Error('Invalid task id')
  }

  const { updateTaskFieldSchema } = await getTaskActionSchemas()
  const parsed = updateTaskFieldSchema.safeParse({ field, value })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid task field update')
  }

  const payload = {
    [parsed.data.field]: parsed.data.value,
  }
  const res = await serverApiFetch(`/tasks/${parsedTaskId.data}`, {
    method: 'PATCH',
    body: payload,
  })
  await assertResponse(res, `update task ${parsed.data.field}`)
  revalidateTaskTags(parsedTaskId.data)
}

export async function softDeleteTask(taskId: string): Promise<void> {
  const parsedTaskId = taskIdSchema.safeParse(taskId)
  if (!parsedTaskId.success) {
    throw new Error('Invalid task id')
  }

  const res = await serverApiFetch(`/tasks/${parsedTaskId.data}`, {
    method: 'DELETE',
  })
  await assertResponse(res, 'soft delete task')
  revalidateTaskTags(parsedTaskId.data)
}

export async function bulkMoveToGroup(taskIds: string[], groupId: string | null): Promise<void> {
  const { bulkGroupSchema } = await getTaskActionSchemas()
  const parsed = bulkGroupSchema.safeParse({ taskIds, groupId })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid bulk move payload')
  }

  const res = await serverApiFetch('/tasks/bulk/group', {
    method: 'PATCH',
    body: parsed.data,
  })
  await assertResponse(res, 'bulk move tasks to group')
  revalidateTag('tasks', 'max')
}

export async function bulkSetPriority(taskIds: string[], priority: TaskPriority): Promise<void> {
  const { bulkPrioritySchema } = await getTaskActionSchemas()
  const parsed = bulkPrioritySchema.safeParse({ taskIds, priority })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid bulk priority payload')
  }

  const res = await serverApiFetch('/tasks/bulk/priority', {
    method: 'PATCH',
    body: parsed.data,
  })
  await assertResponse(res, 'bulk set task priority')
  revalidateTag('tasks', 'max')
}

export async function bulkAddTags(taskIds: string[], tagIds: string[]): Promise<void> {
  const { bulkTagsSchema } = await getTaskActionSchemas()
  const parsed = bulkTagsSchema.safeParse({ taskIds, tagIds })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid bulk tags payload')
  }

  const res = await serverApiFetch('/tasks/bulk/tags', {
    method: 'POST',
    body: parsed.data,
  })
  await assertResponse(res, 'bulk add tags')
  revalidateTag('tasks', 'max')
}

export async function bulkSoftDelete(taskIds: string[]): Promise<void> {
  const { bulkDeleteSchema } = await getTaskActionSchemas()
  const parsed = bulkDeleteSchema.safeParse({ taskIds })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid bulk delete payload')
  }

  const res = await serverApiFetch('/tasks/bulk/delete', {
    method: 'POST',
    body: parsed.data,
  })
  await assertResponse(res, 'bulk soft delete tasks')
  revalidateTag('tasks', 'max')
}
