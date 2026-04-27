'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, MessageSquare, Lock, LockOpen } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/components/modal'
import { Button } from '@/components/ui/button'
import { SourceDocPicker } from '@/components/source-doc-picker'
import { TypeBadge } from '@/components/type-badge'
import { VOC_MAPPING_KIND_HUES, type VocMappingKind } from '@/lib/voc-mapping-hues'
import { SelectField } from '@/components/select-field'
import { CheckboxField } from '@/components/checkbox-field'
import type { KnowledgeAssetSummary, AssetKind, VocMapping as VocMappingType } from '@/lib/types/knowledge-assets'
import { createKnowledgeAsset } from '@/app/actions/knowledge-assets'

interface AudienceSegmentOption {
  id: string
  segmentName: string
  problems: unknown[]
  desires: unknown[]
  objections: unknown[]
  sharedBeliefs: unknown[]
}

interface CreateAssetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  brandId: string
  segments: AudienceSegmentOption[]
}

type Phase = 'path' | 'sources' | 'metadata' | 'voc' | 'generate' | 'generating' | 'followup' | 'error'

export function CreateAssetModal({
  open,
  onOpenChange,
  brandId,
  segments,
}: CreateAssetModalProps) {
  const router = useRouter()

  // Phase state
  const [phase, setPhase] = useState<Phase>('path')
  const [useSources, setUseSources] = useState(true)

  // Phase 2: Sources
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  // Phase 3: Metadata
  const [name, setName] = useState('')
  const [kind, setKind] = useState<AssetKind>('methodology')
  const [proprietary, setProprietary] = useState(true)
  const [audienceId, setAudienceId] = useState('')

  // Phase 4: VOC mapping
  const [vocMapping, setVocMapping] = useState<VocMappingType>({
    audienceSegmentId: '',
    problems: [],
    desires: [],
    objections: [],
    beliefs: [],
  })

  // Phase 5: Generate
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([])
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)

  const selectedSegment = segments.find(s => s.id === audienceId)

  function resetForm() {
    setPhase('path')
    setUseSources(true)
    setSelectedSourceIds([])
    setName('')
    setKind('methodology')
    setProprietary(true)
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

  function canProceedMetadata(): boolean {
    return name.trim().length > 0 && audienceId.length > 0
  }

  function handleMetadataNext() {
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
      // Create the asset row first
      const createResult = await createKnowledgeAsset({
        name,
        kind,
        status: 'draft',
        proprietary,
        targetAudienceIds: [audienceId],
        sourceDocumentIds: selectedSourceIds.length > 0 ? selectedSourceIds : undefined,
        vocMapping,
      })

      if (!createResult.ok) {
        setError(createResult.error)
        setPhase('error')
        return
      }

      const assetId = createResult.data.id

      // Evaluate
      const evalRes = await fetch('/api/generate/knowledge-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate',
          name,
          kind,
          proprietary,
          audienceSegmentId: audienceId,
          vocMapping,
          sourceDocumentIds: selectedSourceIds,
        }),
      })

      if (!evalRes.ok) throw new Error('Evaluation failed')

      const evalResult = await evalRes.json()

      if (!evalResult.ready && evalResult.questions?.length > 0) {
        setFollowUpQuestions(evalResult.questions)
        setPhase('followup')
        // Store the assetId for later
        ;(window as unknown as Record<string, string>).__pendingAssetId = assetId
        return
      }

      // Generate
      await runGeneration(assetId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('error')
    }
  }

  async function handleFollowUpSubmit() {
    setPhase('generating')
    const assetId = (window as unknown as Record<string, string>).__pendingAssetId

    try {
      const answers = followUpQuestions.map((q, i) => ({
        question: q,
        answer: followUpAnswers[i] ?? '',
      }))
      await runGeneration(assetId, answers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('error')
    }
  }

  async function runGeneration(
    assetId: string,
    followUps?: { question: string; answer: string }[]
  ) {
    const genRes = await fetch('/api/generate/knowledge-asset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generate',
        assetId,
        name,
        kind,
        proprietary,
        audienceSegmentId: audienceId,
        vocMapping,
        sourceDocumentIds: selectedSourceIds,
        followUpAnswers: followUps,
      }),
    })

    if (!genRes.ok) throw new Error('Generation failed')

    const genResult = await genRes.json()
    if (genResult.success) {
      toast.success(`${name} generated successfully`)
      handleClose(false)
      router.push(`/dna/knowledge-assets/${genResult.assetId}`)
    } else {
      throw new Error(genResult.error || 'Generation failed')
    }
  }

  async function handleSaveAsDraft() {
    const createResult = await createKnowledgeAsset({
      name,
      kind,
      status: 'draft',
      proprietary,
      targetAudienceIds: [audienceId],
      sourceDocumentIds: selectedSourceIds.length > 0 ? selectedSourceIds : undefined,
      vocMapping: vocMapping.audienceSegmentId ? vocMapping : undefined,
    })

    if (createResult.ok) {
      toast.success(`${name} saved as draft`)
      handleClose(false)
      router.push(`/dna/knowledge-assets/${createResult.data.id}`)
    } else {
      toast.error(createResult.error)
    }
  }

  const phaseIndex = { path: 1, sources: 2, metadata: 3, voc: 4, generate: 5, followup: 5, generating: 5, error: 5 }
  const totalSteps = useSources ? 5 : 4

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      title="New Knowledge Asset"
      description={phase !== 'path' ? `Step ${phaseIndex[phase]} of ${totalSteps}` : undefined}
      size="xl"
    >
      {/* Phase 1: Path selection */}
      {phase === 'path' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            How would you like to start?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setUseSources(true); setPhase('sources') }}
              className="flex flex-col items-center gap-2 rounded-lg border-2 border-primary/30 p-6 hover:border-primary transition-colors"
            >
              <FileText className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">Add source documents</span>
              <span className="text-xs text-muted-foreground text-center">
                PDFs, images, transcripts
              </span>
            </button>
            <button
              type="button"
              onClick={() => { setUseSources(false); setPhase('metadata') }}
              className="flex flex-col items-center gap-2 rounded-lg border-2 border-border p-6 hover:border-border/80 transition-colors"
            >
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">Just answer questions</span>
              <span className="text-xs text-muted-foreground text-center">
                AI will ask what it needs
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Phase 2: Source document selection */}
      {phase === 'sources' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Select source documents that describe this knowledge asset.
          </p>

          {selectedSourceIds.length > 0 && (
            <p className="text-xs font-medium text-foreground">
              {selectedSourceIds.length} document{selectedSourceIds.length > 1 ? 's' : ''} selected
            </p>
          )}

          <Button variant="outline" onClick={() => setPickerOpen(true)}>
            <FileText className="mr-2 h-4 w-4" />
            {selectedSourceIds.length > 0 ? 'Change selection' : 'Select documents'}
          </Button>

          <SourceDocPicker
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            brandId={brandId}
            selected={selectedSourceIds}
            onSelect={setSelectedSourceIds}
          />

          <div className="flex justify-between pt-2">
            <Button variant="outline" size="sm" onClick={() => setPhase('path')}>
              Back
            </Button>
            <Button
              size="sm"
              onClick={() => setPhase('metadata')}
              disabled={selectedSourceIds.length === 0}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Phase 3: Metadata */}
      {phase === 'metadata' && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Brand Positioning Framework"
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-[var(--field-active)]/50 focus:outline-none"
              autoFocus
            />
          </div>

          <SelectField
            label="Kind"
            value={kind}
            options={[
              { value: 'methodology', label: 'Methodology' },
              { value: 'process', label: 'Process' },
              { value: 'tool', label: 'Tool' },
            ]}
            onSave={(v) => {
              setKind(v as AssetKind)
              return Promise.resolve({ ok: true })
            }}
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setProprietary(!proprietary)}
              className="flex items-center gap-1.5 text-sm"
            >
              {proprietary ? (
                <Lock className="h-4 w-4 text-foreground" />
              ) : (
                <LockOpen className="h-4 w-4 text-muted-foreground" />
              )}
              {proprietary ? 'Proprietary IP' : 'Not proprietary'}
            </button>
          </div>

          {segments.length === 0 ? (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Primary audience *
              </label>
              <p className="mt-1 text-sm text-muted-foreground">
                No audience segments yet.{' '}
                <a href="/dna/audience-segments" className="underline">
                  Create one first
                </a>
                .
              </p>
            </div>
          ) : (
            <SelectField
              label="Primary audience"
              value={audienceId}
              placeholder="Select audience…"
              options={segments.map(s => ({ value: s.id, label: s.segmentName }))}
              onSave={(v) => {
                setAudienceId(v)
                return Promise.resolve({ ok: true })
              }}
            />
          )}

          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPhase(useSources ? 'sources' : 'path')}
            >
              Back
            </Button>
            <Button
              size="sm"
              onClick={handleMetadataNext}
              disabled={!canProceedMetadata()}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Phase 4: VOC mapping */}
      {phase === 'voc' && selectedSegment && (
        <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto">
          <p className="text-sm text-muted-foreground">
            Which of <strong>{selectedSegment.segmentName}</strong>&apos;s problems, desires,
            objections, and beliefs does this {kind} address?
          </p>

          {/* Problems */}
          {(selectedSegment.problems as { text: string; category?: string }[]).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Problems ({vocMapping.problems.length} selected)
              </h4>
              {(selectedSegment.problems as { text: string; category?: string }[]).map((p, i) => (
                <CheckboxField
                  key={i}
                  checked={vocMapping.problems.includes(i)}
                  onCheckedChange={() => toggleVoc('problems', i)}
                  className={vocMapping.problems.includes(i) ? 'bg-primary/5' : ''}
                  label={
                    <span className="flex items-start gap-2">
                      <span className="flex-1">{p.text}</span>
                      {p.category && p.category in VOC_MAPPING_KIND_HUES && (
                        <TypeBadge hue={VOC_MAPPING_KIND_HUES[p.category as VocMappingKind]} label={p.category} />
                      )}
                    </span>
                  }
                />
              ))}
            </div>
          )}

          {/* Desires */}
          {(selectedSegment.desires as { text: string; category?: string }[]).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Desires ({vocMapping.desires.length} selected)
              </h4>
              {(selectedSegment.desires as { text: string; category?: string }[]).map((d, i) => (
                <CheckboxField
                  key={i}
                  checked={vocMapping.desires.includes(i)}
                  onCheckedChange={() => toggleVoc('desires', i)}
                  className={vocMapping.desires.includes(i) ? 'bg-primary/5' : ''}
                  label={
                    <span className="flex items-start gap-2">
                      <span className="flex-1">{d.text}</span>
                      {d.category && d.category in VOC_MAPPING_KIND_HUES && (
                        <TypeBadge hue={VOC_MAPPING_KIND_HUES[d.category as VocMappingKind]} label={d.category} />
                      )}
                    </span>
                  }
                />
              ))}
            </div>
          )}

          {/* Objections */}
          {(selectedSegment.objections as { objection: string }[]).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Objections ({vocMapping.objections.length} selected)
              </h4>
              {(selectedSegment.objections as { objection: string }[]).map((o, i) => (
                <CheckboxField
                  key={i}
                  checked={vocMapping.objections.includes(i)}
                  onCheckedChange={() => toggleVoc('objections', i)}
                  className={vocMapping.objections.includes(i) ? 'bg-primary/5' : ''}
                  label={o.objection}
                />
              ))}
            </div>
          )}

          {/* Beliefs */}
          {(selectedSegment.sharedBeliefs as { text: string }[]).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Beliefs ({vocMapping.beliefs.length} selected)
              </h4>
              {(selectedSegment.sharedBeliefs as { text: string }[]).map((b, i) => (
                <CheckboxField
                  key={i}
                  checked={vocMapping.beliefs.includes(i)}
                  onCheckedChange={() => toggleVoc('beliefs', i)}
                  className={vocMapping.beliefs.includes(i) ? 'bg-primary/5' : ''}
                  label={b.text}
                />
              ))}
            </div>
          )}

          {/* Soft warning */}
          {(vocMapping.problems.length === 0 || vocMapping.desires.length === 0) && (
            <p className="text-xs text-warning">
              Selecting at least one problem and one desire will improve generation quality.
            </p>
          )}

          <div className="flex justify-between pt-2 sticky bottom-0 bg-card pb-1">
            <Button variant="outline" size="sm" onClick={() => setPhase('metadata')}>
              Back
            </Button>
            <Button size="sm" onClick={() => setPhase('generate')}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Phase 5: Generate */}
      {phase === 'generate' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border p-4 text-sm">
            <p className="font-medium mb-2">Ready to generate:</p>
            <ul className="text-muted-foreground space-y-1">
              <li><strong>{name}</strong> ({kind})</li>
              <li>Audience: {selectedSegment?.segmentName}</li>
              <li>VOC: {vocMapping.problems.length} problems, {vocMapping.desires.length} desires</li>
              {selectedSourceIds.length > 0 && (
                <li>{selectedSourceIds.length} source document{selectedSourceIds.length > 1 ? 's' : ''}</li>
              )}
            </ul>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="outline" size="sm" onClick={() => setPhase('voc')}>
              Back
            </Button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveAsDraft}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Save as draft
              </button>
              <Button size="sm" onClick={handleEvaluateAndGenerate}>
                Generate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up questions */}
      {phase === 'followup' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            A few more details would help generate a better profile:
          </p>
          {followUpQuestions.map((q, i) => (
            <div key={i}>
              <label className="text-sm font-medium">{q}</label>
              <textarea
                value={followUpAnswers[i] ?? ''}
                onChange={e => setFollowUpAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-[var(--field-active)]/50 focus:outline-none resize-none"
              />
            </div>
          ))}
          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={handleFollowUpSubmit}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Skip & generate
            </button>
            <Button size="sm" onClick={handleFollowUpSubmit}>
              Generate
            </Button>
          </div>
        </div>
      )}

      {/* Generating state */}
      {phase === 'generating' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm font-medium">
            Generating your {kind}...
          </p>
          <p className="text-xs text-muted-foreground">This may take a minute. Don't close this tab.</p>
        </div>
      )}

      {/* Error state */}
      {phase === 'error' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-destructive">{error}</p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
              Close
            </Button>
            <Button size="sm" onClick={() => { setError(null); setPhase('generate') }}>
              Try again
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
