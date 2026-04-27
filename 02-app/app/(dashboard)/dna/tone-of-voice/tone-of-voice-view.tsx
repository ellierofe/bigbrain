'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Pen, Brain, Plus, Trash2, Globe,
  Languages, MessageSquare, Tag, Layers, FileText, StickyNote, Link, Sparkles, Check, X,
} from 'lucide-react'
import { ActionButton } from '@/components/action-button'
import { PageChrome } from '@/components/page-chrome'
import { ContentPane } from '@/components/content-pane'
import { TabbedPane } from '@/components/tabbed-pane'
import { InlineField } from '@/components/inline-field'
import { SliderField } from '@/components/slider-field'
import {
  saveTovField,
  saveTovDimensions,
  saveTovVocabulary,
  saveTovStatus,
  removeSample,
  saveSampleField,
  regenerateToneOfVoice,
  approveDraftToneOfVoice,
  discardDraftToneOfVoice,
} from '@/app/actions/tone-of-voice'
import type { DnaToneOfVoice, DnaTovSample, DnaTovApplication } from '@/lib/db/schema/dna/tone-of-voice'
import type { TovDimensions } from '@/lib/types/tone-of-voice'
import { ApplicationsTab } from '@/components/applications-tab'
import { AddSamplesModal } from '@/components/add-samples-modal'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Dimension {
  score: number
  description: string
}

interface Dimensions {
  humour: Dimension
  reverence: Dimension
  formality: Dimension
  enthusiasm: Dimension
}

interface VocabEntry {
  use: string
  avoid: string
  notes: string
}

interface BrandVocabulary {
  entries: VocabEntry[]
  overview: string
}

