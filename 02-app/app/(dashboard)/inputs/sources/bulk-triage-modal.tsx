'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/components/modal'
import { ActionButton } from '@/components/action-button'
import { SelectField } from '@/components/select-field'
import { InlineCellSelect } from '@/components/inline-cell-select'
import { TagListEditor } from '@/components/tag-list-editor'
import { ParticipantsPicker } from '@/components/participants-picker'
import { InlineHint } from '@/components/inline-hint'
import { SectionCard } from '@/components/section-card'
import { SectionDivider } from '@/components/section-divider'
import {
  sourceTypeOptions,
  authorityOptions,
  getSourceTypeLabel,
} from '@/lib/source-types'
import {
  triageSourcesAction,
  searchPeopleAction,
  parkPersonAction,
} from '@/app/actions/sources'
import type { SourceType, Authority } from '@/lib/types/lens'
import type { PersonSummary } from '@/lib/types/source-list'

export interface BulkTriageSource {
  id: string
  title: string
  sourceType: SourceType
  authority: Authority
  tags: string[]
  participantIds: string[]
  summaryPreview: string | null
}

interface BulkTriageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sources: BulkTriageSource[]
  hydratedPeople: PersonSummary[]
}

interface RowDraft {
  sourceType: SourceType
  authority: Authority
  tags: string[]
  participantIds: string[]
}

export function BulkTriageModal({
  open,
  onOpenChange,
  sources,
  hydratedPeople,
}: BulkTriageModalProps) {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({})
  const [setAllSourceType, setSetAllSourceType] = useState<string>('')
  const [setAllAuthority, setSetAllAuthority] = useState<string>('')
  const [committing, setCommitting] = useState(false)

  // Hydrate drafts from source rows
  useEffect(() => {
    if (!open) return
    const next: Record<string, RowDraft> = {}
    for (const s of sources) {
      next[s.id] = {
        sourceType: s.sourceType,
        authority: s.authority,
        tags: s.tags,
        participantIds: s.participantIds,
      }
    }
    setDrafts(next)
    setSetAllSourceType('')
    setSetAllAuthority('')
  }, [open, sources])

  const updateRow = (id: string, patch: Partial<RowDraft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  const applyToAll = () => {
    setDrafts((prev) => {
      const next: Record<string, RowDraft> = {}
      for (const id of Object.keys(prev)) {
        next[id] = {
          ...prev[id],
          sourceType: (setAllSourceType as SourceType) || prev[id].sourceType,
          authority: (setAllAuthority as Authority) || prev[id].authority,
        }
      }
      return next
    })
    setSetAllSourceType('')
    setSetAllAuthority('')
  }

  const handleCommit = async () => {
    setCommitting(true)
    const ids = sources.map((s) => s.id)
    const patches: Record<string, RowDraft> = {}
    for (const id of ids) patches[id] = drafts[id]
    const result = await triageSourcesAction(ids, patches)
    setCommitting(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(`Triaged ${ids.length} source${ids.length > 1 ? 's' : ''}`)
    onOpenChange(false)
    router.refresh()
  }

  const sTypeOpts = useMemo(() => sourceTypeOptions(), [])
  const authOpts = useMemo(() => authorityOptions(), [])

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!committing) onOpenChange(o)
      }}
      title={`Triage ${sources.length} source${sources.length > 1 ? 's' : ''}`}
      size="2xl"
    >
      <div className="flex flex-col gap-4">
        {/* Set-all */}
        <SectionCard title="Apply to all">
          <div className="flex flex-col gap-2">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <SelectField
                  label="Source type"
                  value={setAllSourceType}
                  options={sTypeOpts}
                  onSave={async (v) => {
                    setSetAllSourceType(v)
                    return { ok: true }
                  }}
                  placeholder="Apply to all"
                />
              </div>
              <div className="flex-1">
                <SelectField
                  label="Authority"
                  value={setAllAuthority}
                  options={authOpts}
                  onSave={async (v) => {
                    setSetAllAuthority(v)
                    return { ok: true }
                  }}
                  placeholder="Apply to all"
                />
              </div>
              <ActionButton
                variant="outline"
                onClick={applyToAll}
                disabled={!setAllSourceType && !setAllAuthority}
              >
                Apply →
              </ActionButton>
            </div>
            <InlineHint align="left">Per-source overrides happen below.</InlineHint>
          </div>
        </SectionCard>

        {/* Per-source list */}
        <div className="max-h-[420px] overflow-y-auto flex flex-col">
          {sources.map((s, idx) => {
            const draft = drafts[s.id]
            if (!draft) return null
            return (
              <div key={s.id} className="flex flex-col">
                {idx > 0 && <SectionDivider />}
                <div className="flex flex-col gap-2 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{s.title}</h4>
                    {s.summaryPreview && (
                      <InlineHint align="left" className="italic">
                        {s.summaryPreview}
                      </InlineHint>
                    )}
                  </div>
                  <div className="w-40">
                    <InlineCellSelect
                      value={draft.sourceType}
                      options={sTypeOpts}
                      onSave={async (v) => {
                        updateRow(s.id, { sourceType: v as SourceType })
                        return { ok: true }
                      }}
                      placeholder={getSourceTypeLabel(s.sourceType)}
                    />
                  </div>
                  <div className="w-44">
                    <InlineCellSelect
                      value={draft.authority}
                      options={authOpts}
                      onSave={async (v) => {
                        updateRow(s.id, { authority: v as Authority })
                        return { ok: true }
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-start gap-4 pl-0">
                  <div className="flex-1">
                    <TagListEditor
                      value={draft.tags}
                      onSave={async (next) => {
                        updateRow(s.id, { tags: next })
                        return { ok: true }
                      }}
                      label="Tags"
                    />
                  </div>
                  <div className="flex-1">
                    <ParticipantsPicker
                      value={draft.participantIds}
                      hydratedPeople={hydratedPeople}
                      onSave={async (next) => {
                        updateRow(s.id, { participantIds: next })
                        return { ok: true }
                      }}
                      searchPeople={searchPeopleAction}
                      onParkUnresolved={parkPersonAction}
                      label="Participants"
                    />
                  </div>
                </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-2">
          <ActionButton variant="outline" onClick={() => onOpenChange(false)} disabled={committing}>
            Cancel
          </ActionButton>
          <ActionButton onClick={handleCommit} loading={committing}>
            {committing ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                Triaging…
              </>
            ) : (
              `Triage ${sources.length} source${sources.length > 1 ? 's' : ''} ✓`
            )}
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
