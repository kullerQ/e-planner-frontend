'use client'

import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/messages'
import { changePassword } from '@/actions/settings'
import { toast } from 'sonner'

export function AccountSection() {
  const { t } = useI18n()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const handlePasswordSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})

    const result = await changePassword({
      currentPassword,
      newPassword,
      confirmNewPassword,
    })

    if (result.success) {
      toast.success(t.settings.passwordChanged)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } else {
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors)
      } else {
        toast.error(result.error || t.settings.passwordChangeError)
      }
    }

    setIsSubmitting(false)
  }, [currentPassword, newPassword, confirmNewPassword])

  return (
    <div className="space-y-8 max-w-xl">
      <div className="space-y-2">
        <h2 className="text-base font-medium text-foreground mb-4">
          {t.settings.account}
        </h2>
      </div>

      {/* Change Password */}
      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current-password">{t.settings.currentPassword}</Label>
          <Input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={isSubmitting}
          />
          {fieldErrors.currentPassword && (
            <p className="text-sm text-destructive">{fieldErrors.currentPassword[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-password">{t.settings.newPassword}</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={isSubmitting}
          />
          {fieldErrors.newPassword && (
            <p className="text-sm text-destructive">{fieldErrors.newPassword[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-new-password">{t.settings.confirmNewPassword}</Label>
          <Input
            id="confirm-new-password"
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            disabled={isSubmitting}
          />
          {fieldErrors.confirmNewPassword && (
            <p className="text-sm text-destructive">{fieldErrors.confirmNewPassword[0]}</p>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t.common.working : t.settings.changePassword}
        </Button>
      </form>

    </div>
  )
}
