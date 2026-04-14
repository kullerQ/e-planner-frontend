'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { messages } from '@/lib/messages'
import { isDevOfflineMockEnabled } from '@/lib/offline/runtime'
import { loginSchema, registerSchema } from '@/lib/validation'

interface AuthTokenResponse {
  token?: string
  access_token?: string
}

export type AuthActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

export async function loginUser(rawData: unknown): Promise<AuthActionResult> {
  if (await isDevOfflineMockEnabled()) {
    return { success: false, error: messages.offline.actionUnavailable }
  }

  const parsed = loginSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: messages.auth.errors.validationFailed,
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  let res: Response
  try {
    res = await fetch(`${process.env['API_URL']}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    })
  } catch {
    return { success: false, error: messages.offline.actionUnavailable }
  }

  if (!res.ok) {
    return { success: false, error: messages.auth.errors.invalidCredentials }
  }

  const authResponse = (await res.json()) as AuthTokenResponse
  const token = authResponse.token ?? authResponse.access_token
  if (!token) {
    return { success: false, error: messages.auth.errors.genericServerError }
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
  if (await isDevOfflineMockEnabled()) {
    return { success: false, error: messages.offline.actionUnavailable }
  }

  const parsed = registerSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: messages.auth.errors.validationFailed,
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  let res: Response
  try {
    res = await fetch(`${process.env['API_URL']}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
      }),
    })
  } catch {
    return { success: false, error: messages.offline.actionUnavailable }
  }

  if (!res.ok) {
    return { success: false, error: messages.auth.errors.registrationFailed }
  }

  const authResponse = (await res.json()) as AuthTokenResponse
  const token = authResponse.token ?? authResponse.access_token
  if (!token) {
    return { success: false, error: messages.auth.errors.genericServerError }
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
