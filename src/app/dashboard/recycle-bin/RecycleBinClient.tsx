'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, Delete02Icon } from '@hugeicons/core-free-icons'
import {
  emptyRecycleBin,
  permanentlyDeleteTask,
  restoreTask,
} from '@/actions/recycle-bin'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { messages } from '@/lib/messages'
import { cn, daysUntil, relativeTime } from '@/lib/utils'
import type { Task } from '@/types'

interface RecycleBinClientProps {
  tasks: Task[]
}

export function RecycleBinClient({ tasks }: RecycleBinClientProps) {
  const router = useRouter()
  const recycleMessages = messages.dashboard.recycleBin
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const left = a.deletedAt ? new Date(a.deletedAt).getTime() : 0
      const right = b.deletedAt ? new Date(b.deletedAt).getTime() : 0
      return right - left
    })
  }, [tasks])

  const emptyAllDescription = recycleMessages.emptyAllDescription.replace(
    '{count}',
    String(sortedTasks.length)
  )

  async function runPendingAction(action: () => Promise<void>): Promise<void> {
    setIsPending(true)
    try {
      await action()
      router.refresh()
    } finally {
      setIsPending(false)
    }
  }

  function handleRestore(taskId: string): void {
    void runPendingAction(async () => {
      await restoreTask(taskId)
    })
  }

  async function handlePermanentDelete(taskId: string): Promise<void> {
    await runPendingAction(async () => {
      await permanentlyDeleteTask(taskId)
    })
  }

  async function handleEmptyRecycleBin(): Promise<void> {
    await runPendingAction(async () => {
      await emptyRecycleBin()
    })
  }

  return (
    <main className="space-y-4 p-6 overflow-y-auto h-full">
      <header className="mb-6 flex items-center justify-between gap-4 border-b border-border/50 pb-5">
        <h1 className="text-2xl font-semibold text-foreground">{recycleMessages.title}</h1>
        {sortedTasks.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 text-destructive hover:text-destructive"
            onClick={() => setShowEmptyConfirm(true)}
          >
            {recycleMessages.emptyButton}
          </Button>
        ) : null}
      </header>

      <section className="flex items-center gap-2 rounded-md bg-muted/30 p-3 text-sm text-muted-foreground">
        <HugeiconsIcon icon={Delete02Icon} size={16} />
        <span>{recycleMessages.infoBanner}</span>
      </section>

      {sortedTasks.length === 0 ? (
        <section className="flex min-h-[320px] flex-col items-center justify-center rounded-md border border-border/50 bg-card/50 p-6 text-center">
          <HugeiconsIcon icon={Delete02Icon} size={28} className="mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{recycleMessages.emptyMessage}</p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-md border border-border/50 bg-card/50">
          {sortedTasks.map((task) => {
            const isUrgentDelete = task.deletedAutoAt !== null && (new Date(task.deletedAutoAt).getTime() - Date.now()) / 86_400_000 <= 2

            return (
              <article
                key={task.id}
                className="group grid grid-cols-1 gap-3 border-b border-border/40 p-4 opacity-75 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-xs text-muted-foreground">
                      {recycleMessages.deletedLabel}{' '}
                      {task.deletedAt ? relativeTime(task.deletedAt) : 'unknown'}
                    </span>
                    {task.deletedAutoAt ? (
                      <span
                        className={cn(
                          'text-xs text-orange-400',
                          isUrgentDelete ? 'text-destructive' : undefined
                        )}
                      >
                        {recycleMessages.autoDeletesLabel} {daysUntil(task.deletedAutoAt)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 transition-opacity duration-100 group-hover:opacity-100">
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11"
                    onClick={() => handleRestore(task.id)}
                    disabled={isPending}
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
                    <span>{recycleMessages.restore}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 text-destructive hover:text-destructive"
                    onClick={() => setTaskToDelete(task)}
                    disabled={isPending}
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={14} />
                    <span>{recycleMessages.deletePermanently}</span>
                  </Button>
                </div>
              </article>
            )
          })}
        </section>
      )}

      <ConfirmDialog
        open={taskToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setTaskToDelete(null)
        }}
        title={recycleMessages.permanentDeleteTitle}
        description={recycleMessages.permanentDeleteDescription}
        confirmLabel={recycleMessages.permanentDeleteAction}
        onConfirm={async () => {
          if (!taskToDelete) return
          await handlePermanentDelete(taskToDelete.id)
          setTaskToDelete(null)
        }}
        isPending={isPending}
      />

      <ConfirmDialog
        open={showEmptyConfirm}
        onOpenChange={setShowEmptyConfirm}
        title={recycleMessages.emptyConfirmTitle}
        description={emptyAllDescription}
        confirmLabel={recycleMessages.emptyConfirmAction}
        onConfirm={async () => {
          await handleEmptyRecycleBin()
          setShowEmptyConfirm(false)
        }}
        isPending={isPending}
      />
    </main>
  )
}
