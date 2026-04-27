'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import type { VocMapping as VocMappingType } from '@/lib/types/knowledge-assets'
import { TypeBadge } from '@/components/type-badge'
import { VOC_MAPPING_KIND_HUES, type VocMappingKind } from '@/lib/voc-mapping-hues'
import { CheckboxField } from '@/components/checkbox-field'

interface VocStatement {
  text?: string
  objection?: string
  category?: string
}

interface AudienceSegmentVoc {
  id: string
  segmentName: string
  status: string
  problems: VocStatement[]
  desires: VocStatement[]
  objections: VocStatement[]
  sharedBeliefs: VocStatement[]
}

interface VocMappingProps {
  segment: AudienceSegmentVoc | null
  mapping: VocMappingType | null
  onToggle: (mapping: VocMappingType) => Promise<{ ok: boolean; error?: string }>
}

export function VocMapping({ segment, mapping, onToggle }: VocMappingProps) {
  const [saving, setSaving] = useState(false)
  const [localMapping, setLocalMapping] = useState<VocMappingType | null>(mapping)

  // Sync from props when they change
  useEffect(() => {
    setLocalMapping(mapping)
  }, [JSON.stringify(mapping)])

  if (!segment) {
    return (
      <div className="flex flex-col items-center gap-2 py-8">
        <p className="text-sm text-muted-foreground">
          Select a primary audience in the left panel to map VOC statements.
        </p>
      </div>
    )
  }

  const isEmpty =
    segment.problems.length === 0 &&
    segment.desires.length === 0 &&
    segment.objections.length === 0 &&
    segment.sharedBeliefs.length === 0

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-2 py-8">
        <p className="text-sm text-muted-foreground">
          This audience segment has no VOC statements yet.{' '}
          <Link
            href={`/dna/audience-segments/${segment.id}?tab=voc`}
            className="text-foreground underline underline-offset-2 hover:no-underline"
          >
            Add them in the {segment.segmentName} detail view
          </Link>
          .
        </p>
      </div>
    )
  }

  const isArchived = segment.status === 'archived'

  const currentMapping: VocMappingType = localMapping ?? {
    audienceSegmentId: segment.id,
    problems: [],
    desires: [],
    objections: [],
    beliefs: [],
  }

  async function handleToggle(
    vocType: 'problems' | 'desires' | 'objections' | 'beliefs',
    index: number
  ) {
    if (isArchived || saving) return

    const current = currentMapping[vocType] ?? []
    const updated = current.includes(index)
      ? current.filter(i => i !== index)
      : [...current, index]

    const newMapping = {
      ...currentMapping,
      [vocType]: updated,
    }

    // Update local state immediately so UI reflects the toggle
    setLocalMapping(newMapping)

    setSaving(true)
    await onToggle(newMapping)
    setSaving(false)
  }

  function renderGroup(
    title: string,
    vocType: 'problems' | 'desires' | 'objections' | 'beliefs',
    statements: VocStatement[],
    textKey: 'text' | 'objection' = 'text'
  ) {
    if (statements.length === 0) return null
    const selected = currentMapping[vocType] ?? []

    return (
      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
          <span className="ml-1.5 text-[10px] font-normal">
            ({selected.length}/{statements.length} selected)
          </span>
        </h4>
        <div className="flex flex-col gap-1">
          {statements.map((stmt, idx) => {
            const text = stmt[textKey] ?? ''
            const isSelected = selected.includes(idx)
            const isOutOfRange = idx >= statements.length

            if (isOutOfRange) {
              return (
                <CheckboxField
                  key={idx}
                  checked
                  onCheckedChange={() => {}}
                  disabled
                  label={<span className="italic text-muted-foreground">(statement removed)</span>}
                />
              )
            }

            return (
              <CheckboxField
                key={idx}
                checked={isSelected}
                onCheckedChange={() => handleToggle(vocType, idx)}
                disabled={isArchived}
                className={isSelected ? 'bg-primary/5' : ''}
                label={
                  <span className="flex items-start gap-2">
                    <span className="flex-1">{text}</span>
                    {stmt.category && (
                      stmt.category in VOC_MAPPING_KIND_HUES ? (
                        <TypeBadge
                          hue={VOC_MAPPING_KIND_HUES[stmt.category as VocMappingKind]}
                          label={stmt.category}
                        />
                      ) : (
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {stmt.category}
                        </span>
                      )
                    )}
                  </span>
                }
              />
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{segment.segmentName}</h3>
        {isArchived && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            archived
          </span>
        )}
        <Link
          href={`/dna/audience-segments/${segment.id}`}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="inline h-3 w-3 mr-0.5" />
          View segment
        </Link>
      </div>

      {renderGroup('Problems', 'problems', segment.problems)}
      {renderGroup('Desires', 'desires', segment.desires)}
      {renderGroup('Objections', 'objections', segment.objections, 'objection')}
      {renderGroup('Beliefs', 'beliefs', segment.sharedBeliefs)}
    </div>
  )
}
