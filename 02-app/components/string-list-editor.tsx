'use client'

import { useState, useRef, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface StringListEditorProps {
  values: string[]
  onSave: (values: string[]) => Promise<{ ok: boolean }>
  placeholder?: string
  label?: string
}

export function StringListEditor({
  values,
  onSave,
  placeholder = 'Add item…',
  label,
}: StringListEditorProps) {
  const [items, setItems] = useState<string[]>(values)
  const [newValue, setNewValue] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const save = useCallback(
    async (updated: string[]) => {
      setSaving(true)
      try {
        await onSave(updated)
      } finally {
        setSaving(false)
      }
    },
    [onSave]
  )

  function handleAdd() {
    const trimmed = newValue.trim()
    if (!trimmed) return
    const updated = [...items, trimmed]
    setItems(updated)
    setNewValue('')
    inputRef.current?.focus()
    save(updated)
  }

  function handleRemove(index: number) {
    const updated = items.filter((_, i) => i !== index)
    setItems(updated)
    save(updated)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  function startEdit(index: number) {
    setEditingIndex(index)
    setEditValue(items[index])
  }

  function commitEdit() {
    if (editingIndex === null) return
    const trimmed = editValue.trim()
    if (!trimmed) {
      // Empty = delete
      handleRemove(editingIndex)
    } else if (trimmed !== items[editingIndex]) {
      const updated = [...items]
      updated[editingIndex] = trimmed
      setItems(updated)
      save(updated)
    }
    setEditingIndex(null)
    setEditValue('')
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit()
    }
    if (e.key === 'Escape') {
      setEditingIndex(null)
      setEditValue('')
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      )}

      {items.length > 0 && (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li
              key={i}
              className="group flex items-start gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-muted/50"
            >
              {editingIndex === i ? (
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={handleEditKeyDown}
                  className="h-7 flex-1 text-sm"
                  autoFocus
                />
              ) : (
                <span
                  className="flex-1 cursor-text leading-snug"
                  onClick={() => startEdit(i)}
                >
                  {item}
                </span>
              )}
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                aria-label={`Remove "${item}"`}
              >
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-8 text-sm"
          disabled={saving}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAdd}
          disabled={!newValue.trim() || saving}
          className="h-8 shrink-0 px-2"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
