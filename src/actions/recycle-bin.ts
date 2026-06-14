'use server'

import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { serverApiFetch } from '@/lib/api/server'

const taskIdSchema = z.string().min(1, 'Task id is required')
const taskIdsSchema = z.array(taskIdSchema).min(1, 'At least one task id is required')

async function assertResponse(res: Response, action: string): Promise<void> {
  if (!res.ok) {
    throw new Error(`Failed to ${action}`)
  }
}

export async function restoreTask(taskId: string): Promise<void> {
  const parsedTaskId = taskIdSchema.safeParse(taskId)
  if (!parsedTaskId.success) {
    throw new Error('Invalid task id')
  }

  const res = await serverApiFetch(`/tasks/${parsedTaskId.data}/restore`, {
    method: 'POST',
  })
  await assertResponse(res, 'restore task')

  revalidateTag(`task-${parsedTaskId.data}`, 'max')
  revalidateTag('tasks', 'max')
}

export async function restoreTasks(taskIds: string[]): Promise<void> {
  const parsedTaskIds = taskIdsSchema.safeParse(taskIds)
  if (!parsedTaskIds.success) {
    throw new Error('Invalid task ids')
  }

  await Promise.all(parsedTaskIds.data.map((taskId) => restoreTask(taskId)))
}

export async function permanentlyDeleteTask(taskId: string): Promise<void> {
  const parsedTaskId = taskIdSchema.safeParse(taskId)
  if (!parsedTaskId.success) {
    throw new Error('Invalid task id')
  }

  const res = await serverApiFetch(`/tasks/${parsedTaskId.data}/permanent`, {
    method: 'DELETE',
  })
  await assertResponse(res, 'permanently delete task')

  revalidateTag(`task-${parsedTaskId.data}`, 'max')
  revalidateTag('tasks', 'max')
}

export async function emptyRecycleBin(): Promise<void> {
  const res = await serverApiFetch('/tasks/bulk/empty-bin', {
    method: 'POST',
  })
  await assertResponse(res, 'empty recycle bin')

  revalidateTag('tasks', 'max')
}
