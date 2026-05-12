'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Upload, Mic, BookOpen, Mail, Image, File, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ResultsPanel } from '../process/results-panel'
import { ContentPane } from '@/components/content-pane'
import { EmptyState } from '@/components/empty-state'
import type { ExtractionResult, ExtractionOutput, CommitResult } from '@/lib/types/processing'
import type { LucideIcon } from 'lucide-react'

interface QueueItem {
  id: string
  title: string
  inputDate: string | null
  sourceType: string
  tags: string[] | null
  /** The stored JSON — may be ExtractionResult (has .extraction) or bare ExtractionOutput */
  extractionJson: unknown
  status: string
  createdAt: Date | null
}

const sourceTypeIcons: Record<string, LucideIcon> = {
  'transcript': FileText,
  'krisp-meeting': Mic,
  'session-note': FileText,
  'research': BookOpen,
  'voice-note': Mic,
  'email': Mail,
  'image': Image,
  'document': File,
  'other': Upload,
}

/** Normalize DB JSON into the shape ResultsPanel expects */
function toExtractionResult(json: unknown, item: QueueItem): ExtractionResult {
  const obj = json as Record<string, unknown>
  // If it already has an `extraction` wrapper, it's the full ExtractionResult
  if (obj.extraction) return obj as unknown as ExtractionResult
  // Otherwise it's bare ExtractionOutput — wrap it
  return {
    metadata: {
      title: item.title,
      sourceType: item.sourceType as ExtractionResult['metadata']['sourceType'],
      authority: 'peer' as ExtractionResult['metadata']['authority'],  // INP-11 queue has no authority — default for compat; this client is removed in INP-12 Phase 2
      date: item.inputDate ?? undefined,
      tags: item.tags ?? undefined,
      brandId: '',
    },
    text: '',
    extraction: obj as unknown as ExtractionOutput,
  }
}

function extractionItemCount(result: ExtractionResult): number {
  const e = result.extraction
  return (
    (e.ideas?.length ?? 0) +
    (e.concepts?.length ?? 0) +
    (e.people?.length ?? 0) +
    (e.organisations?.length ?? 0) +
    (e.stories?.length ?? 0) +
    (e.techniques?.length ?? 0) +
    (e.contentAngles?.length ?? 0)
  )
}

/** Per-category breakdown string: "3 ideas · 2 people · 1 concept" */
function extractionBreakdown(result: ExtractionResult): string {
  const e = result.extraction
  const parts: string[] = []
  const add = (n: number, singular: string, plural?: string) => {
    if (n > 0) parts.push(`${n} ${n === 1 ? singular : (plural ?? singular + 's')}`)
  }
  add(e.ideas?.length ?? 0, 'idea')
  add(e.concepts?.length ?? 0, 'concept')
  add(e.people?.length ?? 0, 'person', 'people')
  add(e.organisations?.length ?? 0, 'org')
  add(e.stories?.length ?? 0, 'story', 'stories')
  add(e.techniques?.length ?? 0, 'technique')
  add(e.contentAngles?.length ?? 0, 'angle')
  return parts.join(' · ')
}

/** Key entity names from extraction for inline preview */
function extractionEntityPreview(result: ExtractionResult): string | null {
  const e = result.extraction
  const names: string[] = []
  if (e.people?.length > 0) {
    const pNames = e.people.slice(0, 3).map((p) => p.name)
    names.push(`People: ${pNames.join(', ')}${e.people.length > 3 ? ` +${e.people.length - 3}` : ''}`)
  }
  if (e.organisations?.length > 0) {
    const oNames = e.organisations.slice(0, 2).map((o) => o.name)
    names.push(`Orgs: ${oNames.join(', ')}${e.organisations.length > 2 ? ` +${e.organisations.length - 2}` : ''}`)
  }
  return names.length > 0 ? names.join(' · ') : null
}

