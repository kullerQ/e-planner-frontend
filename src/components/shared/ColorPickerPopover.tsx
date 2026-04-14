'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { GROUP_COLOR_PALETTE } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface ColorPickerPopoverProps {
  value: string
  colorInherited: boolean
  onChange: (hex: string) => void
  onResetToGroup: () => void
}

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/

export function ColorPickerPopover({
  value,
  colorInherited,
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
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-h-11 min-w-11 justify-start gap-2 px-3">
          <span
            className="size-4 rounded-sm border border-border"
            style={{ backgroundColor: value }}
            aria-hidden="true"
          />
          <span className="font-mono text-xs">{value}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-[240px] p-3">
        <div className="flex flex-col gap-3">
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

          <Input
            value={hexValue}
            onChange={(event) => handleHexInputChange(event.target.value)}
            placeholder="#4ade80"
            className="text-xs font-mono"
            aria-label="Hex color value"
          />

          {!colorInherited ? (
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
      </PopoverContent>
    </Popover>
  )
}
