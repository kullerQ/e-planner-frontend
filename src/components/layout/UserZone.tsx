'use client'

import Link from 'next/link'
import { HugeiconsIcon } from '@hugeicons/react'
import { Settings01Icon, UserCircleIcon } from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/messages'
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
    <div className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <HugeiconsIcon icon={UserCircleIcon} strokeWidth={1.5} size={16} />
    </div>
  )

  return (
    <div
      className={cn(
        'py-3',
        collapsed ? 'flex items-center justify-center px-1' : 'px-3'
      )}
    >
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/dashboard/settings"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors duration-200 ease-out hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              aria-label={t.dashboard.sidebar.openSettings}
            >
              {avatarNode}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {displayName}
          </TooltipContent>
        </Tooltip>
      ) : (
        <Link
          href="/dashboard/settings"
          className="flex min-h-11 w-full items-center justify-between rounded-md px-2 transition-colors duration-200 ease-out hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          aria-label={t.dashboard.sidebar.openSettings}
        >
          <span className="flex items-center gap-3">
            {avatarNode}
            <span className="text-sm font-medium text-foreground">{displayName}</span>
          </span>
          <span className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted-foreground">
            <HugeiconsIcon icon={Settings01Icon} strokeWidth={1.5} size={16} />
          </span>
        </Link>
      )}
    </div>
  )
}
