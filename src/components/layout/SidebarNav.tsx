'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export interface SidebarNavItemConfig {
  href: string
  label: string
  icon: React.ReactNode
}

interface SidebarNavProps {
  items: SidebarNavItemConfig[]
  collapsed: boolean
  className?: string
}

function isItemActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard'
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SidebarNav({ items, collapsed, className }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav aria-label="Main navigation" className={cn('flex flex-col gap-1 px-2 py-2', className)}>
      {items.map((item) => {
        const active = isItemActive(pathname, item.href)
        const itemClasses = cn(
          'w-full rounded-md text-sm transition-colors duration-200 ease-out',
          'flex min-h-11 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          collapsed ? 'mx-auto h-11 w-11 justify-center px-0 py-0' : 'gap-3 px-3 py-1.5',
          active
            ? collapsed
              ? 'bg-primary/10 text-primary'
              : 'bg-primary/10 text-primary ring-1 ring-primary/30'
            : 'text-foreground hover:bg-muted/50'
        )
        const labelClasses = cn(
          'overflow-hidden whitespace-nowrap text-left',
          'motion-safe:transition-[opacity,max-width] motion-safe:duration-150 motion-safe:ease-out motion-reduce:transition-none',
          collapsed ? 'max-w-0 opacity-0' : 'max-w-full opacity-100'
        )

        const linkNode = (
          <Link
            href={item.href}
            className={itemClasses}
            aria-label={collapsed ? item.label : undefined}
            aria-current={active ? 'page' : undefined}
          >
            <span className="shrink-0">{item.icon}</span>
            <span className={labelClasses}>{item.label}</span>
          </Link>
        )

        if (!collapsed) {
          return (
            <div key={item.href}>
              {linkNode}
            </div>
          )
        }

        return (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>{linkNode}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {item.label}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </nav>
  )
}
