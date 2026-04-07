'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { AudienceSegmentSummary } from '@/lib/types/audience-segments'

interface AudienceSegmentSwitcherProps {
  segments: AudienceSegmentSummary[]
  currentId: string
}

export function AudienceSegmentSwitcher({ segments, currentId }: AudienceSegmentSwitcherProps) {
  // Only show switcher with 2+ non-archived segments
  const active = segments.filter(s => s.status !== 'archived')
  if (active.length < 2) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {active.map(seg => {
        const isCurrent = seg.id === currentId
        const label = seg.segmentName.length > 24
          ? seg.segmentName.slice(0, 23) + '…'
          : seg.segmentName

        return (
          <Link
            key={seg.id}
            href={`/dna/audience-segments/${seg.id}`}
            title={seg.segmentName}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              isCurrent
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            )}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
