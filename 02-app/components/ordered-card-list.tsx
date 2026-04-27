'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface CardField {
  key: string
  label: string
  type: 'text' | 'textarea'
  placeholder?: string
  rows?: number
}

export interface CardItem {
  [key: string]: unknown
}

interface OrderedCardListProps {
  items: CardItem[]
  fields: CardField[]
  onUpdate: (items: CardItem[]) => Promise<{ ok: boolean; error?: string }>
  emptyMessage: string
  addLabel: string
  /** Optional: generate a default new item. Receives the next sortOrder. */
  newItemDefaults?: (sortOrder: number) => CardItem
}

export function OrderedCardList({
  items,
  fields,
  onUpdate,
  emptyMessage,
  addLabel,
  newItemDefaults,
}: OrderedCardListProps) {
  const [localItems, setLocalItems] = useState<CardItem[]>(items)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const lastPropRef = useRef(JSON.stringify(items))

  // Only sync from props when the prop itself changes (server revalidation),
  // not when local edits make them diverge
  useEffect(() => {
    const propStr = JSON.stringify(items)
    if (propStr !== lastPropRef.current) {
      lastPropRef.current = propStr
      setLocalItems(items)
    }
  }, [items])

  async function persist(updated: CardItem[]) {
    setSaving(true)
    setSaveStatus('idle')
    const result = await onUpdate(updated)
    setSaving(false)
    setSaveStatus(result.ok ? 'saved' : 'error')
    if (result.ok) {
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }

  function handleFieldChange(index: number, key: string, value: string) {
    const updated = [...localItems]
    updated[index] = { ...updated[index], [key]: value }
    setLocalItems(updated)
  }

  function handleFieldBlur() {
    persist(localItems)
  }

  function handleAdd() {
    const nextOrder = localItems.length + 1
    const newItem = newItemDefaults
      ? newItemDefaults(nextOrder)
      : fields.reduce((acc, f) => ({ ...acc, [f.key]: '' }), { sortOrder: nextOrder } as CardItem)
    const updated = [...localItems, newItem]
    setLocalItems(updated)
    persist(updated)
  }

  function handleDelete(index: number) {
    const updated = localItems
      .filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, sortOrder: i + 1, step: i + 1 }))
    setLocalItems(updated)
    persist(updated)
  }

  function handleMoveUp(index: number) {
    if (index === 0) return
    const updated = [...localItems]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    const reordered = updated.map((item, i) => ({ ...item, sortOrder: i + 1, step: i + 1 }))
    setLocalItems(reordered)
    persist(reordered)
  }

  function handleMoveDown(index: number) {
    if (index >= localItems.length - 1) return
    const updated = [...localItems]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    const reordered = updated.map((item, i) => ({ ...item, sortOrder: i + 1, step: i + 1 }))
    setLocalItems(reordered)
    persist(reordered)
  }

  if (localItems.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        <Button variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          {addLabel}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {saveStatus === 'saved' && (
        <p className="text-xs text-success">Saved</p>
      )}
      {saveStatus === 'error' && (
        <p className="text-xs text-destructive">Save failed</p>
      )}

      {localItems.map((item, index) => (
        <div
          key={index}
          className="group relative flex gap-2 rounded-lg border border-border p-4"
        >
          {/* Grip + order controls */}
          <div className="flex flex-col items-center gap-0.5 pt-0.5">
            <GripVertical className="h-4 w-4 text-muted-foreground/40" />
            <button
              type="button"
              onClick={() => handleMoveUp(index)}
              disabled={index === 0}
              className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
            >
              <ChevronUp className="h-3 w-3 text-muted-foreground" />
            </button>
            <span className="text-[10px] font-medium text-muted-foreground">{index + 1}</span>
            <button
              type="button"
              onClick={() => handleMoveDown(index)}
              disabled={index >= localItems.length - 1}
              className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
            >
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>

          {/* Fields */}
          <div className="flex-1 flex flex-col gap-2">
            {fields.map(field => (
              <div key={field.key}>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {field.label}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={(item[field.key] as string) ?? ''}
                    onChange={e => handleFieldChange(index, field.key, e.target.value)}
                    onBlur={handleFieldBlur}
                    placeholder={field.placeholder}
                    rows={field.rows ?? 3}
                    className="mt-0.5 w-full resize-none rounded-md border border-border/60 bg-transparent px-3 py-2 text-sm focus:border-[var(--field-active)]/50 focus:bg-[var(--field-active)]/[0.03] focus:outline-none transition-colors"
                  />
                ) : (
                  <input
                    type="text"
                    value={(item[field.key] as string) ?? ''}
                    onChange={e => handleFieldChange(index, field.key, e.target.value)}
                    onBlur={handleFieldBlur}
                    placeholder={field.placeholder}
                    className="mt-0.5 w-full rounded-md border border-border/60 bg-transparent px-3 py-2 text-sm font-medium focus:border-[var(--field-active)]/50 focus:bg-[var(--field-active)]/[0.03] focus:outline-none transition-colors"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Delete */}
          <button
            type="button"
            onClick={() => handleDelete(index)}
            className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-1 hover:bg-destructive/10 self-start"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </button>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={handleAdd} className="self-start">
        <Plus className="mr-1 h-3.5 w-3.5" />
        {addLabel}
      </Button>
    </div>
  )
}
