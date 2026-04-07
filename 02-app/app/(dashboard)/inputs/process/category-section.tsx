'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfidenceBadge } from './confidence-badge'
import type {
  ExtractedIdea,
  ExtractedConcept,
  ExtractedPerson,
  ExtractedOrganisation,
  ExtractedStory,
  ExtractedTechnique,
  ExtractedContentAngle,
  StorySubject,
} from '@/lib/types/processing'

type AnyItem =
  | ExtractedIdea
  | ExtractedConcept
  | ExtractedPerson
  | ExtractedOrganisation
  | ExtractedStory
  | ExtractedTechnique
  | ExtractedContentAngle

function getItemText(item: AnyItem): string {
  if ('text' in item) return item.text
  if ('angle' in item) return item.angle
  if ('narrative' in item) return item.title
  if ('name' in item) return item.name
  return ''
}

function getItemTooltip(item: AnyItem): string {
  if ('text' in item) return item.text
  if ('angle' in item) return item.angle
  if ('narrative' in item) return item.narrative
  if ('description' in item) return item.description
  if ('context' in item) return item.context
  return getItemText(item)
}

function getSourceQuote(item: AnyItem): string | undefined {
  if ('sourceQuote' in item) return item.sourceQuote
  if ('context' in item) return item.context
  if ('narrative' in item) return item.hook ?? undefined
  return undefined
}

const STORY_SUBJECTS: { value: StorySubject; label: string }[] = [
  { value: 'self', label: 'Self' },
  { value: 'client', label: 'Client' },
  { value: 'peer', label: 'Peer' },
  { value: 'business', label: 'Business' },
  { value: 'project', label: 'Project' },
]

interface CategorySectionProps {
  label: string
  items: AnyItem[]
  checkedIds: Set<string>
  onToggleItem: (id: string, checked: boolean) => void
  onToggleAll: (ids: string[], checked: boolean) => void
  /** Only relevant for story items */
  storySubjects?: Record<string, StorySubject>
  onStorySubjectChange?: (id: string, subject: StorySubject) => void
}

export function CategorySection({
  label,
  items,
  checkedIds,
  onToggleItem,
  onToggleAll,
  storySubjects = {},
  onStorySubjectChange,
}: CategorySectionProps) {
  const [expanded, setExpanded] = useState(true)

  if (items.length === 0) return null

  const ids = items.map((i) => i.id)
  const allChecked = ids.every((id) => checkedIds.has(id))
  const someChecked = ids.some((id) => checkedIds.has(id))

  // Sort: HIGH/MED first, LOW last
  const sorted = [...items].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.confidence] - order[b.confidence]
  })

  const isStorySection = label === 'STORIES'

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/40">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 flex-1 text-left"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {label}
          </span>
          <span className="ml-1 text-xs text-muted-foreground">({items.length})</span>
        </button>

        {/* Per-section select all checkbox — checked when all selected, unchecked otherwise */}
        <Checkbox
          checked={allChecked}
          onCheckedChange={(checked) => onToggleAll(ids, !!checked)}
          className="h-3.5 w-3.5"
          aria-label={`Select all ${label}`}
        />
      </div>

      {/* Items */}
      {expanded && (
        <ul className="divide-y divide-border/50">
          {sorted.map((item) => {
            const isChecked = checkedIds.has(item.id)
            const isLow = item.confidence === 'low'
            const displayText = getItemText(item)
            const truncated = displayText.length > 100 ? displayText.slice(0, 100) + '…' : displayText
            const sourceQuote = getSourceQuote(item)
            const truncatedQuote = sourceQuote && sourceQuote.length > 120 ? sourceQuote.slice(0, 120) + '…' : sourceQuote

            return (
              <li
                key={item.id}
                className={`flex flex-col gap-1 px-4 py-2.5 ${isLow ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <Checkbox
                    id={`item-${item.id}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => onToggleItem(item.id, !!checked)}
                    className="mt-0.5 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor={`item-${item.id}`}
                      className="block text-sm leading-snug cursor-pointer select-none"
                    >
                      {truncated}
                    </label>
                    {truncatedQuote && (
                      <p className="mt-0.5 text-xs text-muted-foreground italic leading-snug">
                        "{truncatedQuote}"
                      </p>
                    )}
                  </div>
                  <ConfidenceBadge confidence={item.confidence} />
                </div>

                {/* Story subject selector */}
                {isStorySection && isChecked && onStorySubjectChange && (
                  <div className="ml-6 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Subject:</span>
                    <select
                      value={storySubjects[item.id] ?? 'self'}
                      onChange={(e) =>
                        onStorySubjectChange(item.id, e.target.value as StorySubject)
                      }
                      className="text-xs border border-input rounded px-1.5 py-0.5 bg-background text-foreground"
                    >
                      {STORY_SUBJECTS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
