'use client'

import { useState, useCallback, useRef } from 'react'
import { ChevronDown, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExpandableCardListProps<T> {
  items: T[]
  onSave: (items: T[]) => Promise<{ ok: boolean }>
  renderCollapsed: (item: T) => { primary: string; secondary?: string }
  renderExpanded: (
    item: T,
    onChange: (item: T) => void,
    index: number
  ) => React.ReactNode
  createEmpty: () => T
  addLabel: string
  emptyMessage: string
}

export function ExpandableCardList<T>({
  items,
  onSave,
  renderCollapsed,
  renderExpanded,
  createEmpty,
  addLabel,
  emptyMessage,
}: ExpandableCardListProps<T>) {
  const [localItems, setLocalItems] = useState<T[]>(items)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedSave = useCallback(
    (updated: T[]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        setSaving(true)
        try {
          await onSave(updated)
        } finally {
          setSaving(false)
        }
      }, 500)
    },
    [onSave]
  )

  function handleItemChange(index: number, updated: T) {
    const newItems = [...localItems]
    newItems[index] = updated
    setLocalItems(newItems)
    debouncedSave(newItems)
  }

  function handleAdd() {
    const newItems = [...localItems, createEmpty()]
    setLocalItems(newItems)
    setExpandedIndex(newItems.length - 1)
    // Don't save yet — let user fill in fields first
  }

  function handleDelete(index: number) {
    const newItems = localItems.filter((_, i) => i !== index)
    setLocalItems(newItems)
    setExpandedIndex(null)
    setConfirmDeleteIndex(null)
    debouncedSave(newItems)
  }

  function toggleExpand(index: number) {
    setExpandedIndex(expandedIndex === index ? null : index)
    setConfirmDeleteIndex(null)
  }

  if (localItems.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/60 px-4 py-6 text-center">
        <p className="mb-3 text-sm text-muted-foreground">{emptyMessage}</p>
        <Button type="button" variant="ghost" size="sm" onClick={handleAdd}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {addLabel}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {localItems.map((item, index) => {
        const isExpanded = expandedIndex === index
        const collapsed = renderCollapsed(item)

        return (
          <div
            key={index}
            className="group rounded-md border border-border/60 bg-card transition-colors"
          >
            {/* Collapsed header — always visible */}
            <button
              type="button"
              onClick={() => toggleExpand(index)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150 ${
                  isExpanded ? 'rotate-0' : '-rotate-90'
                }`}
              />
              <span className="flex-1 truncate text-sm font-medium">
                {collapsed.primary || '(untitled)'}
              </span>
              {collapsed.secondary && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {collapsed.secondary}
                </span>
              )}

              {/* Delete */}
              {confirmDeleteIndex === index ? (
                <span
                  className="flex shrink-0 items-center gap-1.5 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-muted-foreground">Delete?</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(index)}
                    className="font-medium text-destructive hover:underline"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteIndex(null)}
                    className="text-muted-foreground hover:underline"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfirmDeleteIndex(index)
                  }}
                  className={`shrink-0 transition-opacity ${isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                  role="button"
                  tabIndex={0}
                  aria-label="Delete item"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </span>
              )}
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-border/40 px-4 py-3">
                {renderExpanded(
                  item,
                  (updated) => handleItemChange(index, updated),
                  index
                )}
              </div>
            )}
          </div>
        )
      })}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleAdd}
        disabled={saving}
        className="h-7 text-xs"
      >
        <Plus className="mr-1 h-3 w-3" />
        {addLabel}
      </Button>
    </div>
  )
}