/** Topic names from stored clusters */
function extractionTopicPreview(json: unknown): string | null {
  const obj = json as Record<string, unknown>
  const clusters = (obj.topicClusters ?? (obj as Record<string, unknown>).topicClusters) as Array<{ topic: string }> | undefined
  if (!clusters || clusters.length === 0) return null
  return clusters.slice(0, 3).map((c) => c.topic).join(', ')
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface QueueClientProps {
  items: QueueItem[]
}

interface TopicCluster {
  topic: string
  items: Array<{ id: string; category: string }>
}

export function QueueClient({ items }: QueueClientProps) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [committedIds, setCommittedIds] = useState<Set<string>>(new Set())
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Topic cluster cache — keyed by item id
  const [clusterCache, setClusterCache] = useState<Record<string, TopicCluster[]>>({})
  const [clusteringInProgress, setClusteringInProgress] = useState(false)
  const clusterFetchedRef = useRef<Set<string>>(new Set())

  const pendingItems = items.filter((i) => !committedIds.has(i.id) && !deletedIds.has(i.id))
  const selectedItem = pendingItems.find((i) => i.id === selectedId) ?? null
  const selectedResult = selectedItem ? toExtractionResult(selectedItem.extractionJson, selectedItem) : null

  // Fetch topic clusters on-the-fly when item is selected and has no stored clusters
  useEffect(() => {
    if (!selectedId || !selectedResult) return
    // Check if clusters already stored in the extraction JSON
    // INP-11 legacy: topicClusters used to live on ExtractionResult; INP-12 removed it.
    // This component is removed in Phase 2; cast through unknown to keep compiling.
    const legacyClusters = (selectedResult as unknown as { topicClusters?: unknown[] }).topicClusters
    if (legacyClusters && legacyClusters.length > 0) return
    // Check if already cached or already fetching
    if (clusterCache[selectedId] || clusterFetchedRef.current.has(selectedId)) return

    clusterFetchedRef.current.add(selectedId)
    setClusteringInProgress(true)

    fetch('/api/inputs/cluster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extraction: selectedResult.extraction }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.clusters) {
          setClusterCache((prev) => ({ ...prev, [selectedId]: data.clusters }))
        }
      })
      .catch((err) => console.error('[QueueClient] cluster fetch failed', err))
      .finally(() => setClusteringInProgress(false))
  }, [selectedId, selectedResult, clusterCache])

  // Resolve topic clusters: stored > cached > none. INP-11 legacy — removed in Phase 2.
  const legacyClusters = (selectedResult as unknown as { topicClusters?: unknown[] } | null)?.topicClusters
  const selectedClusters = (legacyClusters
    ?? (selectedId ? clusterCache[selectedId] : undefined)
    ?? undefined) as undefined

  // Dedup state
  const [dedupCache, setDedupCache] = useState<Record<string, { matches: Record<string, Array<{ matchedNodeName: string; score: number; source: 'graph' | 'pending' }>>; canonicalMatches: Record<string, string> }>>({})
  const [dedupInProgress, setDedupInProgress] = useState(false)
  const dedupFetchedRef = useRef<Set<string>>(new Set())

  // Fetch dedup data when an item is selected
  useEffect(() => {
    if (!selectedId || !selectedResult) return
    if (dedupCache[selectedId] || dedupFetchedRef.current.has(selectedId)) return

    dedupFetchedRef.current.add(selectedId)
    setDedupInProgress(true)

    // Build items list for the dedup API
    const e = selectedResult.extraction
    const dedupItems: Array<{ id: string; text: string; label: string; category: string }> = []

    for (const idea of e.ideas ?? []) {
      dedupItems.push({ id: idea.id, text: idea.text, label: 'Idea', category: 'ideas' })
    }
    for (const concept of e.concepts ?? []) {
      dedupItems.push({ id: concept.id, text: `${concept.name}: ${concept.description}`, label: 'Concept', category: 'concepts' })
    }
    for (const person of e.people ?? []) {
      const parts = [person.name]
      if (person.role) parts.push(person.role)
      if (person.organisation) parts.push(`at ${person.organisation}`)
      parts.push(person.context)
      dedupItems.push({ id: person.id, text: parts.join(', '), label: 'Person', category: 'people' })
    }
    for (const org of e.organisations ?? []) {
      dedupItems.push({ id: org.id, text: `${org.name}. ${org.context}`, label: 'Organisation', category: 'organisations' })
    }
    for (const technique of e.techniques ?? []) {
      dedupItems.push({ id: technique.id, text: `${technique.name}: ${technique.description}`, label: 'Methodology', category: 'techniques' })
    }
    for (const angle of e.contentAngles ?? []) {
      dedupItems.push({ id: angle.id, text: angle.angle, label: 'Idea', category: 'contentAngles' })
    }

    if (dedupItems.length === 0) {
      setDedupInProgress(false)
      return
    }

    fetch('/api/inputs/dedup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: dedupItems }),
    })
      .then((res) => res.json())
      .then((data) => {
        setDedupCache((prev) => ({
          ...prev,
          [selectedId]: {
            matches: data.matches ?? {},
            canonicalMatches: data.canonicalMatches ?? {},
          },
        }))
      })
      .catch((err) => console.error('[QueueClient] dedup fetch failed', err))
      .finally(() => setDedupInProgress(false))
  }, [selectedId, selectedResult, dedupCache])

  // Resolve dedup data for selected item
  const selectedDedup = selectedId ? dedupCache[selectedId] : undefined

  function handleCommitSuccess(_commitResult: CommitResult) {
    if (selectedId) {
      setCommittedIds((prev) => new Set(prev).add(selectedId))
      setSelectedId(null)
      router.refresh()
    }
  }

  function handlePanelClose() {
    setSelectedId(null)
  }

  async function handleDelete(id: string, title: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/inputs/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setDeletedIds((prev) => new Set(prev).add(id))
      if (selectedId === id) setSelectedId(null)
      toast.success(`Deleted "${title}"`)
      router.refresh()
    } catch {
      toast.error('Failed to delete — please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  if (pendingItems.length === 0) {
    return (
      <ContentPane>
        <EmptyState
          icon={Upload}
          heading="Queue is empty"
          description="No pending inputs to review. Run /krisp-ingest to pull in new meetings, or paste text via Process."
        />
      </ContentPane>
    )
  }

  return (
    <div className="flex flex-1 min-h-0 gap-0">
      {/* List */}
      <ContentPane padding={false} className={selectedResult ? 'max-w-[calc(100%-480px)]' : ''}>
        <div className="flex flex-col divide-y divide-border">
          {pendingItems.map((item) => {
            const Icon = sourceTypeIcons[item.sourceType] ?? Upload
            const normalized = toExtractionResult(item.extractionJson, item)
            const breakdown = extractionBreakdown(normalized)
            const entityPreview = extractionEntityPreview(normalized)
            const topicPreview = extractionTopicPreview(item.extractionJson)
            const isSelected = item.id === selectedId

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(isSelected ? null : item.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(isSelected ? null : item.id) } }}
                className={`flex items-start gap-4 px-6 py-4 text-left transition-colors hover:bg-muted/40 cursor-pointer ${isSelected ? 'bg-muted/60' : ''}`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted mt-0.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="text-sm font-medium text-foreground truncate">
                    {item.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(item.inputDate)}
                    {item.tags && item.tags.length > 0 && (
                      <> · {item.tags.slice(0, 3).join(', ')}{item.tags.length > 3 ? ` +${item.tags.length - 3}` : ''}</>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {breakdown}
                  </span>
                  {topicPreview && (
                    <span className="text-xs text-muted-foreground italic">
                      Topics: {topicPreview}
                    </span>
                  )}
                  {entityPreview && (
                    <span className="text-xs text-muted-foreground">
                      {entityPreview}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(item.id, item.title)
                  }}
                  disabled={deletingId === item.id}
                  className="shrink-0 p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  aria-label={`Delete ${item.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      </ContentPane>

      {/* Review panel */}
      {selectedResult && (
        <ResultsPanel
          result={selectedResult}
          onClose={handlePanelClose}
          onCommitSuccess={handleCommitSuccess}
          topicClusters={selectedClusters}
          clusteringInProgress={clusteringInProgress}
          dedupMatches={selectedDedup?.matches}
          canonicalMatches={selectedDedup?.canonicalMatches}
          dedupInProgress={dedupInProgress}
        />
      )}
    </div>
  )
}
