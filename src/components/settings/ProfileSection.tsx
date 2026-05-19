'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/lib/messages'
import { buildValidationSchemas } from '@/lib/validation'
import { updateName, updateEmail } from '@/actions/settings'
import type { User } from '@/types'
import { HugeiconsIcon } from '@hugeicons/react'
import { CheckmarkCircle01Icon } from '@hugeicons/core-free-icons'

interface ProfileSectionProps {
  user: User
}

export function ProfileSection({ user }: ProfileSectionProps) {
  const { t } = useI18n()
  const router = useRouter()
  const emailSchema = buildValidationSchemas(t.validation).emailSchema
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [nameSaveStatus, setNameSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [emailSaveStatus, setEmailSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [emailFormatError, setEmailFormatError] = useState<string | null>(null)

  const handleNameBlur = useCallback(async () => {
    if (name === user.name) return
    setNameSaveStatus('saving')
    const result = await updateName({ name })
    if (result.success) {
      setNameSaveStatus('saved')
      router.refresh()
    } else {
      setNameSaveStatus('error')
    }
    setTimeout(() => setNameSaveStatus('idle'), 2000)
  }, [name, user.name, router])

  const handleEmailBlur = useCallback(async () => {
    if (email === user.email) return
    const parsedEmail = emailSchema.safeParse(email)
    if (!parsedEmail.success) {
      setEmailFormatError(t.validation.emailInvalid)
      setEmailSaveStatus('idle')
      return
    }

    setEmailFormatError(null)
    setEmailSaveStatus('saving')
    const result = await updateEmail({ email: parsedEmail.data })
    setEmailSaveStatus(result.success ? 'saved' : 'error')
    setTimeout(() => setEmailSaveStatus('idle'), 2000)
  }, [email, emailSchema, t.validation.emailInvalid, user.email])

  const handleNameKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter') return
      event.preventDefault()
      event.currentTarget.blur()
    },
    []
  )

  const handleEmailKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter') return
      event.preventDefault()
      event.currentTarget.blur()
    },
    []
  )

  return (
    <div className="space-y-6 max-w-xl">
      <div className="space-y-2">
        <h2 className="text-base font-medium text-foreground mb-4">
          {t.settings.profile}
        </h2>
      </div>

      {/* Display Name */}
      <div className="space-y-2">
        <Label htmlFor="display-name">{t.settings.displayName}</Label>
        <div className="relative">
          <Input
            id="display-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            disabled={nameSaveStatus === 'saving'}
          />
          {nameSaveStatus === 'saved' && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} className="text-green-500" />
            </div>
          )}
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">{t.settings.email}</Label>
        <div className="relative">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setEmailFormatError(null)
            }}
            onInvalid={(event) => {
              event.preventDefault()
              event.currentTarget.setCustomValidity('')
              setEmailFormatError(t.validation.emailInvalid)
              setEmailSaveStatus('idle')
            }}
            onInput={(event) => {
              event.currentTarget.setCustomValidity('')
            }}
            onBlur={handleEmailBlur}
            onKeyDown={handleEmailKeyDown}
            disabled={emailSaveStatus === 'saving'}
            aria-invalid={emailFormatError ? true : undefined}
          />
          {emailSaveStatus === 'saved' && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} className="text-green-500" />
            </div>
          )}
        </div>
        {emailFormatError ? (
          <p className="text-sm text-destructive">{emailFormatError}</p>
        ) : null}
      </div>

      {(nameSaveStatus === 'error' || emailSaveStatus === 'error') && (
        <p className="text-sm text-destructive">{t.settings.saveError}</p>
      )}
    </div>
  )
}
