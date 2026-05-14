'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { TypeBadge } from '@/components/type-badge'
import { IconButton } from '@/components/icon-button'
import { tagHue } from '@/lib/tag-hue'
import { useDebouncedSave } from '@/lib/save-feedback'
import { cn } from '@/lib/utils'

interface TagListEditorProps {
  value: string[]
  onSave: (value: string[]) => Promise<{ ok: boolean; error?: string }>
  suggestions?: string[]
  label?: string
  placeholder?: string
  readOnly?: boolean
  debounceMs?: number
  className?: string
}

function normaliseTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function TagListEditor({
  value,
  onSave,
  suggestions = [],
  label,
  placeholder = 'Add tag',
  readOnly = false,
  debounceMs = 500,
  className,
}: TagListEditorProps) {
  const [tags, setTags] = useState<string[]>(value)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { state: saveState, errorMsg, trigger } = useDebouncedSave({ value: tags, onSave, debounceMs })

  // Keep local in sync if parent updates value (e.g. after revalidate)
  useEffect(() => {
    setTags(value)
  }, [value])

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  const commit = (next: string[]) => {
    setTags(next)
    trigger(next)
  }

  const addFromDraft = () => {
    const t = normaliseTag(draft)
    setDraft('')
    setEditing(false)
    if (!t) return
    if (tags.includes(t)) return
    commit([...tags, t])
  }

  const removeAt = (idx: number) => {
    const next = tags.filter((_, i) => i !== idx)
    commit(next)
  }

  const acceptSuggestion = (s: string) => {
    const t = normaliseTag(s)
    if (!t || tags.includes(t)) return
    commit([...tags, t])
  }

  const availableSuggestions = suggestions.filter((s) => !tags.includes(normaliseTag(s)))

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          {saveState === 'saved' && <span className="text-[10px] text-success">Saved</span>}
          {saveState === 'error' && (
            <span className="text-[10px] text-destructive">{errorMsg ?? 'Failed'}</span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag, idx) => (
          <span key={tag} className="group relative inline-flex items-center">
            <TypeBadge hue={tagHue(tag)} label={tag} size="xs" />
            {!readOnly && (
              <span className="absolute -right-1 -top-1 hidden group-hover:inline-flex">
                <IconButton
                  icon={X}
                  label={`Remove ${tag}`}
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAt(idx)}
                  className="h-4 w-4 rounded-full bg-card shadow-sm"
                />
              </span>
            )}
          </span>
        ))}

        {!readOnly &&
          (editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={addFromDraft}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addFromDraft()
                } else if (e.key === 'Escape') {
                  setDraft('')
                  setEditing(false)
                }
              }}
              placeholder={placeholder}
              className="bg-transparent border-0 px-1 text-xs focus:outline-none w-32"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              + Add tag
            </button>
          ))}
      </div>

      {!readOnly && availableSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Suggested:</span>
          {availableSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => acceptSuggestion(s)}
              className="opacity-60 hover:opacity-100 transition-opacity"
              aria-label={`Add ${s}`}
            >
              <TypeBadge hue={tagHue(s)} label={`+ ${s}`} size="xs" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
