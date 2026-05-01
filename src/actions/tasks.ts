'use server'

import { revalidateTag } from 'next/cache'
import { z } from 'zod'

const updateStatusSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'delayed', 'completed']),
})

export async function updateTaskStatus(taskId: string, rawData: unknown): Promise<void> {
  const parsed = updateStatusSchema.safeParse(rawData)
  if (!parsed.success) {
    throw new Error('Invalid status value')
  }

  const res = await fetch(`${process.env['API_URL']}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(parsed.data),
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    throw new Error('Failed to update task status')
  }

  revalidateTag(`task-${taskId}`, 'max')
  revalidateTag('tasks', 'max')
}

export async function createTask(_rawData: unknown): Promise<void> {
  void _rawData
  throw new Error('createTask is not implemented')
}

export async function updateTask(_taskId: string, _rawData: unknown): Promise<void> {
  void _taskId
  void _rawData
  throw new Error('updateTask is not implemented')
}

export async function softDeleteTask(_taskId: string): Promise<void> {
  void _taskId
  throw new Error('softDeleteTask is not implemented')
}
