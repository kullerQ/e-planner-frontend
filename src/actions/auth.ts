'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { backendFetch } from '@/lib/api/server'
import { getServerMessages } from '@/lib/i18n/server'
import { isDevOfflineMockEnabled } from '@/lib/offline/runtime'
import { buildValidationSchemas } from '@/lib/validation'

interface AuthTokenResponse {
  token?: string
  access_token?: string
}

export type AuthActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

export async function loginUser(rawData: unknown): Promise<AuthActionResult> {
  const t = await getServerMessages()
  const { loginSchema } = buildValidationSchemas(t.validation)

  if (await isDevOfflineMockEnabled()) {
    return { success: false, error: t.offline.actionUnavailable }
  }

  const parsed = loginSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: t.auth.errors.validationFailed,
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  let res: Response
  try {
    res = await backendFetch('/auth/login', {
      auth: false,
      method: 'POST',
      body: parsed.data,
    })
  } catch {
    return { success: false, error: t.offline.actionUnavailable }
  }

  if (!res.ok) {
    return { success: false, error: t.auth.errors.invalidCredentials }
  }

  const authResponse = (await res.json()) as AuthTokenResponse
  const token = authResponse.token ?? authResponse.access_token
  if (!token) {
    return { success: false, error: t.auth.errors.genericServerError }
  }

  const cookieStore = await cookies()
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  redirect('/dashboard')
}

export async function registerUser(rawData: unknown): Promise<AuthActionResult> {
  const t = await getServerMessages()
  const { registerSchema } = buildValidationSchemas(t.validation)

  if (await isDevOfflineMockEnabled()) {
    return { success: false, error: t.offline.actionUnavailable }
  }

  const parsed = registerSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: t.auth.errors.validationFailed,
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  let res: Response
  try {
    res = await backendFetch('/auth/register', {
      auth: false,
      method: 'POST',
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
      },
    })
  } catch {
    return { success: false, error: t.offline.actionUnavailable }
  }

  if (!res.ok) {
    return { success: false, error: t.auth.errors.registrationFailed }
  }

  const authResponse = (await res.json()) as AuthTokenResponse
  const token = authResponse.token ?? authResponse.access_token
  if (!token) {
    return { success: false, error: t.auth.errors.genericServerError }
  }

  const cookieStore = await cookies()
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  redirect('/dashboard')
}

export async function logoutUser(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('auth_token')
  redirect('/auth/login')
}
