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
import { useI18n } from '@/lib/messages'
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
  const { t } = useI18n()
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
        toast.error(t.bulkActions.errorBulk)
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
      t.bulkActions.successTags.replace('{count}', String(selectedCount)).replace('{plural}', selectedCount === 1 ? '' : 's')
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
        toast.info(t.bulkActions.successDeleted.replace('{count}', String(selectedCount)).replace('{plural}', selectedCount === 1 ? '' : 's'))
      } catch {
        toast.error(t.bulkActions.errorDelete)
      }
    })
  }

  return (
    <aside
      className={cn(
        'w-72 bg-card/90 backdrop-blur-sm border-l border-border/60 p-4 flex flex-col gap-4',
        'transition-[width,opacity] duration-200 ease-out'
      )}
      aria-label={t.bulkActions.panelAria}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">
          {t.bulkActions.selectedCount.replace('{count}', String(selectedCount)).replace('{plural}', selectedCount === 1 ? '' : 's')}
        </p>
        <Button type="button" variant="ghost" onClick={exitSelectMode} className="min-h-11 px-3">
          {t.bulkActions.cancel}
        </Button>
      </div>

      <div className="border-t border-border/60" />

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.bulkActions.assignToFolder}</p>
        <Select
          disabled={selectedCount === 0 || pendingAction}
          onValueChange={(value) => {
            const groupId = value === '__none__' ? null : value
            runBulkAction(
              () => bulkMoveToGroup(selectedTaskIds, groupId),
              t.bulkActions.successMoved.replace('{count}', String(selectedCount)).replace('{plural}', selectedCount === 1 ? '' : 's')
            )
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t.bulkActions.selectFolder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{t.bulkActions.noFolder}</SelectItem>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.bulkActions.addTags}</p>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={selectedCount === 0 || pendingAction}
              className="w-full justify-between"
            >
              <span className="truncate text-left">
                {selectedTagIds.size > 0 ? t.bulkActions.tagsSelected.replace('{count}', String(selectedTagIds.size)) : t.bulkActions.selectTags}
              </span>
              <HugeiconsIcon icon={ArrowDown01Icon} size={14} className="text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-2">
            <div className="space-y-2">
              <Input
                value={tagQuery}
                onChange={(event) => setTagQuery(event.target.value)}
                placeholder={t.bulkActions.searchTags}
              />
              <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                {filteredTags.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-muted-foreground">{t.bulkActions.noMatchingTags}</p>
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
                {t.bulkActions.applyTags}
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
        {t.bulkActions.deleteSelected}
      </Button>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={t.bulkActions.deleteTitle}
        description={t.bulkActions.deleteDescription.replace('{count}', String(selectedCount)).replace('{plural}', selectedCount === 1 ? '' : 's')}
        confirmLabel={t.bulkActions.deleteAction}
        onConfirm={handleDeleteSelected}
        isPending={pendingAction}
      />
    </aside>
  )
}
