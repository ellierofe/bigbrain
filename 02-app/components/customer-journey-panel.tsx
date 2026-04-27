'use client'

import { useState } from 'react'
import { Brain, Heart, Activity, ArrowRight, RefreshCw, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InlineField } from '@/components/inline-field'
import { SectionCard } from '@/components/section-card'
import { EmptyState } from '@/components/empty-state'
import { Modal } from '@/components/modal'
import { toast } from 'sonner'
import type { CustomerJourneyStage } from '@/lib/types/offers'

const STAGE_LABELS: Record<string, string> = {
  awareness: 'Awareness',
  consideration: 'Consideration',
  decision: 'Decision',
  service: 'Service',
  advocacy: 'Advocacy',
}

const STAGE_NUMBERS: Record<string, number> = {
  awareness: 1,
  consideration: 2,
  decision: 3,
  service: 4,
  advocacy: 5,
}

interface CustomerJourneyPanelProps {
  offerId: string
  journey: CustomerJourneyStage[] | null
  onSaveField: (journey: CustomerJourneyStage[]) => Promise<{ ok: boolean; error?: string }>
}

export function CustomerJourneyPanel({
  offerId,
  journey,
  onSaveField,
}: CustomerJourneyPanelProps) {
  const [generating, setGenerating] = useState(false)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)
  const [localJourney, setLocalJourney] = useState<CustomerJourneyStage[] | null>(journey)

  async function handleGenerate() {
    if (localJourney && localJourney.length > 0) {
      setConfirmRegenerate(true)
      return
    }
    await runGeneration()
  }

  async function runGeneration() {
    setConfirmRegenerate(false)
    setGenerating(true)

    try {
      const res = await fetch('/api/generate/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generateJourney', offerId }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Generation failed')
      }

      const data = await res.json()
      setLocalJourney(data.stages)
      toast.success('Customer journey generated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function handleStageFieldSave(
    stageIndex: number,
    field: keyof CustomerJourneyStage,
    value: string
  ) {
    if (!localJourney) return { ok: false, error: 'No journey' }

    const updated = localJourney.map((stage, i) =>
      i === stageIndex ? { ...stage, [field]: value } : stage
    )

    setLocalJourney(updated)
    return onSaveField(updated)
  }

  if (!localJourney || localJourney.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-end">
          <Button
            onClick={handleGenerate}
            disabled={generating}
            size="sm"
          >
            {generating ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Generate journey
              </>
            )}
          </Button>
        </div>
        <EmptyState
          heading="No customer journey yet"
          description="Generate one based on your audience and offer details."
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Regenerating…
            </>
          ) : (
            <>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Regenerate journey
            </>
          )}
        </Button>
      </div>

      {localJourney.map((stage, idx) => (
        <div key={stage.stage} className="flex flex-col gap-0">
          {idx > 0 && (
            <div className="flex justify-center py-1">
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 rotate-90" />
            </div>
          )}
          <SectionCard
            title={`${STAGE_NUMBERS[stage.stage]}. ${STAGE_LABELS[stage.stage]}`}
          >
            <div className="flex flex-col gap-3 mt-3">
              <InlineField
                variant="textarea"
                value={stage.thinking}
                onSave={(val) => handleStageFieldSave(idx, 'thinking', val)}
                label="Thinking"
                icon={Brain}
                rows={3}
                labelBg="bg-card"
              />
              <InlineField
                variant="textarea"
                value={stage.feeling}
                onSave={(val) => handleStageFieldSave(idx, 'feeling', val)}
                label="Feeling"
                icon={Heart}
                rows={2}
                labelBg="bg-card"
              />
              <InlineField
                variant="textarea"
                value={stage.doing}
                onSave={(val) => handleStageFieldSave(idx, 'doing', val)}
                label="Doing"
                icon={Activity}
                rows={3}
                labelBg="bg-card"
              />
              {stage.stage !== 'advocacy' && (
                <InlineField
                  variant="textarea"
                  value={stage.pushToNext ?? ''}
                  onSave={(val) => handleStageFieldSave(idx, 'pushToNext', val)}
                  label="Push to next stage"
                  icon={ArrowRight}
                  rows={2}
                  labelBg="bg-card"
                />
              )}
            </div>
          </SectionCard>
        </div>
      ))}

      <Modal
        open={confirmRegenerate}
        onOpenChange={setConfirmRegenerate}
        title="Regenerate customer journey?"
      >
        <p className="text-sm text-muted-foreground">
          This will replace the current journey. Any manual edits will be lost.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmRegenerate(false)}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={runGeneration}>
            Regenerate
          </Button>
        </div>
      </Modal>
    </div>
  )
}
