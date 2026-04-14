'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registerUser } from '@/actions/auth'
import { messages } from '@/lib/messages'
import { registerSchema } from '@/lib/validation'

type FieldErrors = {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
}

export default function RegisterPage() {
  const authMessages = messages.auth
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const result = registerSchema.safeParse({ name, email, password, confirmPassword })
    if (!result.success) {
      const fe = result.error.flatten().fieldErrors
      const next: FieldErrors = {}
      if (fe.name?.[0]) next.name = fe.name[0]
      if (fe.email?.[0]) next.email = fe.email[0]
      if (fe.password?.[0]) next.password = fe.password[0]
      if (fe.confirmPassword?.[0]) next.confirmPassword = fe.confirmPassword[0]
      setErrors(next)
      return
    }

    setErrors({})
    startTransition(async () => {
      const res = await registerUser({ name, email, password, confirmPassword })
      if (!res.success) {
        if (res.fieldErrors) {
          const next: FieldErrors = {}
          if (res.fieldErrors['name']?.[0]) next.name = res.fieldErrors['name'][0]
          if (res.fieldErrors['email']?.[0]) next.email = res.fieldErrors['email'][0]
          if (res.fieldErrors['password']?.[0]) next.password = res.fieldErrors['password'][0]
          if (res.fieldErrors['confirmPassword']?.[0])
            next.confirmPassword = res.fieldErrors['confirmPassword'][0]
          setErrors(next)
        } else {
          toast.error(res.error || authMessages.errors.registrationFailed)
        }
      }
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-background">
      <div className="max-w-sm w-full mx-auto mt-20 px-4">
        <div className="mb-8 text-center">
          <span className="text-2xl font-semibold text-foreground">{authMessages.brand}</span>
        </div>
        <div className="bg-card border border-border/60 rounded-lg shadow-sm p-8">
          <h1 className="text-xl font-semibold text-foreground mb-6">{authMessages.register.title}</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="name">{authMessages.fields.name}</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
                autoComplete="name"
                disabled={isPending}
              />
              {errors.name !== undefined && (
                <p className="text-xs text-destructive mt-1">{errors.name}</p>
              )}
            </div>
            <div>
              <Label htmlFor="email">{authMessages.fields.email}</Label>
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
              <Label htmlFor="password">{authMessages.fields.password}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
                autoComplete="new-password"
                disabled={isPending}
              />
              {errors.password !== undefined && (
                <p className="text-xs text-destructive mt-1">{errors.password}</p>
              )}
            </div>
            <div>
              <Label htmlFor="confirmPassword">{authMessages.fields.confirmPassword}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1"
                autoComplete="new-password"
                disabled={isPending}
              />
              {errors.confirmPassword !== undefined && (
                <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{authMessages.register.passwordRequirements}</p>
            <Button type="submit" className="w-full mt-2" disabled={isPending}>
              {isPending ? authMessages.register.submitting : authMessages.register.submit}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground text-center mt-4">
            {authMessages.register.hasAccount}{' '}
            <Link href="/auth/login" className="text-primary hover:underline">
              {authMessages.register.loginLink}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
