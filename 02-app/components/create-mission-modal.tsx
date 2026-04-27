'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2 } from 'lucide-react'
import { Modal } from '@/components/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createMission, findVerticals, createVertical } from '@/app/actions/missions'
import type { MissionVertical } from '@/lib/types/missions'

interface CreateMissionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateMissionModal({ open, onOpenChange }: CreateMissionModalProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [thesis, setThesis] = useState('')
  const [selectedVerticals, setSelectedVerticals] = useState<MissionVertical[]>([])
  const [verticalSearch, setVerticalSearch] = useState('')
  const [verticalResults, setVerticalResults] = useState<MissionVertical[]>([])
  const [showVerticalDropdown, setShowVerticalDropdown] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  // Reset on close
  useEffect(() => {
    if (!open) {
      setName('')
      setThesis('')
      setSelectedVerticals([])
      setVerticalSearch('')
      setVerticalResults([])
      setError(null)
    }
  }, [open])

  // Search verticals with debounce
  useEffect(() => {
    if (!verticalSearch.trim()) {
      setVerticalResults([])
      return
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await findVerticals(verticalSearch)
      // Filter out already-selected
      const selectedIds = new Set(selectedVerticals.map((v) => v.id))
      setVerticalResults(results.filter((v) => !selectedIds.has(v.id)))
    }, 200)
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [verticalSearch, selectedVerticals])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowVerticalDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelectVertical = (vertical: MissionVertical) => {
    setSelectedVerticals((prev) => [...prev, vertical])
    setVerticalSearch('')
    setVerticalResults([])
    setShowVerticalDropdown(false)
  }

  const handleCreateVertical = async () => {
    const trimmed = verticalSearch.trim()
    if (!trimmed) return
    // Optimistic: add to selected with temp ID, will be replaced on submit
    setSelectedVerticals((prev) => [...prev, { id: `new:${trimmed}`, name: trimmed }])
    setVerticalSearch('')
    setVerticalResults([])
    setShowVerticalDropdown(false)
  }

  const handleRemoveVertical = (id: string) => {
    setSelectedVerticals((prev) => prev.filter((v) => v.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Mission name is required.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Resolve vertical IDs — create any new ones first
      const verticalIds: string[] = []
      for (const v of selectedVerticals) {
        if (v.id.startsWith('new:')) {
          const result = await createVertical(v.name)
          if (result.ok) {
            verticalIds.push(result.data.id)
          }
        } else {
          verticalIds.push(v.id)
        }
      }

      const result = await createMission(name.trim(), thesis.trim() || undefined, verticalIds)

      if (!result.ok) {
        setError(result.error)
        setSubmitting(false)
        return
      }

      onOpenChange(false)
      router.push(`/projects/missions/${result.data.id}`)
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  const showCreateOption = verticalSearch.trim() &&
    !verticalResults.some((v) => v.name.toLowerCase() === verticalSearch.trim().toLowerCase()) &&
    !selectedVerticals.some((v) => v.name.toLowerCase() === verticalSearch.trim().toLowerCase())

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="New mission" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="mission-name" className="text-sm font-medium">Mission name</label>
          <Input
            id="mission-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. European Reshoring Funding Patterns"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="mission-thesis" className="text-sm font-medium">Thesis (optional)</label>
          <Textarea
            id="mission-thesis"
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
            placeholder="What question are you investigating?"
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <span className="text-sm font-medium">Verticals (optional)</span>

          {/* Selected chips */}
          {selectedVerticals.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedVerticals.map((v) => (
                <span
                  key={v.id}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
                >
                  {v.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveVertical(v.id)}
                    className="rounded-full p-0.5 hover:bg-foreground/10 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search input + dropdown */}
          <div className="relative" ref={dropdownRef}>
            <Input
              value={verticalSearch}
              onChange={(e) => {
                setVerticalSearch(e.target.value)
                setShowVerticalDropdown(true)
              }}
              onFocus={() => setShowVerticalDropdown(true)}
              placeholder="Search or create verticals..."
            />
            {showVerticalDropdown && (verticalResults.length > 0 || showCreateOption) && (
              <div className="absolute z-10 mt-1 w-full rounded-md border bg-card shadow-[var(--shadow-raised)] max-h-48 overflow-auto">
                {verticalResults.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleSelectVertical(v)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                  >
                    {v.name}
                  </button>
                ))}
                {showCreateOption && (
                  <button
                    type="button"
                    onClick={handleCreateVertical}
                    className="w-full px-3 py-2 text-left text-sm text-primary hover:bg-muted/50 transition-colors border-t"
                  >
                    + Create &ldquo;{verticalSearch.trim()}&rdquo;
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !name.trim()}>
            {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Create mission
          </Button>
        </div>
      </form>
    </Modal>
  )
}
