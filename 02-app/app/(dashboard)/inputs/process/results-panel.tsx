'use client'

import { useState, useMemo } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { CategorySection } from './category-section'
import type {
  ExtractionResult,
  CommitResult,
  StorySubject,
} from '@/lib/types/processing'

interface ResultsPanelProps {
  result: ExtractionResult
  onClose: () => void
  onCommitSuccess: (commitResult: CommitResult) => void
}

export function ResultsPanel({ result, onClose, onCommitSuccess }: ResultsPanelProps) {
  const { extraction } = result

  // Build initial checked state — all items checked by default
  const allIds = useMemo(() => [
    ...extraction.ideas.map((i) => i.id),
    ...extraction.concepts.map((c) => c.id),
    ...extraction.people.map((p) => p.id),
    ...extraction.organisations.map((o) => o.id),
    ...extraction.stories.map((s) => s.id),
    ...extraction.techniques.map((t) => t.id),
    ...extraction.contentAngles.map((a) => a.id),
  ], [extraction])

  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set(allIds))
  const [storySubjects, setStorySubjects] = useState<Record<string, StorySubject>>({})
  const [committing, setCommitting] = useState(false)
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null)
  const [showErrors, setShowErrors] = useState(false)

  const checkedCount = checkedIds.size
  const totalCount = allIds.length

  const populatedCategories = [
    extraction.ideas,
    extraction.concepts,
    extraction.people,
    extraction.organisations,
    extraction.stories,
    extraction.techniques,
    extraction.contentAngles,
  ].filter((arr) => arr.length > 0).length

  function toggleItem(id: string, checked: boolean) {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleAll(ids: string[], checked: boolean) {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  function toggleGlobal(checked: boolean) {
    setCheckedIds(checked ? new Set(allIds) : new Set())
  }

  async function handleCommit() {
    if (checkedCount === 0) return
    setCommitting(true)

    try {
      const res = await fetch('/api/process/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result,
          confirmedIds: Array.from(checkedIds),
          storySubjects,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      const commitRes: CommitResult = await res.json()
      setCommitResult(commitRes)
      onCommitSuccess(commitRes)

      if (!commitRes.success && commitRes.errors.length > 0) {
        // Partial failure — shown inline, not toast
      }
    } catch (err) {
      toast.error('Save failed — nothing was written. Please try again.')
    } finally {
      setCommitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Success state
  // ---------------------------------------------------------------------------
  if (commitResult) {
    const { counts, errors } = commitResult
    const parts = [
      counts.ideas > 0 && `${counts.ideas} idea${counts.ideas !== 1 ? 's' : ''}`,
      counts.concepts > 0 && `${counts.concepts} concept${counts.concepts !== 1 ? 's' : ''}`,
      counts.people > 0 && `${counts.people} person${counts.people !== 1 ? '' : ''}`,
      counts.organisations > 0 && `${counts.organisations} org${counts.organisations !== 1 ? 's' : ''}`,
      counts.stories > 0 && `${counts.stories} stor${counts.stories !== 1 ? 'ies' : 'y'}`,
      counts.techniques > 0 && `${counts.techniques} technique${counts.techniques !== 1 ? 's' : ''}`,
      counts.contentAngles > 0 && `${counts.contentAngles} angle${counts.contentAngles !== 1 ? 's' : ''}`,
      counts.sourceDocument > 0 && `1 source document`,
    ].filter(Boolean) as string[]

    return (
      <div className="w-[480px] shrink-0 flex flex-col h-full border-l border-border bg-background">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">Saved to BigBrain</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {parts.join(' · ')}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {errors.length > 0 && (
            <div className="text-xs text-destructive bg-destructive/10 rounded p-3">
              <p className="font-medium mb-1">Saved with errors — {errors.length} item{errors.length !== 1 ? 's' : ''} failed.</p>
              <button
                className="flex items-center gap-1 text-xs underline"
                onClick={() => setShowErrors((v) => !v)}
              >
                {showErrors ? 'Hide' : 'View'} details
                <ChevronDown className={`h-3 w-3 transition-transform ${showErrors ? 'rotate-180' : ''}`} />
              </button>
              {showErrors && (
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  {errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-border px-5 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-md bg-primary text-primary-foreground text-sm font-medium py-2 hover:bg-primary/90 transition-colors"
          >
            Process another
          </button>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Empty extraction state
  // ---------------------------------------------------------------------------
  const isEmpty = allIds.length === 0

  // ---------------------------------------------------------------------------
  // Normal panel
  // ---------------------------------------------------------------------------
  return (
    <div className="w-[480px] shrink-0 flex flex-col h-full border-l border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <div>
          <h2 className="text-sm font-semibold">
            {isEmpty ? 'Nothing significant found' : 'What we found'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isEmpty
              ? 'Try a longer or more detailed input, or check that your text is readable.'
              : `${checkedCount} of ${totalCount} item${totalCount !== 1 ? 's' : ''} selected · ${populatedCategories} categor${populatedCategories !== 1 ? 'ies' : 'y'}`}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No ideas, concepts, people, or other knowledge items were found in this text.
          </p>
          <button
            onClick={onClose}
            className="text-sm text-muted-foreground underline"
          >
            Close
          </button>
          <button
            onClick={handleCommit}
            className="text-xs text-muted-foreground"
          >
            Save source only
          </button>
        </div>
      ) : (
        <>
          {/* Global controls */}
          <div className="flex items-center gap-3 px-5 py-2 border-b border-border shrink-0">
            <button
              onClick={() => toggleGlobal(true)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Select all
            </button>
            <button
              onClick={() => toggleGlobal(false)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Deselect all
            </button>
          </div>

          {/* Category sections */}
          <div className="flex-1 overflow-y-auto">
            <CategorySection
              label="IDEAS"
              items={extraction.ideas}
              checkedIds={checkedIds}
              onToggleItem={toggleItem}
              onToggleAll={toggleAll}
            />
            <CategorySection
              label="CONCEPTS"
              items={extraction.concepts}
              checkedIds={checkedIds}
              onToggleItem={toggleItem}
              onToggleAll={toggleAll}
            />
            <CategorySection
              label="PEOPLE"
              items={extraction.people}
              checkedIds={checkedIds}
              onToggleItem={toggleItem}
              onToggleAll={toggleAll}
            />
            <CategorySection
              label="ORGANISATIONS"
              items={extraction.organisations}
              checkedIds={checkedIds}
              onToggleItem={toggleItem}
              onToggleAll={toggleAll}
            />
            <CategorySection
              label="STORIES"
              items={extraction.stories}
              checkedIds={checkedIds}
              onToggleItem={toggleItem}
              onToggleAll={toggleAll}
              storySubjects={storySubjects}
              onStorySubjectChange={(id, subject) =>
                setStorySubjects((prev) => ({ ...prev, [id]: subject }))
              }
            />
            <CategorySection
              label="TECHNIQUES"
              items={extraction.techniques}
              checkedIds={checkedIds}
              onToggleItem={toggleItem}
              onToggleAll={toggleAll}
            />
            <CategorySection
              label="CONTENT ANGLES"
              items={extraction.contentAngles}
              checkedIds={checkedIds}
              onToggleItem={toggleItem}
              onToggleAll={toggleAll}
            />
          </div>

          {/* Sticky footer */}
          <div className="border-t border-border px-5 py-4 shrink-0 space-y-2">
            {committing && (
              <p className="text-xs text-muted-foreground text-center">Writing to graph and database…</p>
            )}
            <button
              onClick={handleCommit}
              disabled={checkedCount === 0 || committing}
              className="w-full rounded-md bg-primary text-primary-foreground text-sm font-medium py-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {committing ? 'Saving…' : `Save ${checkedCount} to BigBrain`}
            </button>
            <button
              onClick={onClose}
              disabled={committing}
              className="w-full text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}
