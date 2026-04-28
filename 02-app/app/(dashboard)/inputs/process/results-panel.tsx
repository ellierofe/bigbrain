'use client'

import { useState, useMemo, useCallback } from 'react'
import { X, ChevronDown, ChevronRight, LayoutGrid, List } from 'lucide-react'
// DS-07 exception: Checkbox used for bulk-selection UI (transient selection state, not
// field-level autosave).
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { CategorySection, type AnyItem } from './category-section'
import type {
  ExtractionResult,
  ExtractionOutput,
  CommitResult,
  StorySubject,
} from '@/lib/types/processing'

type GroupMode = 'topic' | 'type'

interface TopicCluster {
  topic: string
  items: Array<{ id: string; category: string }>
}

interface DedupMatch {
  matchedNodeName: string
  score: number
  source: 'graph' | 'pending'
}

interface ResultsPanelProps {
  result: ExtractionResult
  onClose: () => void
  onCommitSuccess: (commitResult: CommitResult) => void
  /** Pre-computed topic clusters (from ingestion or on-the-fly) */
  topicClusters?: TopicCluster[]
  /** Whether topic clusters are currently loading */
  clusteringInProgress?: boolean
  /** Dedup matches keyed by item id */
  dedupMatches?: Record<string, DedupMatch[]>
  /** Canonical matches keyed by item id */
  canonicalMatches?: Record<string, string>
  /** Whether dedup is loading */
  dedupInProgress?: boolean
}

type CategoryKey = keyof ExtractionOutput

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  ideas: 'IDEAS',
  concepts: 'CONCEPTS',
  people: 'PEOPLE',
  organisations: 'ORGANISATIONS',
  stories: 'STORIES',
  techniques: 'TECHNIQUES',
  contentAngles: 'CONTENT ANGLES',
}

const CATEGORY_ORDER: CategoryKey[] = [
  'ideas', 'concepts', 'people', 'organisations', 'stories', 'techniques', 'contentAngles',
]

