'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { GROUP_COLOR_PALETTE } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface ColorPickerPopoverProps {
  value: string
  showResetToGroup?: boolean
  onChange: (hex: string) => void
  onResetToGroup?: () => void
}

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/

export function ColorPickerPopover({
  value,
  showResetToGroup = false,
  onChange,
  onResetToGroup,
}: ColorPickerPopoverProps) {
  const [hexValue, setHexValue] = useState(value)

  useEffect(() => {
    setHexValue(value)
  }, [value])

  const handleHexInputChange = (nextValue: string) => {
    setHexValue(nextValue)
    if (HEX_PATTERN.test(nextValue)) {
      onChange(nextValue)
    }
  }

  return (
    <div className="flex flex-col gap-3" data-color-picker>
      <div className="flex flex-wrap gap-1 p-1">
        {GROUP_COLOR_PALETTE.map((paletteColor) => {
          const isSelected = paletteColor.toLowerCase() === value.toLowerCase()
          return (
            <button
              key={paletteColor}
              type="button"
              aria-label={`Select color ${paletteColor}`}
              onClick={() => onChange(paletteColor)}
              className={cn(
                'inline-flex min-h-11 min-w-11 items-center justify-center rounded-md',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
              )}
            >
              <span
                className={cn(
                  'size-5 rounded-sm cursor-pointer',
                  isSelected ? 'ring-2 ring-ring ring-offset-1' : undefined
                )}
                style={{ backgroundColor: paletteColor }}
                aria-hidden="true"
              />
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <span
          className="size-6 rounded-sm border border-border flex-shrink-0"
          style={{ backgroundColor: value }}
          aria-hidden="true"
        />
        <Input
          value={hexValue}
          onChange={(event) => handleHexInputChange(event.target.value)}
          placeholder="#4ade80"
          className="text-xs font-mono"
          aria-label="Hex color value"
        />
      </div>

      {showResetToGroup && onResetToGroup ? (
        <button
          type="button"
          onClick={onResetToGroup}
          className={cn(
            'self-start rounded-sm px-2 py-2 text-xs text-muted-foreground underline-offset-2 hover:underline',
            'min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
          )}
        >
          Reset to group color
        </button>
      ) : null}
    </div>
  )
}
