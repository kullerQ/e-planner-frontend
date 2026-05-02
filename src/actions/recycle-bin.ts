'use server'

import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { backendFetch } from '@/lib/api/server'

const taskIdSchema = z.string().min(1, 'Task id is required')

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

  const res = await backendFetch(`/tasks/${parsedTaskId.data}/restore`, {
    method: 'POST',
  })
  await assertResponse(res, 'restore task')

  revalidateTag(`task-${parsedTaskId.data}`, 'max')
  revalidateTag('tasks', 'max')
}

export async function permanentlyDeleteTask(taskId: string): Promise<void> {
  const parsedTaskId = taskIdSchema.safeParse(taskId)
  if (!parsedTaskId.success) {
    throw new Error('Invalid task id')
  }

  const res = await backendFetch(`/tasks/${parsedTaskId.data}/permanent`, {
    method: 'DELETE',
  })
  await assertResponse(res, 'permanently delete task')

  revalidateTag(`task-${parsedTaskId.data}`, 'max')
  revalidateTag('tasks', 'max')
}

export async function emptyRecycleBin(): Promise<void> {
  const res = await backendFetch('/tasks/bulk/empty-bin', {
    method: 'POST',
  })
  await assertResponse(res, 'empty recycle bin')

  revalidateTag('tasks', 'max')
}
