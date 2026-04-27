'use client'

import { useState, useCallback, useRef } from 'react'
import { Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface KeyValueEditorProps {
  data: Record<string, string | number>
  onSave: (data: Record<string, string | number>) => Promise<{ ok: boolean }>
  notesKey?: string
}

export function KeyValueEditor({
  data,
  onSave,
  notesKey = 'notes',
}: KeyValueEditorProps) {
  const [entries, setEntries] = useState<Record<string, string | number>>(data)
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedSave = useCallback(
    (updated: Record<string, string | number>) => {
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

  // Separate notes from key-value pairs
  const notesValue = (entries[notesKey] as string) || ''
  const kvPairs = Object.entries(entries).filter(([k]) => k !== notesKey)

  function handleKeyChange(oldKey: string, newKey: string) {
    const updated = { ...entries }
    const val = updated[oldKey]
    delete updated[oldKey]
    if (newKey.trim()) {
      updated[newKey] = val
    }
    setEntries(updated)
    debouncedSave(updated)
  }

  function handleValueChange(key: string, value: string) {
    const numVal = Number(value)
    const updated = {
      ...entries,
      [key]: !isNaN(numVal) && value.trim() !== '' ? numVal : value,
    }
    setEntries(updated)
    debouncedSave(updated)
  }

  function handleNotesChange(value: string) {
    const updated = { ...entries, [notesKey]: value }
    setEntries(updated)
    debouncedSave(updated)
  }

  function handleAdd() {
    const newKey = `field_${kvPairs.length + 1}`
    const updated = { ...entries, [newKey]: '' }
    setEntries(updated)
  }

  function handleRemove(key: string) {
    const updated = { ...entries }
    delete updated[key]
    setEntries(updated)
    debouncedSave(updated)
  }

  return (
    <div className="space-y-3">
      {kvPairs.length > 0 && (
        <div className="space-y-2">
          {kvPairs.map(([key, value]) => (
            <div key={key} className="group flex items-center gap-2">
              <Input
                defaultValue={key}
                onBlur={(e) => {
                  if (e.target.value !== key) handleKeyChange(key, e.target.value)
                }}
                placeholder="Field name"
                className="h-8 flex-1 text-sm"
              />
              <Input
                value={String(value)}
                onChange={(e) => handleValueChange(key, e.target.value)}
                placeholder="Value"
                className="h-8 flex-1 text-sm"
              />
              <button
                type="button"
                onClick={() => handleRemove(key)}
                className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                aria-label={`Remove ${key}`}
              >
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleAdd}
        className="h-7 text-xs"
      >
        <Plus className="mr-1 h-3 w-3" />
        Add field
      </Button>

      {/* Notes textarea */}
      <div className="pt-1">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Notes
        </p>
        <Textarea
          value={notesValue}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Additional notes about these limits…"
          rows={2}
          className="text-sm"
          disabled={saving}
        />
      </div>
    </div>
  )
}
