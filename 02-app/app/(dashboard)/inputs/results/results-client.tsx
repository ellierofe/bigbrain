'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ContentPane } from '@/components/content-pane'
import { EmptyState } from '@/components/empty-state'
import { ResultsPanel } from '@/app/(dashboard)/inputs/process/results-panel'
import { AnalysisReviewPanel } from './analysis-review-panel'
import {
  ListOrdered, FileText, Layers, TrendingUp, FolderSearch,
  CheckCircle, Loader2, Trash2,
} from 'lucide-react'
import type { ExtractionResult, CommitResult, ProcessingMode } from '@/lib/types/processing'

// INP-12: `mode` renamed to `lens`, `analysisResult` moved to `lens_reports.result`,
// `title` removed. This whole client is rewritten in Phase 3; legacy props are mapped
// from the new schema in `page.tsx` until then.
interface ProcessingRunItem {
  id: string
  /** Maps from `processingRuns.lens` (was `mode`). */
  mode: string
  sourceIds: string[]
  /** Removed from `processingRuns` in INP-12; supplied by page.tsx as a placeholder. */
  title: string | null
  extractionResult: unknown
  /** Removed from `processingRuns` in INP-12; null until Phase 3 wires the new flow. */
  analysisResult: unknown
  status: string
  createdAt: Date | null
}

interface ResultsClientProps {
  runs: ProcessingRunItem[]
  brandId: string
}

const modeLabels: Record<string, string> = {
  individual: 'Individual',
  batch: 'Batch',
  reflective: 'Reflective',
  synthesis: 'Synthesis',
}

const modeIcons: Record<string, typeof FileText> = {
  individual: FileText,
  batch: Layers,
  reflective: TrendingUp,
  synthesis: FolderSearch,
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function ResultsClient({ runs, brandId }: ResultsClientProps) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [committedIds, setCommittedIds] = useState<Set<string>>(new Set())
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set())

  // Cluster and dedup caches for individual mode (same pattern as queue)
  const clusterCache = useRef<Record<string, unknown>>({})
  const dedupCache = useRef<Record<string, unknown>>({})
  const [clusteringId, setClusteringId] = useState<string | null>(null)
  const [dedupId, setDedupId] = useState<string | null>(null)

  // Pending first, then completed — with local status overrides
  const allRuns = runs.map((r) => ({
    ...r,
    effectiveStatus: committedIds.has(r.id) ? 'committed' : skippedIds.has(r.id) ? 'skipped' : r.status,
  }))
  const pendingRuns = allRuns.filter((r) => r.effectiveStatus === 'pending')
  const completedRuns = allRuns.filter((r) => r.effectiveStatus !== 'pending')

  const selectedRun = allRuns.find((r) => r.id === selectedId)

  function handleCommitSuccess(runId: string) {
    return async (commitResult: CommitResult) => {
      // Mark the processing run as committed
      try {
        await fetch(`/api/process/commit-run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ runId, status: 'committed' }),
        })
      } catch (err) {
        console.error('Failed to update run status:', err)
      }
      setCommittedIds((prev) => new Set([...prev, runId]))
      setSelectedId(null)
    }
  }

  async function handleSkip(runId: string) {
    try {
      await fetch(`/api/process/commit-run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, status: 'skipped' }),
      })
    } catch (err) {
      console.error('Failed to skip run:', err)
    }
    setSkippedIds((prev) => new Set([...prev, runId]))
    setSelectedId(null)
  }

  return (
    <div className="flex gap-4 flex-1 min-h-0">
      {/* Left pane — run list */}
      <ContentPane className="w-80 shrink-0">
        {allRuns.length === 0 ? (
          <EmptyState
            icon={ListOrdered}
            heading="No results yet"
            description="Process sources to see results here."
          />
        ) : (
          <div className="flex flex-col">
            {/* Pending runs */}
            {pendingRuns.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Pending review ({pendingRuns.length})
                </div>
                <div className="divide-y divide-border/30">
                  {pendingRuns.map((run) => {
                    const Icon = modeIcons[run.mode] ?? FileText
                    const active = run.id === selectedId
                    return (
                      <button
                        key={run.id}
                        onClick={() => setSelectedId(run.id)}
                        className={`flex items-center gap-3 px-3 py-3 text-left transition-colors w-full ${
                          active ? 'bg-muted/60' : 'hover:bg-muted/40'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{run.title ?? 'Untitled'}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                              {modeLabels[run.mode] ?? run.mode}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {run.sourceIds.length} source{run.sourceIds.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {/* Completed runs */}
            {completedRuns.length > 0 && (
              <>
                <div className="px-3 py-2 mt-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-t border-border/30">
                  Completed ({completedRuns.length})
                </div>
                <div className="divide-y divide-border/30">
                  {completedRuns.map((run) => {
                    const Icon = modeIcons[run.mode] ?? FileText
                    const active = run.id === selectedId
                    const saved = run.effectiveStatus === 'committed'
                    return (
                      <button
                        key={run.id}
                        onClick={() => setSelectedId(run.id)}
                        className={`flex items-center gap-3 px-3 py-3 text-left transition-colors w-full opacity-70 ${
                          active ? 'bg-muted/60 opacity-100' : 'hover:bg-muted/40'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{run.title ?? 'Untitled'}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                              {modeLabels[run.mode] ?? run.mode}
                            </span>
                            {saved ? (
                              <span className="flex items-center gap-0.5 text-xs text-success">
                                <CheckCircle className="w-3 h-3" /> Saved
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                <Trash2 className="w-3 h-3" /> Dismissed
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </ContentPane>

      {/* Right pane — review */}
      <div className="flex-1 min-w-0">
        {!selectedRun ? (
          <ContentPane className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">
              {allRuns.length > 0 ? 'Select a result to review' : 'No results to review'}
            </p>
          </ContentPane>
        ) : selectedRun.mode === 'individual' && selectedRun.effectiveStatus === 'pending' ? (
          <ContentPane>
            <ResultsPanel
              result={selectedRun.extractionResult as ExtractionResult}
              onClose={() => setSelectedId(null)}
              onCommitSuccess={handleCommitSuccess(selectedRun.id)}
            />
          </ContentPane>
        ) : (
          <ContentPane>
            <AnalysisReviewPanel
              run={selectedRun}
              onClose={() => setSelectedId(null)}
              onSkip={() => handleSkip(selectedRun.id)}
              onCommitSuccess={() => {
                setCommittedIds((prev) => new Set([...prev, selectedRun.id]))
                setSelectedId(null)
              }}
              readOnly={selectedRun.effectiveStatus !== 'pending'}
            />
          </ContentPane>
        )}
      </div>
    </div>
  )
}
