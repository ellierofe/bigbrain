'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Plus, Archive, ArchiveRestore, Tag, Layers, Hash,
  Pen, FileText, Sparkles, Smile, Heart, Crown, Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { InlineField } from '@/components/inline-field'
import { SelectField } from '@/components/select-field'
import { SliderField } from '@/components/slider-field'
import { SectionDivider } from '@/components/section-divider'
import { StringListEditor } from '@/components/string-list-editor'
import { Button } from '@/components/ui/button'
import { CreateApplicationModal } from '@/components/create-application-modal'

import {
  saveApplicationField,
  saveApplicationDeltas,
  saveApplicationDoNotUse,
  archiveApplicationAction,
  restoreApplicationAction,
} from '@/app/actions/tone-of-voice'

import {
  TOV_FORMAT_OPTIONS,
  TOV_FORMAT_LABELS,
  TOV_DIMENSION_KEYS,
  type TovDimensionKey,
  type TovDimensionDeltas,
  type TovDimensions,
  type TovFormatType,
} from '@/lib/types/tone-of-voice'

import type { DnaTovApplication } from '@/lib/db/schema/dna/tone-of-voice'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Static metadata
// ---------------------------------------------------------------------------

const DIMENSION_META: Record<TovDimensionKey, { label: string; icon: LucideIcon }> = {
  humour: { label: 'Humour', icon: Smile },
  reverence: { label: 'Reverence', icon: Crown },
  formality: { label: 'Formality', icon: Heart },
  enthusiasm: { label: 'Enthusiasm', icon: Zap },
}

// ---------------------------------------------------------------------------
// Top-level
// ---------------------------------------------------------------------------

interface ApplicationsTabProps {
  applications: DnaTovApplication[]
  baseDimensions: Partial<TovDimensions>
}

