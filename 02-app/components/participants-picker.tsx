'use client'

import { useEffect, useRef, useState } from 'react'
import { User, X } from 'lucide-react'
import { FloatingMenu } from '@/components/floating-menu'
import { IconButton } from '@/components/icon-button'
import { useDebouncedSave } from '@/lib/save-feedback'
import { cn } from '@/lib/utils'
import type { PersonSummary } from '@/lib/types/source-list'

interface ParticipantsPickerProps {
  value: string[]
  hydratedPeople: PersonSummary[]
  onSave: (ids: string[]) => Promise<{ ok: boolean; error?: string }>
  searchPeople: (query: string) => Promise<PersonSummary[]>
  onParkUnresolved: (
    name: string,
  ) => Promise<{ ok: true; person: PersonSummary } | { ok: false; error: string }>
  suggestions?: PersonSummary[]
  label?: string
  readOnly?: boolean
  debounceMs?: number
  className?: string
}

export function ParticipantsPicker({
  value,
  hydratedPeople,
  onSave,
  searchPeople,
  onParkUnresolved,
  suggestions = [],
  label,
  readOnly = false,
  debounceMs = 500,
  className,
}: ParticipantsPickerProps) {
  const [ids, setIds] = useState<string[]>(value)
  // Local people cache so freshly-added / parked people render immediately.
  const [people, setPeople] = useState<Map<string, PersonSummary>>(() => {
    const m = new Map<string, PersonSummary>()
    for (const p of hydratedPeople) m.set(p.id, p)
    return m
  })
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PersonSummary[]>([])
  const [searching, setSearching] = useState(false)
  const [parking, setParking] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { state: saveState, errorMsg, trigger } = useDebouncedSave({ value: ids, onSave, debounceMs })

  // Keep local in sync with parent revalidation
  useEffect(() => {
    setIds(value)
  }, [value])

  // Merge any newly-hydrated people from parent
  useEffect(() => {
    setPeople((prev) => {
      const m = new Map(prev)
      for (const p of hydratedPeople) m.set(p.id, p)
      return m
    })
  }, [hydratedPeople])

  // Debounced search
  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await searchPeople(trimmed)
        setResults(r)
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, open, searchPeople])

  // Focus search input on open
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  const commit = (nextIds: string[]) => {
    setIds(nextIds)
    trigger(nextIds)
  }

  const addPerson = (p: PersonSummary) => {
    if (ids.includes(p.id)) return
    setPeople((prev) => new Map(prev).set(p.id, p))
    commit([...ids, p.id])
    setOpen(false)
    setQuery('')
  }

  const removePerson = (id: string) => {
    commit(ids.filter((x) => x !== id))
  }

  const handlePark = async () => {
    const trimmed = query.trim()
    if (!trimmed) return
    setParking(true)
    try {
      const result = await onParkUnresolved(trimmed)
      if (result.ok) {
        addPerson(result.person)
      }
    } finally {
      setParking(false)
    }
  }

  const availableSuggestions = suggestions.filter((s) => !ids.includes(s.id))
  const parkDisabled = parking || !query.trim()

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
        {ids.map((id) => {
          const p = people.get(id) ?? { id, name: 'Unknown' }
          const unresolved = id.startsWith('unresolved-')
          return (
            <span
              key={id}
              className="group relative inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs text-foreground"
            >
              <span>{p.name}</span>
              {unresolved && (
                <span className="text-[10px] text-warning ml-0.5">(unresolved)</span>
              )}
              {!readOnly && (
                <span className="ml-0.5 hidden group-hover:inline-flex">
                  <IconButton
                    icon={X}
                    label={`Remove ${p.name}`}
                    variant="ghost"
                    size="sm"
                    tooltip={false}
                    onClick={() => removePerson(id)}
                    className="h-4 w-4"
                  />
                </span>
              )}
            </span>
          )
        })}

        {!readOnly && (
          <FloatingMenu
            open={open}
            onOpenChange={(o) => {
              setOpen(o)
              if (!o) setQuery('')
            }}
            align="start"
            side="bottom"
            minWidth="280px"
            className="w-72"
            trigger={
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                + Add person
              </button>
            }
          >
            <div className="flex flex-col">
              <div className="px-2 pt-2 pb-1 border-b border-border/40">
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search people…"
                  className="w-full bg-transparent border-0 px-0 py-1 text-sm focus:outline-none"
                />
              </div>

              <div className="max-h-56 overflow-y-auto py-1">
                {!query.trim() ? (
                  <div className="px-2 py-2 text-xs text-muted-foreground">Type to search people</div>
                ) : searching ? (
                  <div className="px-2 py-2 text-xs text-muted-foreground">Searching…</div>
                ) : results.length === 0 ? (
                  <div className="px-2 py-2 text-xs text-muted-foreground">No matches</div>
                ) : (
                  results.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addPerson(p)}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded-md cursor-pointer w-full text-left"
                    >
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm truncate">{p.name}</span>
                      {(p.role || p.org) && (
                        <span className="text-[11px] text-muted-foreground truncate">
                          {[p.role, p.org].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>

              <div className="border-t border-border/40 px-2 py-1.5">
                <button
                  type="button"
                  onClick={handlePark}
                  disabled={parkDisabled}
                  className={cn(
                    'w-full text-left text-xs rounded-md px-2 py-1',
                    parkDisabled
                      ? 'text-muted-foreground/40 cursor-not-allowed'
                      : 'text-warning hover:bg-warning-bg',
                  )}
                >
                  {parking ? 'Parking…' : `Park "${query.trim() || '…'}" as unresolved`}
                </button>
              </div>
            </div>
          </FloatingMenu>
        )}
      </div>

      {!readOnly && availableSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Suggested:</span>
          {availableSuggestions.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => addPerson(p)}
              className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40"
            >
              <span>+ {p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
