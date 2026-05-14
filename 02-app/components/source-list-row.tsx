'use client'

import { useState, type MouseEvent } from 'react'
import { ArrowRight, CheckSquare, Square, Trash2, File } from 'lucide-react'
import { TypeBadge } from '@/components/type-badge'
import { StatusBadge } from '@/components/status-badge'
import { IconButton } from '@/components/icon-button'
import { getSourceTypeMeta, getAuthorityLabel } from '@/lib/source-types'
import { tagHue } from '@/lib/tag-hue'
import { cn } from '@/lib/utils'
import type { SourceListRowData } from '@/lib/types/source-list'

interface SourceListRowProps {
  source: SourceListRowData
  selected: boolean
  previewing: boolean
  onToggleSelect: (id: string) => void
  onPreview: (id: string) => void
  onOpenDetail: (id: string, opts?: { newTab?: boolean }) => void
  onDelete: (id: string) => void
}

const RELATIVE_FMT = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

function relativeTime(iso: string | null): string | null {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  const diffMs = Date.now() - then
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (diffMs < hour) return `${Math.max(1, Math.round(diffMs / minute))}m ago`
  if (diffMs < day) return RELATIVE_FMT.format(-Math.round(diffMs / hour), 'hour')
  if (diffMs < 30 * day) return RELATIVE_FMT.format(-Math.round(diffMs / day), 'day')
  if (diffMs < 365 * day) return RELATIVE_FMT.format(-Math.round(diffMs / (30 * day)), 'month')
  return RELATIVE_FMT.format(-Math.round(diffMs / (365 * day)), 'year')
}

export function SourceListRow({
  source,
  selected,
  previewing,
  onToggleSelect,
  onPreview,
  onOpenDetail,
  onDelete,
}: SourceListRowProps) {
  const [hovered, setHovered] = useState(false)
  const meta = getSourceTypeMeta(source.sourceType)
  const Icon = meta.icon ?? File
  const authorityLabel = getAuthorityLabel(source.authority)

  const metaSegments: string[] = [meta.label, authorityLabel]
  if (source.chunkCount > 0) metaSegments.push(`${source.chunkCount} chunks`)
  if (source.processingHistoryCount > 0) metaSegments.push(`processed ${source.processingHistoryCount}×`)
  if (source.ingestStatus === 'awaiting-text') metaSegments.push('awaiting text')
  else if (source.ingestStatus === 'processing') metaSegments.push('processing…')
  const rel = relativeTime(source.createdAt)
  if (rel) metaSegments.push(rel)

  const handleBodyClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (e.metaKey || e.ctrlKey) {
      onOpenDetail(source.id, { newTab: true })
      return
    }
    onPreview(source.id)
  }

  const visibleTags = source.tags.slice(0, 3)
  const overflowTags = source.tags.length - visibleTags.length

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'flex items-center gap-3 py-3 px-3 pr-4 border-b border-border/30 transition-colors',
        previewing ? 'bg-muted/60' : selected ? 'bg-primary/5' : 'hover:bg-muted/40',
      )}
    >
      {/* Leading: checkbox + icon */}
      <button
        type="button"
        onClick={() => onToggleSelect(source.id)}
        className="shrink-0"
        aria-label={selected ? 'Deselect source' : 'Select source'}
      >
        {selected ? (
          <CheckSquare className="w-4 h-4 text-primary" />
        ) : (
          <Square className="w-4 h-4 text-muted-foreground/50" />
        )}
      </button>
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />

      {/* Body — preview-on-click, Cmd-click → detail */}
      <button
        type="button"
        onClick={handleBodyClick}
        className="flex flex-col gap-0.5 min-w-0 flex-1 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{source.title}</span>
          {source.inboxStatus === 'new' && (
            <StatusBadge
              status="new"
              options={[{ value: 'new', label: 'NEW', state: 'info' }]}
            />
          )}
          {(source.ingestStatus === 'awaiting-text' || source.ingestStatus === 'processing') && (
            <StatusBadge
              status={source.ingestStatus}
              options={[
                { value: 'awaiting-text', label: 'AWAITING TEXT', state: 'warning' },
                { value: 'processing', label: 'PROCESSING', state: 'warning' },
              ]}
            />
          )}
        </span>
        <span className="text-xs text-muted-foreground truncate">
          {metaSegments.join(' · ')}
        </span>
        {visibleTags.length > 0 && (
          <span className="flex items-center flex-wrap gap-1.5 mt-0.5">
            {visibleTags.map((tag) => (
              <TypeBadge key={tag} hue={tagHue(tag)} label={tag} size="xs" />
            ))}
            {overflowTags > 0 && (
              <span className="text-xs text-muted-foreground">+{overflowTags} more</span>
            )}
          </span>
        )}
      </button>

      {/* Trailing — visible on hover */}
      <div
        className={cn(
          'flex items-center gap-1 shrink-0 transition-opacity',
          hovered ? 'opacity-100' : 'opacity-0',
        )}
      >
        <IconButton
          icon={ArrowRight}
          label="Open detail"
          variant="ghost"
          size="sm"
          onClick={() => onOpenDetail(source.id)}
        />
        <IconButton
          icon={Trash2}
          label="Delete source"
          variant="ghost"
          size="sm"
          onClick={() => onDelete(source.id)}
        />
      </div>
    </div>
  )
}