export function ApplicationsTab({ applications: initialApps, baseDimensions }: ApplicationsTabProps) {
  const [applications, setApplications] = useState<DnaTovApplication[]>(initialApps)
  const [showArchived, setShowArchived] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  // Sort: current first, then most-recently-updated
  const sortedAll = useMemo(() => {
    return [...applications].sort((a, b) => {
      if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }, [applications])

  const visibleApps = useMemo(
    () => (showArchived ? sortedAll : sortedAll.filter((a) => a.isCurrent)),
    [sortedAll, showArchived]
  )

  const archivedCount = applications.filter((a) => !a.isCurrent).length
  const visibleCount = visibleApps.length

  const [selectedId, setSelectedId] = useState<string | null>(visibleApps[0]?.id ?? null)

  // Keep selection valid when applications or visibility changes
  useEffect(() => {
    if (selectedId && visibleApps.some((a) => a.id === selectedId)) return
    setSelectedId(visibleApps[0]?.id ?? null)
  }, [visibleApps, selectedId])

  const selected = useMemo(
    () => applications.find((a) => a.id === selectedId) ?? null,
    [applications, selectedId]
  )

  // Local mutation helpers — keep parent state in sync without full revalidation
  function patchApplication(id: string, patch: Partial<DnaTovApplication>) {
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: new Date() as any } : a))
    )
  }

  async function handleArchive(app: DnaTovApplication) {
    const result = await archiveApplicationAction(app.id)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    patchApplication(app.id, { isCurrent: false })
    toast.success(`Archived "${app.label}"`, {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: async () => {
          const restore = await restoreApplicationAction(app.id)
          if (restore.ok) patchApplication(app.id, { isCurrent: true })
          else toast.error(restore.error)
        },
      },
    })
  }

  async function handleRestore(app: DnaTovApplication) {
    const result = await restoreApplicationAction(app.id)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    patchApplication(app.id, { isCurrent: true })
  }

  function handleCreated(
    id: string,
    payload: { label: string; formatType: string; subtype: string | null }
  ) {
    const placeholder: DnaTovApplication = {
      id,
      brandId: '',
      label: payload.label,
      formatType: payload.formatType,
      subtype: payload.subtype,
      dimensionDeltas: null,
      tonalTags: null,
      notes: null,
      doNotUse: null,
      structuralGuidance: null,
      isCurrent: true,
      createdAt: new Date() as any,
      updatedAt: new Date() as any,
    }
    setApplications((prev) => [placeholder, ...prev])
    setSelectedId(id)
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="flex h-full min-h-0">
        <MasterPane
          applications={visibleApps}
          totalCount={visibleCount}
          selectedId={selectedId}
          onSelect={setSelectedId}
          showArchived={showArchived}
          onToggleArchived={setShowArchived}
          archivedCount={archivedCount}
          onCreate={() => setCreateOpen(true)}
        />

        <DetailPane
          application={selected}
          baseDimensions={baseDimensions}
          onPatch={patchApplication}
          onArchive={handleArchive}
          onRestore={handleRestore}
        />
      </div>

      <CreateApplicationModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// MasterPane
// ---------------------------------------------------------------------------

interface MasterPaneProps {
  applications: DnaTovApplication[]
  totalCount: number
  selectedId: string | null
  onSelect: (id: string) => void
  showArchived: boolean
  onToggleArchived: (show: boolean) => void
  archivedCount: number
  onCreate: () => void
}

function MasterPane({
  applications,
  totalCount,
  selectedId,
  onSelect,
  showArchived,
  onToggleArchived,
  archivedCount,
  onCreate,
}: MasterPaneProps) {
  const isEmpty = applications.length === 0

  return (
    <aside className="w-52 shrink-0 flex flex-col border-r border-border/40 bg-muted/20">
      {/* Fixed top */}
      <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Applications ({totalCount})
        </span>
        {archivedCount > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => onToggleArchived(e.target.checked)}
              className="h-3 w-3 cursor-pointer"
              aria-label="Show archived applications"
            />
            Archived
          </label>
        )}
      </div>

      {/* Scrolling list */}
      <ul className="flex-1 overflow-y-auto min-h-0">
        {isEmpty ? (
          <li className="px-4 py-6 text-center text-xs text-muted-foreground/70">
            No applications yet. Create one to define how the voice shifts for a specific format.
          </li>
        ) : (
          applications.map((app) => {
            const isActive = app.id === selectedId
            const archived = !app.isCurrent
            return (
              <li key={app.id}>
                <button
                  type="button"
                  onClick={() => onSelect(app.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-l-2 transition-colors',
                    isActive
                      ? 'border-primary bg-muted/40'
                      : 'border-transparent hover:bg-muted/20',
                  )}
                >
                  <div className={cn(
                    'text-sm font-semibold truncate',
                    archived && 'italic text-muted-foreground',
                  )}>
                    {app.label || 'Untitled application'}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs">
                    {archived ? (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-muted-foreground/70">
                        Archived
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                        {TOV_FORMAT_LABELS[app.formatType as TovFormatType] ?? app.formatType}
                      </span>
                    )}
                    {app.subtype && (
                      <span className="text-muted-foreground/60 truncate">
                        · {app.subtype}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            )
          })
        )}
      </ul>

      {/* Fixed bottom */}
      <div className="px-3 py-3 border-t border-border/40">
        <Button
          variant="outline"
          size="sm"
          onClick={onCreate}
          className="w-full gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          New application
        </Button>
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// DetailPane
// ---------------------------------------------------------------------------

interface DetailPaneProps {
  application: DnaTovApplication | null
  baseDimensions: Partial<TovDimensions>
  onPatch: (id: string, patch: Partial<DnaTovApplication>) => void
  onArchive: (app: DnaTovApplication) => void
  onRestore: (app: DnaTovApplication) => void
}

function DetailPane({ application, baseDimensions, onPatch, onArchive, onRestore }: DetailPaneProps) {
  if (!application) {
    return (
      <div className="flex-1 min-w-0 flex items-center justify-center text-sm text-muted-foreground">
        Select an application from the list, or create one.
      </div>
    )
  }

  const app = application
  const archived = !app.isCurrent
  const deltas = (app.dimensionDeltas as TovDimensionDeltas | null) ?? {}

  // Field savers — patch local state on success so master list reflects edits live
  function makeFieldSaver(field: string) {
    return async (value: string) => {
      const result = await saveApplicationField(app.id, field, value || null)
      if (result.ok) {
        onPatch(app.id, { [field]: value || null } as any)
      }
      return result
    }
  }

  async function saveDelta(key: TovDimensionKey, score: number) {
    const next: TovDimensionDeltas = { ...deltas, [key]: score }
    const result = await saveApplicationDeltas(app.id, next)
    if (result.ok) onPatch(app.id, { dimensionDeltas: next as any })
    return result
  }

  async function saveDeltaNotes(value: string) {
    const next: TovDimensionDeltas = { ...deltas, notes: value || undefined }
    const result = await saveApplicationDeltas(app.id, next)
    if (result.ok) onPatch(app.id, { dimensionDeltas: next as any })
    return result
  }

  async function saveDoNotUse(values: string[]) {
    const result = await saveApplicationDoNotUse(app.id, values)
    if (result.ok) onPatch(app.id, { doNotUse: values as any })
    return { ok: result.ok }
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col min-h-0">
      {/* Fixed top chrome */}
      <div className="px-6 py-4 border-b border-border/40 flex flex-col gap-3 shrink-0">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <InlineField
              key={`label-${application.id}`}
              variant="input"
              label="Label"
              icon={Tag}
              value={application.label}
              placeholder="e.g. LinkedIn posts"
              onSave={makeFieldSaver('label')}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 h-8 w-8 p-0"
            onClick={() => archived ? onRestore(application) : onArchive(application)}
            aria-label={archived ? 'Restore application' : 'Archive application'}
            title={archived ? 'Restore' : 'Archive'}
          >
            {archived
              ? <ArchiveRestore className="h-4 w-4" />
              : <Archive className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-40 shrink-0">
            <SelectField
              key={`format-${application.id}`}
              label="Format type"
              icon={Layers}
              value={application.formatType}
              options={TOV_FORMAT_OPTIONS}
              onSave={async (value) => {
                const result = await saveApplicationField(application.id, 'formatType', value)
                if (result.ok) onPatch(application.id, { formatType: value })
                return result
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <InlineField
              key={`subtype-${application.id}`}
              variant="input"
              label="Subtype"
              icon={Hash}
              value={application.subtype}
              placeholder="e.g. linkedin_post"
              onSave={makeFieldSaver('subtype')}
            />
          </div>
        </div>
      </div>

      {/* Scrolling body */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5">
        <div className="flex flex-col gap-6 max-w-3xl">

          {/* Dimension deltas */}
          <div className="flex flex-col gap-3">
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Voice shift from base
              </span>
              <p className="text-xs text-muted-foreground/70 mt-1">
                These adjust the base voice for this format — e.g. +15 formality for client emails.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {TOV_DIMENSION_KEYS.map((key) => (
                <DimensionDeltaRow
                  key={`${application.id}-${key}`}
                  dimensionKey={key}
                  delta={deltas[key] ?? 0}
                  base={baseDimensions[key]?.score ?? null}
                  onSave={(value) => saveDelta(key, value)}
                />
              ))}
            </div>

            <InlineField
              key={`delta-notes-${application.id}`}
              variant="textarea"
              label="Delta notes"
              icon={Pen}
              value={deltas.notes ?? null}
              placeholder="e.g. Client emails are slightly more formal than general brand content"
              rows={2}
              onSave={saveDeltaNotes}
            />
          </div>

          <SectionDivider />

          {/* Prose fields */}
          <div className="flex flex-col gap-4">
            <InlineField
              key={`notes-${application.id}`}
              variant="textarea"
              label="Application notes"
              icon={FileText}
              description="What changes and why. Cadence, CTA style, sentence length, emotional register shifts."
              value={application.notes}
              placeholder="Notes on how the voice shifts for this format..."
              rows={4}
              onSave={makeFieldSaver('notes')}
            />
            <InlineField
              key={`structural-${application.id}`}
              variant="textarea"
              label="Structural guidance"
              icon={Sparkles}
              description="Format-specific structural rules (e.g. hook in first line, no more than 3 paragraphs)."
              value={application.structuralGuidance}
              placeholder="Structural rules for this format..."
              rows={4}
              onSave={makeFieldSaver('structuralGuidance')}
            />
          </div>

          <SectionDivider />

          {/* Do not use */}
          <div className="flex flex-col gap-2">
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Do not use
              </span>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Specific things to avoid in this format that are otherwise acceptable.
              </p>
            </div>
            <StringListEditor
              key={`donotuse-${application.id}`}
              values={application.doNotUse ?? []}
              onSave={saveDoNotUse}
              placeholder="Add a thing to avoid…"
            />
          </div>

          {/* Deferred-scope footnote */}
          <p className="text-[11px] text-muted-foreground/60 mt-4">
            Tonal tags and embeddings are set at generation time (coming with OUT-02).
          </p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dimension delta row
// ---------------------------------------------------------------------------

interface DimensionDeltaRowProps {
  dimensionKey: TovDimensionKey
  delta: number
  base: number | null
  onSave: (value: number) => Promise<{ ok: boolean; error?: string }>
}

function DimensionDeltaRow({ dimensionKey, delta, base, onSave }: DimensionDeltaRowProps) {
  const meta = DIMENSION_META[dimensionKey]
  const effective = base !== null ? Math.max(0, Math.min(100, base + delta)) : null

  return (
    <div className="flex flex-col gap-1">
      <SliderField
        label={meta.label}
        icon={meta.icon}
        value={delta}
        min={-50}
        max={50}
        step={5}
        onSave={onSave}
        zeroCentred
      />
      {effective !== null && (
        <p className="text-[11px] text-muted-foreground tabular-nums pl-3">
          Base {base} → With delta: {effective}
        </p>
      )}
    </div>
  )
}
