'use client'

import { useEffect, useState } from 'react'
import { X, ArrowRight, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { IconButton } from '@/components/icon-button'
import { ActionButton } from '@/components/action-button'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { ChunkPreviewRow } from '@/components/chunk-preview-row'
import { TypeBadge } from '@/components/type-badge'
import { InlineWarningBanner } from '@/components/inline-warning-banner'
import { ContentPane } from '@/components/content-pane'
import { SectionLabel } from '@/components/section-label'
import { LinkButton } from '@/components/link-button'
import { InlineHint } from '@/components/inline-hint'
import { SectionDivider } from '@/components/section-divider'
import { tagHue } from '@/lib/tag-hue'
import { getSourceTypeLabel, getAuthorityLabel } from '@/lib/source-types'
import { loadSourcePreviewAction } from '@/app/actions/sources'
import type { ChunkRowData, SourceDetailData } from '@/lib/types/source-list'

interface SourcePreviewPaneProps {
  sourceId: string
  onClose: () => void
  onRunLens: (sourceId: string) => void
}

export function SourcePreviewPane({ sourceId, onClose, onRunLens }: SourcePreviewPaneProps) {
  const [source, setSource] = useState<SourceDetailData | null>(null)
  const [chunks, setChunks] = useState<ChunkRowData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    loadSourcePreviewAction(sourceId).then((r) => {
      if (cancelled) return
      if (r.ok) {
        setSource(r.source)
        setChunks(r.chunks)
      } else {
        setError(r.error)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [sourceId])

  return (
    <ContentPane className="w-[480px] shrink-0 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          {source ? (
            <>
              <h3 className="font-display font-semibold line-clamp-2">{source.title}</h3>
              <InlineHint align="left" className="mt-0.5">
                {getSourceTypeLabel(source.sourceType)} · {getAuthorityLabel(source.authority)}
                {source.documentDate && ` · ${source.documentDate}`}
              </InlineHint>
              {source.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mt-2">
                  {source.tags.slice(0, 5).map((tag) => (
                    <TypeBadge key={tag} hue={tagHue(tag)} label={tag} size="xs" />
                  ))}
                  {source.tags.length > 5 && (
                    <InlineHint align="left">+{source.tags.length - 5}</InlineHint>
                  )}
                </div>
              )}
            </>
          ) : (
            <h3 className="font-display font-semibold">Loading…</h3>
          )}
        </div>
        <IconButton icon={X} label="Close preview" variant="ghost" size="sm" onClick={onClose} />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4">
        {loading && (
          <InlineHint align="left">
            <Loader2 className="w-3 h-3 animate-spin inline-block mr-1" /> Loading preview…
          </InlineHint>
        )}

        {error && (
          <InlineWarningBanner title="Preview failed" subtitle={error} tone="warning" />
        )}

        {source && (
          <>
            {/* Summary */}
            <div>
              <SectionLabel>Summary</SectionLabel>
              {source.summary ? (
                <div className="mt-2">
                  <MarkdownRenderer content={source.summary} compact />
                </div>
              ) : source.extractedTextLength === 0 ? (
                <InlineHint align="left" className="mt-2">
                  <AlertCircle className="w-3 h-3 inline-block mr-1" /> No extracted text yet.
                </InlineHint>
              ) : (
                <InlineHint align="left" className="mt-2">
                  <Loader2 className="w-3 h-3 animate-spin inline-block mr-1" /> Summary generating…
                </InlineHint>
              )}
            </div>

            {/* First chunks */}
            {chunks.length > 0 && (
              <div>
                <SectionLabel>First chunks</SectionLabel>
                <div className="mt-1">
                  {chunks.map((c) => (
                    <ChunkPreviewRow key={c.id} chunk={c} truncateAt={250} showPosition={false} />
                  ))}
                </div>
                {source.chunkCount > chunks.length && (
                  <LinkButton href={`/inputs/sources/${source.id}#chunks`}>
                    View all {source.chunkCount} chunks →
                  </LinkButton>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Sticky footer */}
      {source && (
        <>
          <SectionDivider />
          <div className="pt-3 flex items-center gap-2">
            <ActionButton
              href={`/inputs/sources/${source.id}`}
              trailingIcon={ArrowRight}
              variant="outline"
            >
              Open full view
            </ActionButton>
            <ActionButton icon={Sparkles} onClick={() => onRunLens(source.id)}>
              Run lens
            </ActionButton>
          </div>
        </>
      )}
    </ContentPane>
  )
}
