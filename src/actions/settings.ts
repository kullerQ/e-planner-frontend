'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { backendFetch } from '@/lib/api/server'
import { messages } from '@/lib/messages'
import { isDevOfflineMockEnabled } from '@/lib/offline/runtime'
import { nameSchema, emailSchema, passwordSchema } from '@/lib/validation'
import { z } from 'zod'

export type SettingsActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

const languageSchema = z.enum(['en', 'pl'])

export async function updateLanguagePreference(
  rawData: unknown
): Promise<SettingsActionResult> {
  if (await isDevOfflineMockEnabled()) {
    return { success: false, error: messages.offline.actionUnavailable }
  }

  const schema = z.object({
    language: languageSchema,
  })

  const parsed = schema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: messages.auth.errors.validationFailed,
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    const res = await backendFetch('/users/me/preferences', {
      method: 'PATCH',
      body: parsed.data,
    })

    if (!res.ok) {
      return { success: false, error: messages.settings.saveError }
    }

    return { success: true }
  } catch {
    return { success: false, error: messages.offline.actionUnavailable }
  }
}

export async function updateName(rawData: unknown): Promise<SettingsActionResult> {
  if (await isDevOfflineMockEnabled()) {
    return { success: false, error: messages.offline.actionUnavailable }
  }

  const schema = z.object({
    name: nameSchema,
  })

  const parsed = schema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: messages.auth.errors.validationFailed,
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    const res = await backendFetch('/users/me', {
      method: 'PATCH',
      body: parsed.data,
    })

    if (!res.ok) {
      return { success: false, error: messages.settings.saveError }
    }

    return { success: true }
  } catch {
    return { success: false, error: messages.offline.actionUnavailable }
  }
}

export async function updateEmail(rawData: unknown): Promise<SettingsActionResult> {
  if (await isDevOfflineMockEnabled()) {
    return { success: false, error: messages.offline.actionUnavailable }
  }

  const schema = z.object({
    email: emailSchema,
  })

  const parsed = schema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: messages.auth.errors.validationFailed,
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    const res = await backendFetch('/users/me/email', {
      method: 'PATCH',
      body: parsed.data,
    })

    if (!res.ok) {
      return { success: false, error: messages.settings.saveError }
    }

    return { success: true }
  } catch {
    return { success: false, error: messages.offline.actionUnavailable }
  }
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: messages.validation.passwordsDoNotMatch,
  path: ['confirmNewPassword'],
})

export async function changePassword(rawData: unknown): Promise<SettingsActionResult> {
  if (await isDevOfflineMockEnabled()) {
    return { success: false, error: messages.offline.actionUnavailable }
  }

  const parsed = changePasswordSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: messages.auth.errors.validationFailed,
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    const res = await backendFetch('/users/me/password', {
      method: 'PATCH',
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      },
    })

    if (!res.ok) {
      return { success: false, error: messages.settings.passwordChangeError }
    }

    return { success: true }
  } catch {
    return { success: false, error: messages.offline.actionUnavailable }
  }
}

export async function deleteAccount(): Promise<SettingsActionResult> {
  if (await isDevOfflineMockEnabled()) {
    return { success: false, error: messages.offline.actionUnavailable }
  }

  try {
    const res = await backendFetch('/users/account', {
      method: 'DELETE',
    })

    if (!res.ok) {
      return { success: false, error: 'Failed to delete account' }
    }

    const cookieStore = await cookies()
    cookieStore.delete('auth_token')

    redirect('/auth/login')
  } catch {
    return { success: false, error: messages.offline.actionUnavailable }
  }
}
