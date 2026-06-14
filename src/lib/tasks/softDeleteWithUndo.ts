import { toast } from 'sonner'

interface SoftDeleteWithUndoMessages {
  deletedToast: string
  undo: string
  deleteError: string
  restoreError: string
}

interface SoftDeleteWithUndoOptions<TTask extends { id: string }> {
  task: TTask
  messages: SoftDeleteWithUndoMessages
  softDelete: (taskId: string) => Promise<void>
  restore: (taskId: string) => Promise<void>
  onOptimisticDelete?: (task: TTask) => void
  onOptimisticRestore?: (task: TTask) => void
  onDeleteSuccess?: (task: TTask) => void
  onRestoreSuccess?: (task: TTask) => void
  onBeforeUndo?: (task: TTask) => void
}

export async function softDeleteWithUndo<TTask extends { id: string }>({
  task,
  messages,
  softDelete,
  restore,
  onOptimisticDelete,
  onOptimisticRestore,
  onDeleteSuccess,
  onRestoreSuccess,
  onBeforeUndo,
}: SoftDeleteWithUndoOptions<TTask>): Promise<boolean> {
  onOptimisticDelete?.(task)

  try {
    await softDelete(task.id)
    onDeleteSuccess?.(task)
    toast.success(messages.deletedToast, {
      action: {
        label: messages.undo,
        onClick: () => {
          onBeforeUndo?.(task)
          void (async () => {
            onOptimisticRestore?.(task)
            try {
              await restore(task.id)
              onRestoreSuccess?.(task)
            } catch {
              onOptimisticDelete?.(task)
              toast.error(messages.restoreError)
            }
          })()
        },
      },
    })
    return true
  } catch {
    onOptimisticRestore?.(task)
    toast.error(messages.deleteError)
    return false
  }
}
