'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { backendFetch } from '@/lib/api/server'
import { getServerMessages } from '@/lib/i18n/server'
import { isDevOfflineMockEnabled } from '@/lib/offline/runtime'
import { buildValidationSchemas } from '@/lib/validation'
import { z } from 'zod'

export type SettingsActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

const languageSchema = z.enum(['en-US', 'pl-PL'])

export async function updateLanguagePreference(
  rawData: unknown
): Promise<SettingsActionResult> {
  const t = await getServerMessages()

  if (await isDevOfflineMockEnabled()) {
    return { success: false, error: t.offline.actionUnavailable }
  }

  const schema = z.object({
    language: languageSchema,
  })

  const parsed = schema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: t.auth.errors.validationFailed,
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    const res = await backendFetch('/users/me/preferences', {
      method: 'PATCH',
      body: parsed.data,
    })

    if (!res.ok) {
      return { success: false, error: t.settings.saveError }
    }

    return { success: true }
  } catch {
    return { success: false, error: t.offline.actionUnavailable }
  }
}

export async function updateName(rawData: unknown): Promise<SettingsActionResult> {
  const t = await getServerMessages()
  const { nameSchema } = buildValidationSchemas(t.validation)

  if (await isDevOfflineMockEnabled()) {
    return { success: false, error: t.offline.actionUnavailable }
  }

  const schema = z.object({
    name: nameSchema,
  })

  const parsed = schema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: t.auth.errors.validationFailed,
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    const res = await backendFetch('/users/me', {
      method: 'PATCH',
      body: parsed.data,
    })

    if (!res.ok) {
      return { success: false, error: t.settings.saveError }
    }

    return { success: true }
  } catch {
    return { success: false, error: t.offline.actionUnavailable }
  }
}

export async function updateEmail(rawData: unknown): Promise<SettingsActionResult> {
  const t = await getServerMessages()
  const { emailSchema } = buildValidationSchemas(t.validation)

  if (await isDevOfflineMockEnabled()) {
    return { success: false, error: t.offline.actionUnavailable }
  }

  const schema = z.object({
    email: emailSchema,
  })

  const parsed = schema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: t.auth.errors.validationFailed,
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    const res = await backendFetch('/users/me/email', {
      method: 'PATCH',
      body: parsed.data,
    })

    if (!res.ok) {
      return { success: false, error: t.settings.saveError }
    }

    return { success: true }
  } catch {
    return { success: false, error: t.offline.actionUnavailable }
  }
}

export async function changePassword(rawData: unknown): Promise<SettingsActionResult> {
  const t = await getServerMessages()
  const { passwordSchema } = buildValidationSchemas(t.validation)

  const changePasswordSchema = z
    .object({
      currentPassword: z.string().min(1, t.settings.currentPasswordRequired),
      newPassword: passwordSchema,
      confirmNewPassword: z.string().min(1, t.settings.confirmNewPasswordRequired),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
      message: t.validation.passwordsDoNotMatch,
      path: ['confirmNewPassword'],
    })

  if (await isDevOfflineMockEnabled()) {
    return { success: false, error: t.offline.actionUnavailable }
  }

  const parsed = changePasswordSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: t.auth.errors.validationFailed,
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
      return { success: false, error: t.settings.passwordChangeError }
    }

    return { success: true }
  } catch {
    return { success: false, error: t.offline.actionUnavailable }
  }
}

export async function deleteAccount(): Promise<SettingsActionResult> {
  const t = await getServerMessages()

  if (await isDevOfflineMockEnabled()) {
    return { success: false, error: t.offline.actionUnavailable }
  }

  try {
    const res = await backendFetch('/users/account', {
      method: 'DELETE',
    })

    if (!res.ok) {
      return { success: false, error: t.settings.deleteAccountError }
    }

    const cookieStore = await cookies()
    cookieStore.delete('auth_token')

    redirect('/auth/login')
  } catch {
    return { success: false, error: t.offline.actionUnavailable }
  }
}
