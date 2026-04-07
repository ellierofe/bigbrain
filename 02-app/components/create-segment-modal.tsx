'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Modal } from '@/components/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createSegment } from '@/app/actions/audience-segments'
import type { CreateSegmentInput, SegmentDemographics } from '@/lib/types/audience-segments'

interface CreateSegmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Step = 1 | 2 | 3

const DEMOGRAPHICS_FIELDS: { key: keyof SegmentDemographics; label: string }[] = [
  { key: 'sex', label: 'Sex' },
  { key: 'ethnicity', label: 'Ethnicity' },
  { key: 'orientation', label: 'Sexual orientation' },
  { key: 'ageRange', label: 'Age range' },
  { key: 'location', label: 'Location' },
  { key: 'income', label: 'Personal income' },
  { key: 'householdIncome', label: 'Household income' },
  { key: 'familySituation', label: 'Family situation' },
  { key: 'education', label: 'Education' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'businessIndustry', label: 'Business industry' },
  { key: 'businessStage', label: 'Business stage' },
  { key: 'businessModel', label: 'Business model' },
]

export function CreateSegmentModal({ open, onOpenChange }: CreateSegmentModalProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [isPending, startTransition] = useTransition()

  // Step 1
  const [segmentName, setSegmentName] = useState('')
  const [roleContext, setRoleContext] = useState('')

  // Step 2
  const [biggestProblem, setBiggestProblem] = useState('')
  const [biggestDesire, setBiggestDesire] = useState('')

  // Step 3
  const [demographics, setDemographics] = useState<Partial<SegmentDemographics>>({})

  function reset() {
    setStep(1)
    setSegmentName('')
    setRoleContext('')
    setBiggestProblem('')
    setBiggestDesire('')
    setDemographics({})
  }

  function handleClose() {
    reset()
    onOpenChange(false)
  }

  function handleDemographicChange(key: keyof SegmentDemographics, value: string) {
    setDemographics(prev => ({ ...prev, [key]: value || undefined }))
  }

  function handleGenerateClick() {
    toast.info('LLM integration coming soon — check back after INF-06 is complete.')
  }

  function handleSaveAsDraft() {
    if (!roleContext.trim()) {
      toast.error('Role is required.')
      return
    }
    if (!biggestProblem.trim() || !biggestDesire.trim()) {
      toast.error('Core problem and desire are required.')
      return
    }

    const input: CreateSegmentInput = {
      segmentName: segmentName.trim() || undefined,
      roleContext: roleContext.trim(),
      biggestProblem: biggestProblem.trim(),
      biggestDesire: biggestDesire.trim(),
      demographics: Object.keys(demographics).length > 0
        ? (demographics as SegmentDemographics)
        : undefined,
    }

    startTransition(async () => {
      const result = await createSegment(input)
      if (result.ok) {
        handleClose()
        router.push(`/dna/audience-segments/${result.data.id}`)
      } else {
        toast.error(result.error)
      }
    })
  }

  const stepTitle = step === 1 ? 'New segment — Step 1 of 3'
    : step === 2 ? 'New segment — Step 2 of 3'
    : 'New segment — Step 3 of 3'

  return (
    <Modal open={open} onOpenChange={handleClose} title={stepTitle} size="lg">
      {step === 1 && (
        <div className="flex flex-col gap-4">
          {/* Path selection */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border-2 border-primary p-3">
              <p className="text-sm font-medium">Answer questions</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Build your segment step by step</p>
            </div>
            <div className="relative rounded-lg border border-border p-3 opacity-60 cursor-not-allowed">
              <p className="text-sm font-medium">Generate from document</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Upload or paste a source document</p>
              <span className="absolute right-2 top-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Requires sources setup
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Segment name <span className="font-normal text-muted-foreground">(optional)</span></label>
            <Input
              value={segmentName}
              onChange={e => setSegmentName(e.target.value)}
              placeholder="e.g. Scaling Founder — leave blank to auto-generate"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Who are they for your business? <span className="text-destructive">*</span></label>
            <Textarea
              value={roleContext}
              onChange={e => setRoleContext(e.target.value)}
              placeholder="e.g. A founder who needs to define their positioning before their next funding round"
              rows={3}
              data-testid="modal-role"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              onClick={() => setStep(2)}
              disabled={!roleContext.trim()}
            >
              Next →
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Core problem <span className="text-destructive">*</span></label>
            <Textarea
              value={biggestProblem}
              onChange={e => setBiggestProblem(e.target.value)}
              placeholder="In their own words, what's their biggest struggle related to what you do?"
              rows={3}
              data-testid="modal-problem"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Core desire <span className="text-destructive">*</span></label>
            <Textarea
              value={biggestDesire}
              onChange={e => setBiggestDesire(e.target.value)}
              placeholder="What do they most want to achieve or feel?"
              rows={3}
              data-testid="modal-desire"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            These two inputs shape the entire generated profile. Be specific.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!biggestProblem.trim() || !biggestDesire.trim()}
            >
              Next →
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Only add what's genuinely signal for this audience — not all fields, only the ones that matter.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {DEMOGRAPHICS_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">{label}</label>
                <Input
                  value={demographics[key] ?? ''}
                  onChange={e => handleDemographicChange(key, e.target.value)}
                  placeholder={`Enter ${label.toLowerCase()}`}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-between gap-2 pt-2">
            <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
            <div className="flex gap-2">
              <button
                onClick={handleSaveAsDraft}
                disabled={isPending}
                className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
              >
                {isPending ? 'Saving…' : 'Save as draft'}
              </button>
              <Button onClick={handleGenerateClick}>
                Generate segment
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
