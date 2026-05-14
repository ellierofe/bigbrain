'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/components/modal'
import { ActionButton } from '@/components/action-button'
import { InlineWarningBanner } from '@/components/inline-warning-banner'
import { LensPickerCard } from '@/components/lens-picker-card'
import { LensInputForm } from '@/components/lens-input-form'
import { InlineHint } from '@/components/inline-hint'
import { LENS_META, LENS_ORDER, isLensAvailable, allSourcesNonLensable } from '@/lib/lens-meta'
import { dispatchLensRunAction } from '@/app/actions/sources'
import type { LensId, SourceType } from '@/lib/types/lens'

interface LensPickerModalSource {
  id: string
  title: string
  sourceType: SourceType
}

interface LensPickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sources: LensPickerModalSource[]
}

export function LensPickerModal({ open, onOpenChange, sources }: LensPickerModalProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<LensId | null>(null)
  const [decisionText, setDecisionText] = useState<string>('')
  const [dispatching, setDispatching] = useState(false)

  const allDatasets = useMemo(() => allSourcesNonLensable(sources), [sources])
  const mixed = useMemo(
    () => sources.some((s) => s.sourceType === 'dataset') && !allDatasets,
    [sources, allDatasets],
  )

  const setSummary = useMemo(() => {
    if (sources.length === 0) return ''
    if (sources.length === 1) return `Across 1 source: ${sources[0].title}`
    const titles = sources.slice(0, 3).map((s) => s.title).join(' · ')
    const extra = sources.length > 3 ? ` and ${sources.length - 3} more` : ''
    return `Across ${sources.length} sources: ${titles}${extra}`
  }, [sources])

  const selectedMeta = selected ? LENS_META[selected] : null
  const needsInput = selectedMeta?.inputForm === 'decision-text'
  const ready = selected !== null && (!needsInput || decisionText.trim().length > 0) && !dispatching

  const handleRun = async () => {
    if (!selected) return
    setDispatching(true)
    const result = await dispatchLensRunAction({
      sourceIds: sources.map((s) => s.id),
      lens: selected,
      lensInput: needsInput ? decisionText.trim() : undefined,
    })
    setDispatching(false)

    if (!result.ok) {
      if (result.reason === 'not-applicable') {
        toast.error(`Lens not applicable to selected sources: ${result.error}`)
      } else {
        toast.error(result.error)
      }
      return
    }

    toast.success(
      `${LENS_META[selected].name} queued — taking you to the run`,
    )
    onOpenChange(false)
    router.push(`/inputs/results?run=${result.runId}`)
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!dispatching) onOpenChange(o)
      }}
      title="Run a lens"
      size="lg"
    >
      <div className="flex flex-col gap-4">
        <InlineHint align="left">{setSummary}</InlineHint>

        {allDatasets ? (
          <InlineWarningBanner
            title="Datasets bypass lens processing"
            subtitle="Open the dataset in the graph to query it directly."
            tone="info"
          />
        ) : mixed ? (
          <InlineWarningBanner
            title="One or more datasets will be skipped"
            subtitle="Datasets bypass lens processing. The lens runs on the remaining sources."
            tone="warning"
          />
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          {LENS_ORDER.map((lensId) => {
            const meta = LENS_META[lensId]
            const avail = isLensAvailable(lensId, sources)
            const disabled = !avail.available || allDatasets
            const reason = !avail.available
              ? avail.reason
              : allDatasets
                ? 'Datasets bypass lens processing.'
                : undefined
            return (
              <LensPickerCard
                key={lensId}
                lens={lensId}
                name={meta.name}
                description={meta.description}
                caveat={meta.caveat}
                selected={selected === lensId}
                disabled={disabled}
                disabledReason={reason}
                onSelect={(l) => setSelected(l)}
              />
            )
          })}
        </div>

        {selected && <LensInputForm lens={selected} value={decisionText} onChange={setDecisionText} />}

        <div className="flex justify-end gap-2 mt-2">
          <ActionButton variant="outline" onClick={() => onOpenChange(false)} disabled={dispatching}>
            Cancel
          </ActionButton>
          <ActionButton
            onClick={handleRun}
            disabled={!ready}
            loading={dispatching}
          >
            {dispatching ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                Starting…
              </>
            ) : (
              'Run lens →'
            )}
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
