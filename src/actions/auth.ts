'use server'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const RegisterSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type AuthActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

export async function loginUser(rawData: unknown): Promise<AuthActionResult> {
  const parsed = LoginSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const res = await fetch(`${process.env['API_URL']}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.data),
  })

  if (!res.ok) {
    return { success: false, error: 'Invalid email or password.' }
  }

  const { token } = (await res.json()) as { token: string }
  const cookieStore = await cookies()
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  redirect('/')
}

export async function registerUser(rawData: unknown): Promise<AuthActionResult> {
  const parsed = RegisterSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const res = await fetch(`${process.env['API_URL']}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
    }),
  })

  if (!res.ok) {
    return { success: false, error: 'Registration failed. This email may already be in use.' }
  }

  redirect('/auth/login')
}

export async function logoutUser(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('auth_token')
  redirect('/auth/login')
}