// Backwards-compat: old format was { preferred: string[], avoid: string[], notes: string }
function normaliseVocabulary(raw: unknown): BrandVocabulary {
  if (!raw || typeof raw !== 'object') return { entries: [], overview: '' }
  const obj = raw as Record<string, unknown>

  // New format
  if (Array.isArray(obj.entries)) {
    return { entries: obj.entries as VocabEntry[], overview: (obj.overview as string) ?? '' }
  }

  // Old format — convert preferred/avoid lists into paired entries
  const preferred = Array.isArray(obj.preferred) ? obj.preferred as string[] : []
  const avoid = Array.isArray(obj.avoid) ? obj.avoid as string[] : []
  const notes = typeof obj.notes === 'string' ? obj.notes : ''
  const maxLen = Math.max(preferred.length, avoid.length)
  const entries: VocabEntry[] = []
  for (let i = 0; i < maxLen; i++) {
    entries.push({
      use: preferred[i] ?? '',
      avoid: avoid[i] ?? '',
      notes: '',
    })
  }
  return { entries, overview: notes }
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

interface ToneOfVoiceViewProps {
  brandId: string
  tov: DnaToneOfVoice | null
  draft: DnaToneOfVoice | null
  active: DnaToneOfVoice | null
  samples: DnaTovSample[]
  applications: DnaTovApplication[]
}

export function ToneOfVoiceView({ brandId, tov, draft, active, samples, applications }: ToneOfVoiceViewProps) {
  const [addSamplesOpen, setAddSamplesOpen] = useState(false)
  const [regenPending, startRegen] = useTransition()
  const [approvePending, startApprove] = useTransition()
  const [discardPending, startDiscard] = useTransition()

  if (!tov) {
    return (
      <div className="flex flex-col h-full">
        <PageChrome
          title="Tone of Voice"
          subtitle="Voice parameters, writing samples, and per-format application rules."
        />
        <ContentPane>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground">
              No tone of voice profile yet. Add writing samples and generate one.
            </p>
          </div>
        </ContentPane>
      </div>
    )
  }

  const dimensions = (tov.dimensions ?? {}) as Dimensions
  const vocabulary = normaliseVocabulary(tov.brandVocabulary)
  const isDraft = tov.status === 'draft'
  const isReviewingRegen = Boolean(draft && active)

  function makeFieldSaver(field: string) {
    return async (value: string) => {
      return saveTovField(field, value || null)
    }
  }

  async function handleActivate() {
    const result = await saveTovStatus('active')
    if (result.ok) {
      toast.success('Tone of voice activated')
    } else {
      toast.error(result.error)
    }
  }

  function handleRegenerate() {
    startRegen(async () => {
      const result = await regenerateToneOfVoice()
      if (result.ok) {
        toast.success('Draft regenerated. Review and approve to replace the current voice.')
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleApprove() {
    startApprove(async () => {
      const result = await approveDraftToneOfVoice()
      if (result.ok) toast.success('Draft approved')
      else toast.error(result.error)
    })
  }

  function handleDiscard() {
    startDiscard(async () => {
      const result = await discardDraftToneOfVoice()
      if (result.ok) toast.success('Draft discarded')
      else toast.error(result.error)
    })
  }


  return (
    <div className="flex flex-col h-full">
      <PageChrome
        title="Tone of Voice"
        subtitle="Voice parameters, writing samples, and per-format application rules."
        action={
          <div className="flex items-center gap-2">
            {isReviewingRegen ? (
              <>
                <ActionButton
                  icon={X}
                  variant="outline"
                  onClick={handleDiscard}
                  loading={discardPending}
                  disabled={approvePending}
                >
                  Discard draft
                </ActionButton>
                <ActionButton
                  icon={Check}
                  onClick={handleApprove}
                  loading={approvePending}
                  disabled={discardPending}
                >
                  Approve draft
                </ActionButton>
              </>
            ) : isDraft ? (
              <ActionButton onClick={handleActivate}>
                Mark as active
              </ActionButton>
            ) : (
              <>
                <ActionButton
                  icon={Sparkles}
                  variant="outline"
                  onClick={handleRegenerate}
                  loading={regenPending}
                  tooltip={samples.length === 0 ? 'Add writing samples first.' : undefined}
                  disabled={samples.length === 0}
                >
                  Regenerate from samples
                </ActionButton>
                <span className="inline-flex items-center rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-medium text-success-foreground">
                  Active
                </span>
              </>
            )}
          </div>
        }
        subheader={
          <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
            <span>v{tov.version}</span>
            {tov.generatedFromSamplesAt && (
              <span>&middot; Generated {new Date(tov.generatedFromSamplesAt).toLocaleDateString('en-GB')}</span>
            )}
            {tov.lastEditedByHumanAt && (
              <span>&middot; Last edited {new Date(tov.lastEditedByHumanAt).toLocaleDateString('en-GB')}</span>
            )}
            {isReviewingRegen && (
              <span className="text-primary">
                &middot; Reviewing regenerated draft
              </span>
            )}
          </div>
        }
      />

      <ContentPane padding={false} className="flex flex-col">
        {/* Two-column layout */}
        <div className="flex flex-1 min-h-0">

          {/* Left panel — summary + language */}
          <aside className="w-64 shrink-0 flex flex-col gap-6 overflow-y-auto border-r border-border/40 bg-muted/30 px-6 py-6">
            <InlineField
              variant="textarea"
              label="Voice summary"
              icon={Globe}
              value={tov.summary}
              placeholder="Your tone of voice summary..."
              rows={12}
              labelBg="bg-background"
              className="text-sm leading-relaxed"
              onSave={makeFieldSaver('summary')}
            />

            {/* Language settings */}
            <div className="border-t border-border/40 pt-6 flex flex-col gap-4">
              <InlineField
                variant="input"
                label="Language"
                icon={Languages}
                value={tov.language}
                placeholder="en-GB"
                labelBg="bg-background"
                onSave={makeFieldSaver('language')}
              />
              <InlineField
                variant="input"
                label="Grammatical person"
                icon={MessageSquare}
                value={tov.grammaticalPerson}
                placeholder="first_singular"
                labelBg="bg-background"
                onSave={makeFieldSaver('grammaticalPerson')}
              />
            </div>
          </aside>

          {/* Right panel — tabbed content */}
          <div className="flex-1 min-w-0 flex flex-col min-h-0 px-6 py-6">
            <TabbedPane
              className="flex-1 min-h-0"
              tabs={[
                {
                  id: 'linguistics',
                  label: 'Linguistics',
                  content: (
                    <div className="flex flex-col gap-6 pb-8">
                      <InlineField
                        variant="textarea"
                        label="Linguistic notes"
                        icon={Pen}
                        description="Lexical choices, sentence structure, rhythm, cadence, figurative language, idiosyncrasies."
                        value={tov.linguisticNotes}
                        placeholder="Specific observations about how the voice uses language..."
                        rows={8}
                        onSave={makeFieldSaver('linguisticNotes')}
                      />
                      <InlineField
                        variant="textarea"
                        label="Emotional resonance"
                        icon={Brain}
                        description="How persuasive, educational, and emotive elements are incorporated."
                        value={tov.emotionalResonance}
                        placeholder="How the writing makes people feel and why..."
                        rows={8}
                        onSave={makeFieldSaver('emotionalResonance')}
                      />
                    </div>
                  ),
                },
                {
                  id: 'dimensions',
                  label: 'Dimensions',
                  content: <DimensionsTab dimensions={dimensions} />,
                },
                {
                  id: 'vocabulary',
                  label: 'Vocabulary',
                  content: <VocabularyTab vocabulary={vocabulary} />,
                },
                {
                  id: 'samples',
                  label: `Samples (${samples.length})`,
                  content: (
                    <SamplesTab
                      samples={samples}
                      onOpenAddSamples={() => setAddSamplesOpen(true)}
                    />
                  ),
                },
                {
                  id: 'applications',
                  label: `Applications (${applications.filter((a) => a.isCurrent).length})`,
                  content: (
                    <ApplicationsTab
                      applications={applications}
                      baseDimensions={dimensions as TovDimensions}
                    />
                  ),
                },
              ]}
            />
          </div>
        </div>
      </ContentPane>

      <AddSamplesModal
        open={addSamplesOpen}
        onOpenChange={setAddSamplesOpen}
        brandId={brandId}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dimensions tab
// ---------------------------------------------------------------------------

const DIMENSION_META: Record<string, { label: string; low: string; high: string }> = {
  humour: { label: 'Humour', low: 'Serious', high: 'Full-bore funny' },
  reverence: { label: 'Reverence', low: 'Highly reverent', high: 'Extremely irreverent' },
  formality: { label: 'Formality', low: 'Traditionally formal', high: 'Extremely casual' },
  enthusiasm: { label: 'Enthusiasm', low: 'Unenthusiastic', high: 'Maximum enthusiasm' },
}

function DimensionsTab({ dimensions }: { dimensions: Dimensions }) {
  const [localDims, setLocalDims] = useState(dimensions)

  async function handleDescriptionChange(key: string, description: string) {
    const current = localDims[key as keyof Dimensions]
    if (description === current.description) return
    const updated = {
      ...localDims,
      [key]: { ...current, description },
    }
    setLocalDims(updated)
    const result = await saveTovDimensions(updated)
    if (!result.ok) toast.error(result.error)
  }

  return (
    <div className="flex flex-col gap-8 pb-8">
      <p className="text-xs text-muted-foreground">
        Four dimensions scored 0–100. Drag sliders to adjust; edit descriptions to refine how each manifests.
      </p>
      {Object.entries(DIMENSION_META).map(([key, meta]) => {
        const dim = localDims[key as keyof Dimensions]
        if (!dim) return null

        return (
          <div key={key} className="flex flex-col gap-2">
            <SliderField
              label={meta.label}
              value={dim.score}
              min={0}
              max={100}
              step={5}
              lowLabel={meta.low}
              highLabel={meta.high}
              onSave={async (score) => {
                const result = await saveTovDimensions({
                  ...localDims,
                  [key]: { ...localDims[key as keyof Dimensions], score },
                })
                if (result.ok) {
                  setLocalDims(prev => ({
                    ...prev,
                    [key]: { ...prev[key as keyof Dimensions], score },
                  }))
                }
                return result
              }}
            />

            <textarea
              value={dim.description}
              onChange={(e) =>
                setLocalDims(prev => ({
                  ...prev,
                  [key]: { ...prev[key as keyof Dimensions], description: e.target.value },
                }))
              }
              onBlur={(e) => handleDescriptionChange(key, e.target.value)}
              rows={2}
              placeholder="How this dimension manifests in the voice..."
              className="w-full resize-none rounded-md border border-transparent bg-transparent px-0 py-1 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-border focus:bg-muted/30 focus:px-2 hover:bg-muted/20 hover:px-2 transition-all duration-100"
              aria-label={`${meta.label} description`}
            />
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vocabulary tab — table: Use | Avoid | Notes
// ---------------------------------------------------------------------------

function VocabularyTab({ vocabulary }: { vocabulary: BrandVocabulary }) {
  const [entries, setEntries] = useState<VocabEntry[]>(vocabulary.entries)
  const [overview, setOverview] = useState(vocabulary.overview)

  async function persistVocab(updated: VocabEntry[], ov?: string) {
    const result = await saveTovVocabulary({
      entries: updated,
      overview: ov ?? overview,
    })
    if (!result.ok) toast.error(result.error)
  }

  function updateEntry(index: number, field: keyof VocabEntry, value: string) {
    const updated = entries.map((e, i) => i === index ? { ...e, [field]: value } : e)
    setEntries(updated)
  }

  function commitEntry(index: number) {
    persistVocab(entries)
  }

  function addEntry() {
    const updated = [...entries, { use: '', avoid: '', notes: '' }]
    setEntries(updated)
    persistVocab(updated)
  }

  function removeEntry(index: number) {
    const updated = entries.filter((_, i) => i !== index)
    setEntries(updated)
    persistVocab(updated)
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Overview — pattern-level guidance */}
      <div>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Vocabulary overview
        </span>
        <p className="text-xs text-muted-foreground/60 mb-2">
          General guidance on the kind of words this voice uses. Specific entries go in the table below.
        </p>
        <textarea
          value={overview}
          onChange={(e) => setOverview(e.target.value)}
          onBlur={() => persistVocab(entries, overview)}
          rows={3}
          placeholder="e.g. Prefer Anglo-Saxon words over Latinate equivalents. Short words over long where meaning is equal..."
          className="w-full resize-none rounded-md border border-transparent bg-transparent px-0 py-1 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-border focus:bg-muted/30 focus:px-2 hover:bg-muted/20 hover:px-2 transition-all duration-100"
          aria-label="Vocabulary overview"
        />
      </div>

      {/* Table */}
      <div>
        <div className="rounded-lg border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_1fr_1.5fr_2rem] gap-0 bg-muted/50 border-b px-3 py-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Use</span>
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Avoid</span>
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</span>
            <span />
          </div>

          {/* Rows */}
          {entries.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground/60">
              No vocabulary entries yet. Add specific word choices below.
            </div>
          ) : (
            entries.map((entry, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_1fr_1.5fr_2rem] gap-0 border-b last:border-b-0 px-3 py-1.5 items-center hover:bg-muted/20 transition-colors"
              >
                <input
                  type="text"
                  value={entry.use}
                  onChange={(e) => updateEntry(i, 'use', e.target.value)}
                  onBlur={() => commitEntry(i)}
                  placeholder="pitch"
                  className="bg-transparent text-sm py-1 pr-2 focus:outline-none placeholder:text-muted-foreground/40"
                  aria-label={`Use word ${i + 1}`}
                />
                <input
                  type="text"
                  value={entry.avoid}
                  onChange={(e) => updateEntry(i, 'avoid', e.target.value)}
                  onBlur={() => commitEntry(i)}
                  placeholder="deck"
                  className="bg-transparent text-sm py-1 pr-2 focus:outline-none placeholder:text-muted-foreground/40"
                  aria-label={`Avoid word ${i + 1}`}
                />
                <input
                  type="text"
                  value={entry.notes}
                  onChange={(e) => updateEntry(i, 'notes', e.target.value)}
                  onBlur={() => commitEntry(i)}
                  placeholder="context or reasoning..."
                  className="bg-transparent text-sm py-1 pr-2 focus:outline-none placeholder:text-muted-foreground/40 text-muted-foreground"
                  aria-label={`Notes ${i + 1}`}
                />
                <button
                  onClick={() => removeEntry(i)}
                  className="p-1 text-muted-foreground/40 hover:text-destructive transition-colors"
                  aria-label={`Remove entry ${i + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <ActionButton
          icon={Plus}
          variant="outline"
          onClick={addEntry}
          className="mt-3"
        >
          Add entry
        </ActionButton>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Samples tab — browsable table with delete + expand
// ---------------------------------------------------------------------------

function SamplesTab({
  samples,
  onOpenAddSamples,
}: {
  samples: DnaTovSample[]
  onOpenAddSamples: () => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [localSamples, setLocalSamples] = useState(samples)

  // Resync after parent revalidatePath updates (new samples added, etc.).
  useEffect(() => {
    setLocalSamples(samples)
  }, [samples])

  async function handleDelete(id: string) {
    const result = await removeSample(id)
    if (result.ok) {
      setLocalSamples(prev => prev.filter(s => s.id !== id))
      toast.success('Sample removed')
      if (expandedId === id) setExpandedId(null)
    } else {
      toast.error(result.error)
    }
  }

  function makeSampleFieldSaver(id: string, field: string) {
    return async (value: string) => {
      return saveSampleField(id, field, value || null)
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Real writing samples that demonstrate the voice. Click a row to expand and edit.
        </p>
        <ActionButton icon={Plus} variant="outline" onClick={onOpenAddSamples}>
          Add from sources
        </ActionButton>
      </div>

      <div className="rounded-lg border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[6rem_1fr_10rem_2rem] gap-0 bg-muted/50 border-b px-3 py-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Format</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source</span>
          <span />
        </div>

        {/* Rows */}
        {localSamples.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground/60">
            No writing samples yet.
          </div>
        ) : (
          localSamples.map((sample) => (
            <div key={sample.id} className="border-b last:border-b-0">
              {/* Summary row */}
              <div
                className="grid grid-cols-[6rem_1fr_10rem_2rem] gap-0 px-3 py-2 items-center hover:bg-muted/20 transition-colors cursor-pointer"
                onClick={() => setExpandedId(expandedId === sample.id ? null : sample.id)}
              >
                <span className="text-xs">
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {sample.formatType}
                  </span>
                </span>
                <span className="text-sm truncate pr-4">
                  {sample.body.substring(0, 80)}...
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {sample.subtype ?? '—'}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(sample.id) }}
                  className="p-1 text-muted-foreground/40 hover:text-destructive transition-colors"
                  aria-label="Remove sample"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Expanded detail */}
              {expandedId === sample.id && (
                <div className="px-3 pb-4 pt-1 bg-muted/10 border-t border-border/40">
                  <div className="flex flex-col gap-3 max-w-2xl">
                    <div className="flex gap-4">
                      <InlineField
                        variant="input"
                        label="Format type"
                        icon={Tag}
                        value={sample.formatType}
                        onSave={makeSampleFieldSaver(sample.id, 'formatType')}
                      />
                      <InlineField
                        variant="input"
                        label="Subtype"
                        icon={Layers}
                        value={sample.subtype}
                        onSave={makeSampleFieldSaver(sample.id, 'subtype')}
                      />
                    </div>
                    <InlineField
                      variant="textarea"
                      label="Body"
                      icon={FileText}
                      value={sample.body}
                      rows={8}
                      onSave={makeSampleFieldSaver(sample.id, 'body')}
                    />
                    <InlineField
                      variant="textarea"
                      label="Notes"
                      icon={StickyNote}
                      value={sample.notes}
                      rows={3}
                      placeholder="What makes this a good example..."
                      onSave={makeSampleFieldSaver(sample.id, 'notes')}
                    />
                    <InlineField
                      variant="input"
                      label="Source context"
                      icon={Link}
                      value={sample.sourceContext}
                      placeholder="Where this came from..."
                      onSave={makeSampleFieldSaver(sample.id, 'sourceContext')}
                    />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
