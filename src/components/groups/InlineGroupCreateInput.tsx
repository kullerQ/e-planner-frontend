'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createGroup } from '@/actions/groups'
import { Input } from '@/components/ui/input'
import { messages } from '@/lib/messages'
import { cn, randomGroupColor } from '@/lib/utils'

interface InlineGroupCreateInputProps {
  onCreated?: () => void
  onCancel?: () => void
  className?: string
}

export function InlineGroupCreateInput({
  onCreated,
  onCancel,
  className,
}: InlineGroupCreateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    // Auto-focus on mount
    inputRef.current?.focus()
  }, [])

  function handleCancel() {
    onCancel?.()
  }

  async function handleSubmit() {
    const trimmedName = name.trim()
    if (trimmedName.length === 0) {
      handleCancel()
      return
    }

    if (isPending) return

    setIsPending(true)
    try {
      await createGroup({
        name: trimmedName,
        colorHex: randomGroupColor(),
      })
      toast.success(messages.dashboard.folders.createdSuccess)
      onCreated?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : messages.dashboard.folders.createError
      toast.error(message)
      setIsPending(false)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSubmit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      handleCancel()
    }
  }

  function handleBlur() {
    // Cancel if empty, otherwise don't do anything (let user finish typing)
    if (name.trim().length === 0) {
      handleCancel()
    }
  }

  return (
    <Input
      ref={inputRef}
      value={name}
      onChange={(e) => setName(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      placeholder={messages.dashboard.folders.newFolderPlaceholder}
      disabled={isPending}
      className={cn('h-9 text-sm', className)}
      aria-label={messages.dashboard.folders.newFolderPlaceholder}
    />
  )
}
