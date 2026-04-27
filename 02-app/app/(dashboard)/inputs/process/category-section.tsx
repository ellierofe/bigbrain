'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Pencil, Check, X } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { InlineCellSelect } from '@/components/inline-cell-select'
import { ConfidenceBadge } from '@/components/confidence-badge'
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

export type AnyItem =
  | ExtractedIdea
  | ExtractedConcept
  | ExtractedPerson
  | ExtractedOrganisation
  | ExtractedStory
  | ExtractedTechnique
  | ExtractedContentAngle

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

function isIdea(item: AnyItem): item is ExtractedIdea {
  return 'text' in item && !('angle' in item)
}

function isContentAngle(item: AnyItem): item is ExtractedContentAngle {
  return 'angle' in item
}

function isPerson(item: AnyItem): item is ExtractedPerson {
  return 'context' in item && 'name' in item && !('types' in item)
}

function isOrganisation(item: AnyItem): item is ExtractedOrganisation {
  return 'types' in item
}

function isStory(item: AnyItem): item is ExtractedStory {
  return 'narrative' in item
}

function isTechnique(item: AnyItem): item is ExtractedTechnique {
  return 'description' in item && 'name' in item && !('narrative' in item) && !('types' in item) && !('context' in item)
}

function isConcept(item: AnyItem): item is ExtractedConcept {
  return 'description' in item && 'name' in item && !('origin' in item) && !('narrative' in item) && !('types' in item) && !('context' in item)
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export function getItemDisplayName(item: AnyItem): string {
  if (isIdea(item)) return item.text
  if (isContentAngle(item)) return item.angle
  if (isStory(item)) return item.title
  if ('name' in item) return item.name
  return ''
}

const STORY_SUBJECTS: { value: StorySubject; label: string }[] = [
  { value: 'self', label: 'Self' },
  { value: 'client', label: 'Client' },
  { value: 'peer', label: 'Peer' },
  { value: 'business', label: 'Business' },
  { value: 'project', label: 'Project' },
]

// ---------------------------------------------------------------------------
// Item detail renderer — type-specific structured display
// ---------------------------------------------------------------------------

function ItemDetail({ item, expanded }: { item: AnyItem; expanded: boolean }) {
  if (isIdea(item)) {
    return (
      <div>
        <p className={`text-sm leading-snug ${expanded ? '' : 'line-clamp-3'}`}>
          {item.text}
        </p>
        {item.sourceQuote && (
          <p className={`mt-1 text-xs text-muted-foreground italic leading-snug ${expanded ? '' : 'line-clamp-2'}`}>
            &ldquo;{item.sourceQuote}&rdquo;
          </p>
        )}
      </div>
    )
  }

  if (isContentAngle(item)) {
    return (
      <div>
        <p className={`text-sm leading-snug ${expanded ? '' : 'line-clamp-3'}`}>
          {item.angle}
        </p>
        {(item.format || item.audienceHint) && (
          <p className="mt-1 text-xs text-muted-foreground leading-snug">
            {[item.format, item.audienceHint].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    )
  }

  if (isPerson(item)) {
    return (
      <div>
        <p className="text-sm font-medium leading-snug">{item.name}</p>
        {(item.role || item.organisation) && (
          <p className="text-xs text-muted-foreground leading-snug">
            {[item.role, item.organisation].filter(Boolean).join(' at ')}
          </p>
        )}
        <p className={`mt-1 text-xs text-muted-foreground leading-snug ${expanded ? '' : 'line-clamp-2'}`}>
          {item.context}
        </p>
      </div>
    )
  }

  if (isOrganisation(item)) {
    return (
      <div>
        <p className="text-sm font-medium leading-snug">{item.name}</p>
        {item.types && item.types.length > 0 && (
          <p className="text-xs text-muted-foreground leading-snug">
            {item.types.join(', ')}
          </p>
        )}
        <p className={`mt-1 text-xs text-muted-foreground leading-snug ${expanded ? '' : 'line-clamp-2'}`}>
          {item.context}
        </p>
      </div>
    )
  }

  if (isStory(item)) {
    return (
      <div>
        <p className="text-sm font-medium leading-snug">{item.title}</p>
        <p className={`mt-1 text-xs text-muted-foreground leading-snug ${expanded ? '' : 'line-clamp-3'}`}>
          {item.narrative}
        </p>
        {expanded && item.hook && (
          <p className="mt-1 text-xs text-muted-foreground italic leading-snug">
            Hook: {item.hook}
          </p>
        )}
        {expanded && item.lesson && (
          <p className="mt-1 text-xs text-muted-foreground italic leading-snug">
            Lesson: {item.lesson}
          </p>
        )}
      </div>
    )
  }

  if (isTechnique(item)) {
    return (
      <div>
        <p className="text-sm font-medium leading-snug">{item.name}</p>
        <p className={`mt-1 text-xs text-muted-foreground leading-snug ${expanded ? '' : 'line-clamp-2'}`}>
          {item.description}
        </p>
        {expanded && item.origin && (
          <p className="mt-1 text-xs text-muted-foreground italic leading-snug">
            Origin: {item.origin}
          </p>
        )}
        {item.sourceQuote && (
          <p className={`mt-1 text-xs text-muted-foreground italic leading-snug ${expanded ? '' : 'line-clamp-1'}`}>
            &ldquo;{item.sourceQuote}&rdquo;
          </p>
        )}
      </div>
    )
  }

  if (isConcept(item)) {
    return (
      <div>
        <p className="text-sm font-medium leading-snug">{item.name}</p>
        <p className={`mt-1 text-xs text-muted-foreground leading-snug ${expanded ? '' : 'line-clamp-2'}`}>
          {item.description}
        </p>
        {item.sourceQuote && (
          <p className={`mt-1 text-xs text-muted-foreground italic leading-snug ${expanded ? '' : 'line-clamp-1'}`}>
            &ldquo;{item.sourceQuote}&rdquo;
          </p>
        )}
      </div>
    )
  }

  return null
}

// ---------------------------------------------------------------------------
// Inline edit form — type-specific fields
// ---------------------------------------------------------------------------

function ItemEditForm({
  item,
  onSave,
  onCancel,
}: {
  item: AnyItem
  onSave: (updates: Partial<AnyItem>) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    if (isIdea(item)) return { text: item.text, sourceQuote: item.sourceQuote ?? '' } as Record<string, string>
    if (isContentAngle(item)) return { angle: item.angle, format: item.format ?? '', audienceHint: item.audienceHint ?? '' } as Record<string, string>
    if (isPerson(item)) return { name: item.name, role: item.role ?? '', organisation: item.organisation ?? '', context: item.context } as Record<string, string>
    if (isOrganisation(item)) return { name: item.name, context: item.context } as Record<string, string>
    if (isStory(item)) return { title: item.title, narrative: item.narrative, hook: item.hook ?? '', lesson: item.lesson ?? '' } as Record<string, string>
    if (isTechnique(item)) return { name: item.name, description: item.description, origin: item.origin ?? '' } as Record<string, string>
    if (isConcept(item)) return { name: item.name, description: item.description } as Record<string, string>
    return {}
  })

  function handleSave() {
    // Strip empty optional fields back to undefined
    const cleaned: Record<string, string | undefined> = {}
    for (const [k, v] of Object.entries(draft)) {
      cleaned[k] = v.trim() || undefined
    }
    // Ensure required fields stay as empty string rather than undefined
    if (isIdea(item)) cleaned.text = draft.text
    if (isContentAngle(item)) cleaned.angle = draft.angle
    if (isPerson(item)) { cleaned.name = draft.name; cleaned.context = draft.context }
    if (isOrganisation(item)) { cleaned.name = draft.name; cleaned.context = draft.context }
    if (isStory(item)) { cleaned.title = draft.title; cleaned.narrative = draft.narrative }
    if (isTechnique(item)) { cleaned.name = draft.name; cleaned.description = draft.description }
    if (isConcept(item)) { cleaned.name = draft.name; cleaned.description = draft.description }
    onSave(cleaned)
  }

  const inputClass = 'w-full text-sm border border-input rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring'
  const textareaClass = `${inputClass} resize-none`

  return (
    <div className="space-y-2">
      {isIdea(item) && (
        <>
          <textarea
            className={textareaClass}
            rows={3}
            value={draft.text}
            onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
            placeholder="Idea text"
          />
          <input
            className={inputClass}
            value={draft.sourceQuote}
            onChange={(e) => setDraft((d) => ({ ...d, sourceQuote: e.target.value }))}
            placeholder="Source quote (optional)"
          />
        </>
      )}

      {isContentAngle(item) && (
        <>
          <textarea
            className={textareaClass}
            rows={2}
            value={draft.angle}
            onChange={(e) => setDraft((d) => ({ ...d, angle: e.target.value }))}
            placeholder="Content angle"
          />
          <div className="flex gap-2">
            <input
              className={inputClass}
              value={draft.format}
              onChange={(e) => setDraft((d) => ({ ...d, format: e.target.value }))}
              placeholder="Format (optional)"
            />
            <input
              className={inputClass}
              value={draft.audienceHint}
              onChange={(e) => setDraft((d) => ({ ...d, audienceHint: e.target.value }))}
              placeholder="Audience (optional)"
            />
          </div>
        </>
      )}

      {isPerson(item) && (
        <>
          <input
            className={inputClass}
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Name"
          />
          <div className="flex gap-2">
            <input
              className={inputClass}
              value={draft.role}
              onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
              placeholder="Role (optional)"
            />
            <input
              className={inputClass}
              value={draft.organisation}
              onChange={(e) => setDraft((d) => ({ ...d, organisation: e.target.value }))}
              placeholder="Organisation (optional)"
            />
          </div>
          <textarea
            className={textareaClass}
            rows={2}
            value={draft.context}
            onChange={(e) => setDraft((d) => ({ ...d, context: e.target.value }))}
            placeholder="Context"
          />
        </>
      )}

      {isOrganisation(item) && (
        <>
          <input
            className={inputClass}
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Name"
          />
          <textarea
            className={textareaClass}
            rows={2}
            value={draft.context}
            onChange={(e) => setDraft((d) => ({ ...d, context: e.target.value }))}
            placeholder="Context"
          />
        </>
      )}

      {isStory(item) && (
        <>
          <input
            className={inputClass}
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="Title"
          />
          <textarea
            className={textareaClass}
            rows={3}
            value={draft.narrative}
            onChange={(e) => setDraft((d) => ({ ...d, narrative: e.target.value }))}
            placeholder="Narrative"
          />
          <input
            className={inputClass}
            value={draft.hook}
            onChange={(e) => setDraft((d) => ({ ...d, hook: e.target.value }))}
            placeholder="Hook (optional)"
          />
          <input
            className={inputClass}
            value={draft.lesson}
            onChange={(e) => setDraft((d) => ({ ...d, lesson: e.target.value }))}
            placeholder="Lesson (optional)"
          />
        </>
      )}

      {isTechnique(item) && (
        <>
          <input
            className={inputClass}
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Name"
          />
          <textarea
            className={textareaClass}
            rows={2}
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="Description"
          />
          <input
            className={inputClass}
            value={draft.origin}
            onChange={(e) => setDraft((d) => ({ ...d, origin: e.target.value }))}
            placeholder="Origin (optional)"
          />
        </>
      )}

      {isConcept(item) && (
        <>
          <input
            className={inputClass}
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Name"
          />
          <textarea
            className={textareaClass}
            rows={2}
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="Description"
          />
        </>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
        >
          <Check className="h-3 w-3" /> Save
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" /> Cancel
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CategorySection
// ---------------------------------------------------------------------------

interface CategorySectionProps {
  label: string
  items: AnyItem[]
  checkedIds: Set<string>
  onToggleItem: (id: string, checked: boolean) => void
  onToggleAll: (ids: string[], checked: boolean) => void
  onEditItem?: (itemId: string, updates: Partial<AnyItem>) => void
  /** Only relevant for story items */
  storySubjects?: Record<string, StorySubject>
  onStorySubjectChange?: (id: string, subject: StorySubject) => void
  /** Dedup match info keyed by item id */
  dedupMatches?: Record<string, Array<{ matchedNodeName: string; score: number; source: 'graph' | 'pending' }>>
  /** Canonical matches keyed by item id */
  canonicalMatches?: Record<string, string>
}

export function CategorySection({
  label,
  items,
  checkedIds,
  onToggleItem,
  onToggleAll,
  onEditItem,
  storySubjects = {},
  onStorySubjectChange,
  dedupMatches = {},
  canonicalMatches = {},
}: CategorySectionProps) {
  const [sectionExpanded, setSectionExpanded] = useState(true)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)

  if (items.length === 0) return null

  const ids = items.map((i) => i.id)
  const allChecked = ids.every((id) => checkedIds.has(id))

  // Sort: HIGH/MED first, LOW last
  const sorted = [...items].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.confidence] - order[b.confidence]
  })

  const isStorySection = label === 'STORIES'

  function toggleItemExpanded(id: string) {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/40">
        <button
          onClick={() => setSectionExpanded((v) => !v)}
          className="flex items-center gap-1.5 flex-1 text-left"
        >
          {sectionExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {label}
          </span>
          <span className="ml-1 text-xs text-muted-foreground">({items.length})</span>
        </button>

        <Checkbox
          checked={allChecked}
          onCheckedChange={(checked) => onToggleAll(ids, !!checked)}
          className="h-3.5 w-3.5"
          aria-label={`Select all ${label}`}
        />
      </div>

      {/* Items */}
      {sectionExpanded && (
        <ul className="divide-y divide-border/50">
          {sorted.map((item) => {
            const isChecked = checkedIds.has(item.id)
            const isLow = item.confidence === 'low'
            const isExpanded = expandedItems.has(item.id)
            const isEditing = editingId === item.id
            const itemDedupMatches = dedupMatches[item.id]
            const canonicalName = canonicalMatches[item.id]

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
                    {isEditing ? (
                      <ItemEditForm
                        item={item}
                        onSave={(updates) => {
                          onEditItem?.(item.id, updates)
                          setEditingId(null)
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <>
                        <div
                          className="cursor-pointer"
                          onClick={() => toggleItemExpanded(item.id)}
                        >
                          <ItemDetail item={item} expanded={isExpanded} />
                        </div>

                        {/* Dedup indicators */}
                        {canonicalName && (
                          <p className="mt-1 text-xs font-medium text-warning">
                            Known as: {canonicalName}
                          </p>
                        )}
                        {itemDedupMatches && itemDedupMatches.map((match, i) => (
                          <p
                            key={i}
                            className="mt-1 text-xs font-medium text-warning"
                          >
                            {match.score > 0.85 ? 'Similar to' : 'May overlap with'}:{' '}
                            {match.matchedNodeName} ({Math.round(match.score * 100)}%)
                            {match.source === 'pending' && ' — also pending'}
                          </p>
                        ))}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {onEditItem && !isEditing && (
                      <button
                        onClick={() => setEditingId(item.id)}
                        className="text-muted-foreground hover:text-foreground p-0.5"
                        aria-label="Edit item"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                    <ConfidenceBadge confidence={item.confidence} />
                  </div>
                </div>

                {/* Story subject selector */}
                {isStorySection && isChecked && onStorySubjectChange && !isEditing && (
                  <div className="ml-6 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Subject:</span>
                    <InlineCellSelect
                      value={storySubjects[item.id] ?? 'self'}
                      options={STORY_SUBJECTS.map(s => ({ value: s.value, label: s.label }))}
                      onSave={(v) => {
                        onStorySubjectChange(item.id, v as StorySubject)
                        return Promise.resolve({ ok: true })
                      }}
                    />
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
