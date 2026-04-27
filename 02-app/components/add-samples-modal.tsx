'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/modal'
import { ActionButton } from '@/components/action-button'
import { SourceDocPicker } from '@/components/source-doc-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { addSamplesFromSources } from '@/app/actions/tone-of-voice'
import { TOV_FORMAT_OPTIONS, type TovFormatType } from '@/lib/types/tone-of-voice'

interface SourceMeta {
  id: string
  title: string
  type: string
}

interface AddSamplesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  brandId: string
  /** Source doc IDs already used as samples — hidden from the picker. */
  excludeIds?: string[]
  onAdded?: (created: number) => void
}

/**
 * SOURCE_TYPE_TO_FORMAT — best-guess default for the format select. Easy to
 * override per-source in step 2.
 */
const SOURCE_TYPE_TO_FORMAT: Record<string, TovFormatType> = {
  transcript: 'spoken',
  'voice-note': 'spoken',
  email: 'email',
}

export function AddSamplesModal({
  open,
  onOpenChange,
  brandId,
  excludeIds = [],
  onAdded,
}: AddSamplesModalProps) {
  const [step, setStep] = useState<'pick' | 'categorise'>('pick')
  const [pickedIds, setPickedIds] = useState<string[]>([])
  const [pickedMeta, setPickedMeta] = useState<Record<string, SourceMeta>>({})
  const [drafts, setDrafts] = useState<
    Record<string, { formatType: TovFormatType | ''; subtype: string }>
  >({})
  const [submitting, setSubmitting] = useState(false)

  // Mirrors `step` but readable synchronously inside same-tick callbacks
  // (the SourceDocPicker fires onSelect → onOpenChange synchronously, and the
  // state update from onSelect hasn't flushed when onOpenChange runs).
  const stepRef = useRef(step)
  stepRef.current = step

  // Reset state when the modal closes externally
  useEffect(() => {
    if (!open) {
      setStep('pick')
      stepRef.current = 'pick'
      setPickedIds([])
      setPickedMeta({})
      setDrafts({})
      setSubmitting(false)
    }
  }, [open])

  async function handlePicked(ids: string[]) {
    if (ids.length === 0) {
      onOpenChange(false)
      return
    }

    // SourceDocPicker calls onOpenChange(false) synchronously right after
    // onSelect — advance to step 2 via both ref and state so the close handler
    // (running same-tick) sees we've left step 1 and doesn't forward.
    stepRef.current = 'categorise'
    setStep('categorise')
    setPickedIds(ids)
    // Seed empty drafts so the rows render immediately. Format defaults are
    // applied once metadata arrives.
    setDrafts(
      Object.fromEntries(ids.map((id) => [id, { formatType: '' as TovFormatType | '', subtype: '' }]))
    )

    // Fetch metadata to label rows and pre-fill format defaults.
    try {
      const params = new URLSearchParams({ brandId })
      const res = await fetch(`/api/sources?${params}`)
      const docs: SourceMeta[] = res.ok ? await res.json() : []
      const byId: Record<string, SourceMeta> = {}
      for (const id of ids) {
        const doc = docs.find((d) => d.id === id)
        if (doc) byId[id] = doc
      }
      setPickedMeta(byId)
      setDrafts((prev) => {
        const next = { ...prev }
        for (const id of ids) {
          const doc = byId[id]
          if (doc && next[id]?.formatType === '') {
            next[id] = { ...next[id], formatType: SOURCE_TYPE_TO_FORMAT[doc.type] ?? '' }
          }
        }
        return next
      })
    } catch (err) {
      console.error(err)
      toast.error('Failed to load source details.')
    }
  }

  /**
   * The picker calls onOpenChange(false) both when the user cancels AND right
   * after a successful pick. Only forward the close if we're still on step 1
   * — once we've advanced to step 2, the picker's close is internal.
   */
  function handlePickerOpenChange(next: boolean) {
    if (!next && stepRef.current === 'pick') onOpenChange(false)
  }

  function updateDraft(id: string, patch: Partial<{ formatType: TovFormatType | ''; subtype: string }>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  const allCategorised = pickedIds.every((id) => drafts[id]?.formatType !== '')
  const canSubmit = pickedIds.length > 0 && allCategorised && !submitting

  async function handleConfirm() {
    if (!canSubmit) return
    setSubmitting(true)
    const picks = pickedIds.map((id) => ({
      sourceDocId: id,
      formatType: drafts[id].formatType as TovFormatType,
      subtype: drafts[id].subtype.trim() || null,
    }))

    const result = await addSamplesFromSources(picks)
    if (result.ok) {
      toast.success(`${result.data?.created ?? picks.length} sample${(result.data?.created ?? picks.length) === 1 ? '' : 's'} added`)
      onAdded?.(result.data?.created ?? picks.length)
      onOpenChange(false)
    } else {
      toast.error(result.error)
      setSubmitting(false)
    }
  }

  // Step 1: render the SourceDocPicker as the modal.
  if (step === 'pick') {
    return (
      <SourceDocPicker
        open={open}
        onOpenChange={handlePickerOpenChange}
        brandId={brandId}
        selected={[]}
        excludeIds={excludeIds}
        onSelect={handlePicked}
      />
    )
  }

  // Step 2: per-source format/subtype categorisation.
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Categorise samples"
      description="Choose a format for each source so the tone-of-voice generator can group samples correctly."
      size="2xl"
    >
      <div className="flex flex-col gap-4 pt-2">
        <div className="max-h-[420px] overflow-y-auto rounded-md border border-border divide-y divide-border">
          {pickedIds.map((id) => {
            const doc = pickedMeta[id]
            const draft = drafts[id]
            if (!draft) return null
            return (
              <div key={id} className="grid grid-cols-[1fr_10rem_10rem] gap-3 items-center px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {doc?.title ?? <span className="text-muted-foreground">Loading…</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{doc?.type ?? ''}</p>
                </div>
                <Select
                  value={draft.formatType}
                  onValueChange={(v) => updateDraft(id, { formatType: v as TovFormatType })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOV_FORMAT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={draft.subtype}
                  onChange={(e) => updateDraft(id, { subtype: e.target.value })}
                  placeholder="Subtype (optional)"
                />
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            {pickedIds.length} source{pickedIds.length === 1 ? '' : 's'} selected
            {!allCategorised && ' · choose a format for each'}
          </p>
          <div className="flex gap-2">
            <ActionButton variant="ghost" onClick={() => setStep('pick')} disabled={submitting}>
              Back
            </ActionButton>
            <ActionButton onClick={handleConfirm} disabled={!canSubmit} loading={submitting}>
              {submitting ? 'Adding…' : 'Add samples'}
            </ActionButton>
          </div>
        </div>
      </div>
    </Modal>
  )
}
