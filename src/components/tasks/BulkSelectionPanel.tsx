'use client'

import { useMemo, useState, useTransition } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon, Delete02Icon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { bulkAddTags, bulkMoveToGroup, bulkSoftDelete } from '@/actions/tasks'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useSelectionStore } from '@/stores/useSelectionStore'
import type { Tag, TaskGroup } from '@/types'

interface BulkSelectionPanelProps {
  groups: TaskGroup[]
  tags: Tag[]
  onBulkDeleted: (taskIds: string[]) => void
  onBulkTagsAdded: (taskIds: string[], tagIds: string[]) => void
}

export function BulkSelectionPanel({
  groups,
  tags,
  onBulkDeleted,
  onBulkTagsAdded,
}: BulkSelectionPanelProps) {
  const selectedIds = useSelectionStore((state) => state.selectedIds)
  const clearSelection = useSelectionStore((state) => state.clearSelection)
  const exitSelectMode = useSelectionStore((state) => state.exitSelectMode)
  const selectedTaskIds = useMemo(() => Array.from(selectedIds), [selectedIds])
  const selectedCount = selectedTaskIds.length

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [tagQuery, setTagQuery] = useState('')
  const [pendingAction, startTransition] = useTransition()
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())

  const filteredTags = useMemo(() => {
    const normalizedQuery = tagQuery.trim().toLowerCase()
    if (normalizedQuery.length === 0) {
      return tags
    }
    return tags.filter((tag) => tag.name.toLowerCase().includes(normalizedQuery))
  }, [tagQuery, tags])

  function runBulkAction(action: () => Promise<void>, successMessage: string) {
    if (selectedCount === 0 || pendingAction) {
      return
    }

    startTransition(async () => {
      try {
        await action()
        clearSelection()
        toast.success(successMessage)
      } catch {
        toast.error('Bulk operation failed. Please try again.')
      }
    })
  }

  function handleToggleTag(tagId: string, checked: boolean) {
    setSelectedTagIds((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(tagId)
      } else {
        next.delete(tagId)
      }
      return next
    })
  }

  function handleApplyTags() {
    const tagIds = Array.from(selectedTagIds)
    runBulkAction(
      async () => {
        await bulkAddTags(selectedTaskIds, tagIds)
        onBulkTagsAdded(selectedTaskIds, tagIds)
      },
      `${selectedCount} task${selectedCount === 1 ? '' : 's'} updated with tags`
    )
  }

  function handleDeleteSelected() {
    if (selectedCount === 0) {
      return
    }

    startTransition(async () => {
      try {
        await bulkSoftDelete(selectedTaskIds)
        onBulkDeleted(selectedTaskIds)
        clearSelection()
        exitSelectMode()
        toast.info(`${selectedCount} task${selectedCount === 1 ? '' : 's'} moved to Recycle Bin`)
      } catch {
        toast.error('Failed to delete selected tasks')
      }
    })
  }

  return (
    <aside
      className={cn(
        'w-72 bg-card/90 backdrop-blur-sm border-l border-border/60 p-4 flex flex-col gap-4',
        'transition-[width,opacity] duration-200 ease-out'
      )}
      aria-label="Bulk selection panel"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">
          {selectedCount} task{selectedCount === 1 ? '' : 's'} selected
        </p>
        <Button type="button" variant="ghost" onClick={exitSelectMode} className="min-h-11 px-3">
          Cancel
        </Button>
      </div>

      <div className="border-t border-border/60" />

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assign to Folder</p>
        <Select
          disabled={selectedCount === 0 || pendingAction}
          onValueChange={(value) => {
            const groupId = value === '__none__' ? null : value
            runBulkAction(
              () => bulkMoveToGroup(selectedTaskIds, groupId),
              `${selectedCount} task${selectedCount === 1 ? '' : 's'} moved`
            )
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select folder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No folder</SelectItem>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add Tags</p>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={selectedCount === 0 || pendingAction}
              className="w-full justify-between"
            >
              <span className="truncate text-left">
                {selectedTagIds.size > 0 ? `${selectedTagIds.size} tag(s) selected` : 'Select tags'}
              </span>
              <HugeiconsIcon icon={ArrowDown01Icon} size={14} className="text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-2">
            <div className="space-y-2">
              <Input
                value={tagQuery}
                onChange={(event) => setTagQuery(event.target.value)}
                placeholder="Search tags"
              />
              <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                {filteredTags.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-muted-foreground">No matching tags</p>
                ) : (
                  filteredTags.map((tag) => {
                    const checked = selectedTagIds.has(tag.id)
                    return (
                      <label
                        key={tag.id}
                        className="flex min-h-11 items-center gap-2 rounded-sm px-2 hover:bg-accent/60"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => handleToggleTag(tag.id, value === true)}
                        />
                        <span className="text-sm">{tag.name}</span>
                      </label>
                    )
                  })
                )}
              </div>
              <Button
                type="button"
                onClick={handleApplyTags}
                disabled={selectedTagIds.size === 0 || selectedCount === 0 || pendingAction}
                className="w-full"
              >
                Apply tags
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="border-t border-border/60" />

      <Button
        type="button"
        variant="destructive"
        className="justify-start gap-2"
        disabled={selectedCount === 0 || pendingAction}
        onClick={() => setIsDeleteDialogOpen(true)}
      >
        <HugeiconsIcon icon={Delete02Icon} size={16} />
        Delete Selected
      </Button>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete selected tasks"
        description={`Move ${selectedCount} task${selectedCount === 1 ? '' : 's'} to Recycle Bin?`}
        confirmLabel="Move to Recycle Bin"
        onConfirm={handleDeleteSelected}
        isPending={pendingAction}
      />
    </aside>
  )
}
