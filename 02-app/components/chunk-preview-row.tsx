'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ChunkLike {
  chunkType: 'speaker-turn' | 'paragraph' | 'section' | 'slide' | 'row' | 'item'
  text: string
  speaker: string | null
  position: number
  metadata?: Record<string, unknown>
}

interface ChunkPreviewRowProps {
  chunk: ChunkLike
  truncateAt?: number
  showPosition?: boolean
  className?: string
}

function metaLine(chunk: ChunkLike, showPosition: boolean): string | null {
  const meta = (chunk.metadata ?? {}) as Record<string, unknown>
  switch (chunk.chunkType) {
    case 'speaker-turn':
      if (!chunk.speaker) return null
      return showPosition ? `${chunk.speaker.toUpperCase()} · #${chunk.position}` : chunk.speaker.toUpperCase()
    case 'section':
    case 'paragraph': {
      const heading = typeof meta.sectionHeading === 'string' ? meta.sectionHeading : null
      return heading
    }
    case 'slide': {
      const num = typeof meta.slideNumber === 'number' ? meta.slideNumber : chunk.position + 1
      const title = typeof meta.slideTitle === 'string' && meta.slideTitle.length > 0 ? meta.slideTitle : null
      return title ? `SLIDE ${num} · ${title}` : `SLIDE ${num}`
    }
    case 'row':
    case 'item':
    default:
      return null
  }
}

export function ChunkPreviewRow({
  chunk,
  truncateAt,
  showPosition = false,
  className,
}: ChunkPreviewRowProps) {
  const [expanded, setExpanded] = useState(false)
  const heading = metaLine(chunk, showPosition)

  const shouldTruncate = typeof truncateAt === 'number' && chunk.text.length > truncateAt && !expanded
  const body = shouldTruncate ? `${chunk.text.slice(0, truncateAt)}…` : chunk.text

  return (
    <div className={cn('flex flex-col gap-1 py-3 border-b border-border/30 last:border-b-0', className)}>
      {heading && (
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground truncate max-w-[300px]">
          {heading}
        </span>
      )}
      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
        {body}
        {shouldTruncate && (
          <>
            {' '}
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-xs text-primary hover:text-primary/80"
            >
              Show more
            </button>
          </>
        )}
      </p>
    </div>
  )
}
