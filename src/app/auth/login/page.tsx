'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginUser } from '@/actions/auth'

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FieldErrors = { email?: string; password?: string }

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const result = LoginSchema.safeParse({ email, password })
    if (!result.success) {
      const fe = result.error.flatten().fieldErrors
      const next: FieldErrors = {}
      if (fe.email?.[0]) next.email = fe.email[0]
      if (fe.password?.[0]) next.password = fe.password[0]
      setErrors(next)
      return
    }

    setErrors({})
    startTransition(async () => {
      const res = await loginUser({ email, password })
      if (!res.success) {
        if (res.fieldErrors) {
          const next: FieldErrors = {}
          if (res.fieldErrors['email']?.[0]) next.email = res.fieldErrors['email'][0]
          if (res.fieldErrors['password']?.[0]) next.password = res.fieldErrors['password'][0]
          setErrors(next)
        } else {
          toast.error(res.error)
        }
      }
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-background">
      <div className="max-w-sm w-full mx-auto mt-20 px-4">
        <div className="mb-8 text-center">
          <span className="text-2xl font-semibold text-foreground">E-Planner</span>
        </div>
        <div className="bg-card border border-border/60 rounded-lg shadow-sm p-8">
          <h1 className="text-xl font-semibold text-foreground mb-6">Sign in</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
                autoComplete="email"
                disabled={isPending}
              />
              {errors.email !== undefined && (
                <p className="text-xs text-destructive mt-1">{errors.email}</p>
              )}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
                autoComplete="current-password"
                disabled={isPending}
              />
              {errors.password !== undefined && (
                <p className="text-xs text-destructive mt-1">{errors.password}</p>
              )}
            </div>
            <Button type="submit" className="w-full mt-2" disabled={isPending}>
              {isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground text-center mt-4">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-primary hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
