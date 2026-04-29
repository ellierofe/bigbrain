'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/components/modal'
import { Button } from '@/components/ui/button'
import { createNewOffer } from '@/app/actions/offers'
import { OFFER_TYPE_LABELS } from '@/lib/types/offers'
import type { VocMapping as VocMappingType } from '@/lib/types/knowledge-assets'
import { TypeBadge } from '@/components/type-badge'
import { VOC_MAPPING_KIND_HUES, type VocMappingKind } from '@/lib/voc-mapping-hues'
import { SelectField } from '@/components/select-field'
import { CheckboxField } from '@/components/checkbox-field'

interface AudienceSegmentOption {
  id: string
  segmentName: string
  problems: unknown[]
  desires: unknown[]
  objections: unknown[]
  sharedBeliefs: unknown[]
}

interface CreateOfferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  brandId: string
  segments: AudienceSegmentOption[]
}

type Phase = 'form' | 'voc' | 'generate' | 'generating' | 'followup' | 'error'

export function CreateOfferModal({
  open,
  onOpenChange,
  brandId,
  segments,
}: CreateOfferModalProps) {
  const router = useRouter()

  // Phase state
  const [phase, setPhase] = useState<Phase>('form')

  // Phase 1: Quick form
  const [name, setName] = useState('')
  const [offerType, setOfferType] = useState('productised_service')
  const [audienceId, setAudienceId] = useState('')

  // Phase 2: VOC mapping
  const [vocMapping, setVocMapping] = useState<VocMappingType>({
    audienceSegmentId: '',
    problems: [],
    desires: [],
    objections: [],
    beliefs: [],
  })

  // Phase 3: Generate
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([])
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)

  const selectedSegment = segments.find(s => s.id === audienceId)

  function resetForm() {
    setPhase('form')
    setName('')
    setOfferType('productised_service')
    setAudienceId('')
    setVocMapping({ audienceSegmentId: '', problems: [], desires: [], objections: [], beliefs: [] })
    setFollowUpQuestions([])
    setFollowUpAnswers({})
    setError(null)
  }

  function handleClose(open: boolean) {
    if (!open && phase !== 'generating') {
      resetForm()
    }
    onOpenChange(open)
  }

  function canProceedForm(): boolean {
    return name.trim().length > 0 && audienceId.length > 0
  }

  function handleFormNext() {
    setVocMapping(prev => ({ ...prev, audienceSegmentId: audienceId }))
    setPhase('voc')
  }

  function toggleVoc(type: 'problems' | 'desires' | 'objections' | 'beliefs', index: number) {
    setVocMapping(prev => {
      const current = prev[type] ?? []
      return {
        ...prev,
        [type]: current.includes(index)
          ? current.filter(i => i !== index)
          : [...current, index],
      }
    })
  }

  async function handleEvaluateAndGenerate() {
    setPhase('generating')
    setError(null)

    try {
      // Create the offer row first (draft status)
      const createResult = await createNewOffer({
        name: name.trim(),
        offerType,
        status: 'draft',
        targetAudienceIds: [audienceId],
        vocMapping,
      })

      if (!createResult.ok) {
        throw new Error(createResult.error)
      }

      const offerId = createResult.data.id

      // Build the evaluation/generation payload
      const payload = {
        name: name.trim(),
        offerType,
        audienceSegmentId: audienceId,
        vocMapping: {
          problems: vocMapping.problems,
          desires: vocMapping.desires,
          objections: vocMapping.objections,
          beliefs: vocMapping.beliefs,
        },
        offerId,
        followUpAnswers: followUpQuestions.length > 0
          ? followUpQuestions.map((q, i) => ({ question: q, answer: followUpAnswers[i] ?? '' })).filter(qa => qa.answer.trim())
          : undefined,
      }

      // If we already have follow-up answers, skip evaluation
      if (followUpQuestions.length > 0) {
        return await runGeneration(payload, offerId)
      }

      // Evaluate first
      const evalRes = await fetch('/api/generate/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, action: 'evaluate' }),
      })

      if (!evalRes.ok) {
        throw new Error('Evaluation failed')
      }

      const evalResult = await evalRes.json()

      if (evalResult.ready) {
        return await runGeneration(payload, offerId)
      }

      // Need follow-up questions
      setFollowUpQuestions(evalResult.questions ?? [])
      setPhase('followup')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('error')
    }
  }

  async function runGeneration(payload: Record<string, unknown>, offerId: string) {
    try {
      const genRes = await fetch('/api/generate/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, action: 'generate' }),
      })

      if (!genRes.ok) {
        const err = await genRes.json()
        throw new Error(err.error ?? 'Generation failed')
      }

      toast.success('Offer generated')
      handleClose(false)
      // Hard navigate — router.refresh() doesn't reliably pick up DB changes
      // made directly inside the API route.
      window.location.href = `/dna/offers/${offerId}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      setPhase('error')
    }
  }

  async function handleFollowUpSubmit() {
    await handleEvaluateAndGenerate()
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  function renderVocGroup(
    title: string,
    vocType: 'problems' | 'desires' | 'objections' | 'beliefs',
    statements: unknown[],
    textKey: 'text' | 'objection' = 'text'
  ) {
    if (statements.length === 0) return null
    const selected = vocMapping[vocType] ?? []

    return (
      <div className="flex flex-col gap-1.5">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
          <span className="ml-1.5 text-[10px] font-normal">
            ({selected.length}/{statements.length})
          </span>
        </h4>
        <div className="flex flex-col gap-0.5">
          {statements.map((stmt, idx) => {
            const item = stmt as Record<string, string>
            const text = item[textKey] ?? ''
            const isSelected = selected.includes(idx)

            return (
              <CheckboxField
                key={idx}
                checked={isSelected}
                onCheckedChange={() => toggleVoc(vocType, idx)}
                className={isSelected ? 'bg-primary/5' : ''}
                label={
                  <span className="flex items-start gap-2">
                    <span className="flex-1">{text}</span>
                    {item.category && (
                      item.category in VOC_MAPPING_KIND_HUES ? (
                        <TypeBadge hue={VOC_MAPPING_KIND_HUES[item.category as VocMappingKind]} label={item.category} />
                      ) : (
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {item.category}
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

  // -------------------------------------------------------------------------
  // Phase 1: Quick form
  // -------------------------------------------------------------------------

  if (phase === 'form') {
    return (
      <Modal open={open} onOpenChange={handleClose} title="New Offer" size="lg">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">Step 1 of 3</p>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Offer name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Positioning Intensive"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <SelectField
            label="Offer type"
            value={offerType}
            options={Object.entries(OFFER_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            onSave={(v) => {
              setOfferType(v)
              return Promise.resolve({ ok: true })
            }}
          />

          {segments.length === 0 ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Primary audience *</label>
              <div className="rounded-md border border-input bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
                Create an audience segment first —{' '}
                <Link href="/dna/audience-segments" className="underline underline-offset-2 hover:text-foreground">
                  go to Audience Segments
                </Link>
              </div>
            </div>
          ) : (
            <SelectField
              label="Primary audience"
              value={audienceId}
              placeholder="Select audience segment…"
              options={segments.map(s => ({ value: s.id, label: s.segmentName }))}
              onSave={(v) => {
                setAudienceId(v)
                return Promise.resolve({ ok: true })
              }}
            />
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => handleClose(false)}>Cancel</Button>
          <Button size="sm" disabled={!canProceedForm()} onClick={handleFormNext}>Next →</Button>
        </div>
      </Modal>
    )
  }

  // -------------------------------------------------------------------------
  // Phase 2: VOC mapping
  // -------------------------------------------------------------------------

  if (phase === 'voc') {
    const seg = selectedSegment
    const hasSelection = vocMapping.problems.length > 0 || vocMapping.desires.length > 0

    return (
      <Modal open={open} onOpenChange={handleClose} title="VOC Mapping" size="lg">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">Step 2 of 3</p>
          <p className="text-sm">
            Which of <strong>{seg?.segmentName}</strong>&apos;s statements does this offer address?
          </p>
          {!hasSelection && (
            <p className="text-xs text-warning">
              Select at least 1 problem and 1 desire for the best results.
            </p>
          )}

          <div className="max-h-[400px] overflow-y-auto flex flex-col gap-4 pr-1">
            {seg && renderVocGroup('Problems', 'problems', seg.problems as unknown[])}
            {seg && renderVocGroup('Desires', 'desires', seg.desires as unknown[])}
            {seg && renderVocGroup('Objections', 'objections', seg.objections as unknown[], 'objection')}
            {seg && renderVocGroup('Beliefs', 'beliefs', seg.sharedBeliefs as unknown[])}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setPhase('form')}>← Back</Button>
          <Button size="sm" onClick={() => setPhase('generate')}>Next →</Button>
        </div>
      </Modal>
    )
  }

  // -------------------------------------------------------------------------
  // Phase 3: Generate (confirmation)
  // -------------------------------------------------------------------------

  if (phase === 'generate') {
    return (
      <Modal open={open} onOpenChange={handleClose} title="Generate Offer" size="lg">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">Step 3 of 3</p>
          <div className="rounded-md border border-border bg-muted/30 p-4 text-sm flex flex-col gap-2">
            <div><strong>Name:</strong> {name}</div>
            <div><strong>Type:</strong> {OFFER_TYPE_LABELS[offerType] ?? offerType}</div>
            <div><strong>Audience:</strong> {selectedSegment?.segmentName}</div>
            <div><strong>VOC mapped:</strong> {vocMapping.problems.length} problems, {vocMapping.desires.length} desires, {vocMapping.objections.length} objections, {vocMapping.beliefs.length} beliefs</div>
          </div>
          <p className="text-sm text-muted-foreground">
            The AI will review your inputs and may ask a follow-up question before generating the full offer profile.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setPhase('voc')}>← Back</Button>
          <Button size="sm" onClick={handleEvaluateAndGenerate}>Generate offer</Button>
        </div>
      </Modal>
    )
  }

  // -------------------------------------------------------------------------
  // Generating state
  // -------------------------------------------------------------------------

  if (phase === 'generating') {
    return (
      <Modal open={open} onOpenChange={() => {}} title="Generating…" size="lg">
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Generating your offer — this takes about 30 seconds</p>
          <p className="text-xs text-muted-foreground">Don&apos;t close this tab</p>
        </div>
      </Modal>
    )
  }

  // -------------------------------------------------------------------------
  // Follow-up questions
  // -------------------------------------------------------------------------

  if (phase === 'followup') {
    return (
      <Modal open={open} onOpenChange={handleClose} title="A few more details" size="lg">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            The AI needs a bit more context to generate a strong offer profile.
          </p>
          {followUpQuestions.map((q, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{q}</label>
              <textarea
                value={followUpAnswers[i] ?? ''}
                onChange={e => setFollowUpAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setPhase('generate')}>← Back</Button>
          <Button size="sm" onClick={handleFollowUpSubmit}>Continue</Button>
        </div>
      </Modal>
    )
  }

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------

  if (phase === 'error') {
    return (
      <Modal open={open} onOpenChange={handleClose} title="Generation failed" size="lg">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-destructive">{error}</p>
          <p className="text-sm text-muted-foreground">
            You can try again or close this modal. Any draft offer that was created will be in the list.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => handleClose(false)}>Close</Button>
          <Button size="sm" onClick={() => setPhase('generate')}>Try again</Button>
        </div>
      </Modal>
    )
  }

  return null
}
