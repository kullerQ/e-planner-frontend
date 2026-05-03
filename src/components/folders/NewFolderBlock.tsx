'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ColorPickerPopover } from '@/components/shared/ColorPickerPopover'
import { messages } from '@/lib/messages'
import { cn } from '@/lib/utils'

interface NewFolderBlockProps {
  draftGroup: {
    id: string
    name: string
    colorHex: string
  }
  onCreate: (name: string, colorHex: string) => void
  onCancel: () => void
}

export function NewFolderBlock({ draftGroup, onCreate, onCancel }: NewFolderBlockProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(draftGroup.name)
  const [colorHex, setColorHex] = useState(draftGroup.colorHex)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleSubmit() {
    if (isSubmitting) return
    const trimmedName = name.trim()
    if (trimmedName.length === 0) {
      onCancel()
      return
    }
    setIsSubmitting(true)
    onCreate(trimmedName, colorHex)
  }

  function handleCancel() {
    if (!isSubmitting) {
      onCancel()
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
    // Small delay to allow color picker interactions to complete
    setTimeout(() => {
      // Check if the color picker or its popover is still active
      const activeElement = document.activeElement
      const isColorPickerActive = activeElement?.closest('[data-color-picker]') !== null
      if (!isColorPickerActive) {
        handleSubmit()
      }
    }, 150)
  }

  function handleColorChange(newColor: string) {
    setColorHex(newColor)
    // Re-focus the input after color change
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  return (
    <div
      className={cn(
        'bg-card/90 backdrop-blur-sm border border-primary/40 rounded-lg h-[220px]',
        'flex flex-col',
        'ring-1 ring-primary/20'
      )}
    >
      {/* Header row */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              data-color-picker
              className="size-4 rounded-sm flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
              style={{ backgroundColor: colorHex }}
              aria-label="Change folder color"
            />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-2">
            <ColorPickerPopover
              value={colorHex}
              onChange={handleColorChange}
            />
          </PopoverContent>
        </Popover>

        <Input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={messages.dashboard.folders.newFolderPlaceholder}
          disabled={isSubmitting}
          className="h-7 text-sm flex-1"
          aria-label={messages.dashboard.folders.newFolderPlaceholder}
        />
      </div>

      {/* Empty task list placeholder */}
      <div className="px-4 py-1 max-h-[240px] overflow-y-auto scrollbar-thin scrollbar-thumb-border/60 scrollbar-track-transparent">
        <div className="text-xs text-muted-foreground/60 py-2 italic">
          New folder
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 pt-2 border-t border-border/40 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">0 tasks</span>
        <span className="text-xs text-muted-foreground/60">
          Press Enter to create
        </span>
      </div>
    </div>
  )
}
