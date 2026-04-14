import type React from 'react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>
  heading: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon, heading, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Icon className="size-10 text-muted-foreground/50" />
      <h3 className="text-base font-medium text-foreground">{heading}</h3>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {action ? (
        <Button size="sm" variant="outline" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  )
}
