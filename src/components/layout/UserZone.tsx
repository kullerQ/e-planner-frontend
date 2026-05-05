'use client'

import Link from 'next/link'
import { HugeiconsIcon } from '@hugeicons/react'
import { Settings01Icon, UserCircleIcon } from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/messages'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { User } from '@/types'

interface UserZoneProps {
  collapsed: boolean
  user: User | null
}

export function UserZone({ collapsed, user }: UserZoneProps) {
  const { t } = useI18n()
  const displayName = user?.name ?? t.dashboard.user.fallbackName
  const avatarNode = (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <HugeiconsIcon icon={UserCircleIcon} strokeWidth={1.5} size={16} />
    </div>
  )

  return (
    <div
      className={cn(
        'py-3',
        collapsed ? 'flex items-center justify-center px-1' : 'flex items-center gap-3 px-3'
      )}
    >
      {collapsed ? (
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors duration-200 ease-out hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                aria-label={t.dashboard.sidebar.userMenu.replace('{name}', displayName)}
              >
                {avatarNode}
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {displayName}
            </TooltipContent>
          </Tooltip>
          <PopoverContent
            side="right"
            align="center"
            sideOffset={10}
            collisionPadding={12}
            className="w-32 rounded-lg border-border/60 bg-card/95 p-1.5 shadow-lg backdrop-blur-md"
          >
            <Link
              href="/dashboard/settings"
              className="inline-flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-sm text-foreground transition-colors duration-200 ease-out hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              <HugeiconsIcon icon={Settings01Icon} strokeWidth={1.5} size={16} />
              <span>{t.dashboard.nav.settings}</span>
            </Link>
          </PopoverContent>
        </Popover>
      ) : (
        avatarNode
      )}
      <p
        className={cn(
          'text-sm font-medium text-foreground transition-opacity duration-150',
          collapsed
            ? 'pointer-events-none h-0 w-0 overflow-hidden whitespace-nowrap opacity-0'
            : 'w-auto opacity-100'
        )}
      >
        {displayName}
      </p>
      {!collapsed ? (
        <Link
          href="/dashboard/settings"
          className="ml-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          aria-label={t.dashboard.sidebar.openSettings}
        >
          <HugeiconsIcon icon={Settings01Icon} strokeWidth={1.5} size={16} />
        </Link>
      ) : null}
    </div>
  )
}