export function ResultsPanel({
  result,
  onClose,
  onCommitSuccess,
  topicClusters,
  clusteringInProgress,
  dedupMatches = {},
  canonicalMatches = {},
  dedupInProgress,
}: ResultsPanelProps) {
  // Mutable extraction state — edits modify this, commit sends this
  const [editedExtraction, setEditedExtraction] = useState<ExtractionOutput>(
    () => structuredClone(result.extraction)
  )

  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => {
    const allIds = getAllIds(editedExtraction)
    return new Set(allIds)
  })
  const [storySubjects, setStorySubjects] = useState<Record<string, StorySubject>>({})
  const [committing, setCommitting] = useState(false)
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const [groupMode, setGroupMode] = useState<GroupMode>(topicClusters ? 'topic' : 'type')

  const allIds = useMemo(() => getAllIds(editedExtraction), [editedExtraction])
  const checkedCount = checkedIds.size
  const totalCount = allIds.length

  const populatedCategories = CATEGORY_ORDER.filter(
    (key) => editedExtraction[key].length > 0
  ).length

  // -------------------------------------------------------------------------
  // Edit handler — updates a single item in the mutable extraction
  // -------------------------------------------------------------------------

  const handleEditItem = useCallback((itemId: string, updates: Partial<AnyItem>) => {
    setEditedExtraction((prev) => {
      const next = structuredClone(prev)
      for (const key of CATEGORY_ORDER) {
        const arr = next[key] as AnyItem[]
        const idx = arr.findIndex((i) => i.id === itemId)
        if (idx !== -1) {
          arr[idx] = { ...arr[idx], ...updates }
          break
        }
      }
      return next
    })
  }, [])

  // -------------------------------------------------------------------------
  // Toggle helpers
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Commit — sends the edited extraction
  // -------------------------------------------------------------------------

  async function handleCommit() {
    if (checkedCount === 0) return
    setCommitting(true)

    try {
      const res = await fetch('/api/process/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result: { ...result, extraction: editedExtraction },
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
    } catch (err) {
      toast.error('Save failed — nothing was written. Please try again.')
    } finally {
      setCommitting(false)
    }
  }

  // -------------------------------------------------------------------------
  // Success state
  // -------------------------------------------------------------------------
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
          {errors.length === 0 ? (
            <p className="text-sm text-muted-foreground">Everything was written to the graph and database successfully.</p>
          ) : (
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

  // -------------------------------------------------------------------------
  // Empty extraction state
  // -------------------------------------------------------------------------
  const isEmpty = allIds.length === 0

  // -------------------------------------------------------------------------
  // Topic-clustered view
  // -------------------------------------------------------------------------
  function renderTopicView() {
    if (!topicClusters || topicClusters.length === 0) {
      if (clusteringInProgress) {
        return (
          <div className="px-5 py-4 text-xs text-muted-foreground">
            Analysing topics...
          </div>
        )
      }
      // Fall back to type view if no clusters
      return renderTypeView()
    }

    return topicClusters.map((cluster) => {
      // Group this cluster's items by category
      const byCategory: Partial<Record<CategoryKey, AnyItem[]>> = {}
      for (const ref of cluster.items) {
        const key = ref.category as CategoryKey
        const arr = editedExtraction[key] as AnyItem[]
        const item = arr.find((i) => i.id === ref.id)
        if (item) {
          if (!byCategory[key]) byCategory[key] = []
          byCategory[key]!.push(item)
        }
      }

      const clusterItemIds = cluster.items.map((i) => i.id)
      const clusterCheckedCount = clusterItemIds.filter((id) => checkedIds.has(id)).length

      return (
        <TopicSection
          key={cluster.topic}
          topic={cluster.topic}
          totalItems={cluster.items.length}
          checkedCount={clusterCheckedCount}
          onToggleAll={(checked) => toggleAll(clusterItemIds, checked)}
        >
          {CATEGORY_ORDER.map((key) => {
            const items = byCategory[key]
            if (!items || items.length === 0) return null
            return (
              <CategorySection
                key={key}
                label={CATEGORY_LABELS[key]}
                items={items}
                checkedIds={checkedIds}
                onToggleItem={toggleItem}
                onToggleAll={toggleAll}
                onEditItem={handleEditItem}
                storySubjects={key === 'stories' ? storySubjects : undefined}
                onStorySubjectChange={key === 'stories' ? (id, subject) =>
                  setStorySubjects((prev) => ({ ...prev, [id]: subject })) : undefined}
                dedupMatches={dedupMatches}
                canonicalMatches={canonicalMatches}
              />
            )
          })}
        </TopicSection>
      )
    })
  }

  // -------------------------------------------------------------------------
  // Type-grouped view (original)
  // -------------------------------------------------------------------------
  function renderTypeView() {
    return CATEGORY_ORDER.map((key) => (
      <CategorySection
        key={key}
        label={CATEGORY_LABELS[key]}
        items={editedExtraction[key] as AnyItem[]}
        checkedIds={checkedIds}
        onToggleItem={toggleItem}
        onToggleAll={toggleAll}
        onEditItem={handleEditItem}
        storySubjects={key === 'stories' ? storySubjects : undefined}
        onStorySubjectChange={key === 'stories' ? (id, subject) =>
          setStorySubjects((prev) => ({ ...prev, [id]: subject })) : undefined}
        dedupMatches={dedupMatches}
        canonicalMatches={canonicalMatches}
      />
    ))
  }

  // -------------------------------------------------------------------------
  // Main panel
  // -------------------------------------------------------------------------
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
          {/* Controls bar */}
          <div className="flex items-center justify-between px-5 py-2 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
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
            {/* Group mode toggle */}
            {topicClusters && topicClusters.length > 0 && (
              <div className="flex items-center gap-1 border border-border rounded">
                <button
                  onClick={() => setGroupMode('topic')}
                  className={`p-1 ${groupMode === 'topic' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  aria-label="Group by topic"
                  title="Group by topic"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setGroupMode('type')}
                  className={`p-1 ${groupMode === 'type' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  aria-label="Group by type"
                  title="Group by type"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Dedup loading indicator */}
          {dedupInProgress && (
            <div className="px-5 py-1.5 text-xs text-muted-foreground border-b border-border bg-muted/20">
              Checking for duplicates...
            </div>
          )}

          {/* Items — topic or type view */}
          <div className="flex-1 overflow-y-auto">
            {groupMode === 'topic' ? renderTopicView() : renderTypeView()}
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

// ---------------------------------------------------------------------------
// TopicSection — collapsible wrapper for a topic cluster
// ---------------------------------------------------------------------------

function TopicSection({
  topic,
  totalItems,
  checkedCount,
  onToggleAll,
  children,
}: {
  topic: string
  totalItems: number
  checkedCount: number
  onToggleAll: (checked: boolean) => void
  children: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(true)
  const allChecked = checkedCount === totalItems

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/60">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 flex-1 text-left"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="text-sm font-semibold text-foreground">
            {topic}
          </span>
          <span className="ml-1 text-xs text-muted-foreground">
            ({checkedCount}/{totalItems})
          </span>
        </button>
        <Checkbox
          checked={allChecked}
          onCheckedChange={(checked) => onToggleAll(!!checked)}
          className="h-3.5 w-3.5"
          aria-label={`Select all in ${topic}`}
        />
      </div>
      {expanded && <div>{children}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAllIds(extraction: ExtractionOutput): string[] {
  return [
    ...extraction.ideas.map((i) => i.id),
    ...extraction.concepts.map((c) => c.id),
    ...extraction.people.map((p) => p.id),
    ...extraction.organisations.map((o) => o.id),
    ...extraction.stories.map((s) => s.id),
    ...extraction.techniques.map((t) => t.id),
    ...extraction.contentAngles.map((a) => a.id),
  ]
}
