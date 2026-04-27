'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, FileText, MessageSquare } from 'lucide-react'
import { Modal } from '@/components/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SourceDocPicker } from '@/components/source-doc-picker'
import { SelectField } from '@/components/select-field'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  CHANNEL_LABELS,
  channelsForCategory,
  type Category,
  type Channel,
} from '@/lib/types/channels'

interface CreatePlatformModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  brandId?: string
}

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

type Step = 'path' | 'sources' | 'identity' | 'strategy' | 'followup' | 'generating' | 'error'

export function CreatePlatformModal({ open, onOpenChange, brandId }: CreatePlatformModalProps) {
  const router = useRouter()
  const effectiveBrandId = brandId || BRAND_ID

  // Path selection
  const [useSources, setUseSources] = useState(false)

  // Source docs
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  // Identity (category-first)
  const [category, setCategory] = useState<Category | ''>('')
  const [channel, setChannel] = useState<Channel | ''>('')
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')

  // Strategy context
  const [primaryObjective, setPrimaryObjective] = useState('')
  const [audience, setAudience] = useState('')

  // Follow-up state
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([])
  const [followUpAnswers, setFollowUpAnswers] = useState<string[]>([])

  // Flow state
  const [step, setStep] = useState<Step>('path')
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  function reset() {
    setStep('path')
    setUseSources(false)
    setSelectedSourceIds([])
    setCategory('')
    setChannel('')
    setName('')
    setHandle('')
    setPrimaryObjective('')
    setAudience('')
    setFollowUpQuestions([])
    setFollowUpAnswers([])
    setIsEvaluating(false)
    setErrorMessage('')
  }

  function handleClose() {
    if (step === 'generating') return
    reset()
    onOpenChange(false)
  }

  function selectCategory(next: Category) {
    if (next === category) return
    setCategory(next)
    // Reset channel + name (handle is preserved — often re-used as URL/profile reference)
    setChannel('')
    setName('')
  }

  function selectChannel(next: Channel) {
    setChannel(next)
    // Auto-fill name from channel label (user can still edit)
    setName(CHANNEL_LABELS[next])
  }

  async function handleEvaluateAndGenerate() {
    setIsEvaluating(true)

    try {
      const res = await fetch('/api/generate/platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate',
          name: name.trim(),
          category,
          channel,
          primaryObjective: primaryObjective.trim() || undefined,
          audience: audience.trim() || undefined,
          sourceDocumentIds: selectedSourceIds.length > 0 ? selectedSourceIds : undefined,
        }),
      })

      if (!res.ok) throw new Error('Evaluation request failed')

      const result = await res.json()
      setIsEvaluating(false)

      if (result.questions?.length && !result.ready) {
        setFollowUpQuestions(result.questions)
        setFollowUpAnswers(new Array(result.questions.length).fill(''))
        setStep('followup')
      } else {
        runGeneration()
      }
    } catch (err) {
      console.error('Evaluation failed:', err)
      setIsEvaluating(false)
      runGeneration()
    }
  }

  async function runGeneration(extraFollowUps?: { question: string; answer: string }[]) {
    setStep('generating')

    try {
      const followUps = extraFollowUps || (
        followUpQuestions.length > 0
          ? followUpQuestions.map((q, i) => ({
              question: q,
              answer: followUpAnswers[i] || '',
            })).filter(a => a.answer.trim())
          : undefined
      )

      const res = await fetch('/api/generate/platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          name: name.trim(),
          category,
          channel,
          handle: handle.trim() || undefined,
          primaryObjective: primaryObjective.trim() || undefined,
          audience: audience.trim() || undefined,
          sourceDocumentIds: selectedSourceIds.length > 0 ? selectedSourceIds : undefined,
          followUpAnswers: followUps,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Generation failed')
      }

      const { platformId } = await res.json()

      toast.success('Channel strategy created — review and edit as needed')
      reset()
      onOpenChange(false)
      router.push(`/dna/platforms/${platformId}`)
    } catch (err) {
      console.error('Generation failed:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Generation failed. Please try again.')
      setStep('error')
    }
  }

  function handleFollowUpSubmit() {
    const answers = followUpQuestions.map((q, i) => ({
      question: q,
      answer: followUpAnswers[i] || '',
    })).filter(a => a.answer.trim())

    runGeneration(answers)
  }

  const stepTitles: Record<Step, string> = {
    path: 'New channel',
    sources: 'New channel — Source documents',
    identity: 'New channel — Identity',
    strategy: 'New channel — Strategy context',
    followup: 'New channel — A few more details',
    generating: 'Generating channel strategy...',
    error: 'Generation failed',
  }

  const channelOptions = category
    ? channelsForCategory(category).map((c) => ({
        value: c,
        label: CHANNEL_LABELS[c],
      }))
    : []

  return (
    <Modal open={open} onOpenChange={handleClose} title={stepTitles[step]} size="2xl">
      {/* Path selection */}
      {step === 'path' && (
        <div className="flex flex-col gap-5 pt-2">
          <p className="text-[13px] text-muted-foreground">
            How would you like to start?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setUseSources(true); setStep('sources') }}
              className="flex flex-col items-center gap-2 rounded-lg border-2 border-primary/30 p-6 hover:border-primary transition-colors"
            >
              <FileText className="h-8 w-8 text-primary" />
              <span className="text-[13px] font-medium">Add source documents</span>
              <span className="text-xs text-muted-foreground text-center">
                Existing strategy docs, content audits, analytics
              </span>
            </button>
            <button
              type="button"
              onClick={() => { setUseSources(false); setStep('identity') }}
              className="flex flex-col items-center gap-2 rounded-lg border-2 border-border p-6 hover:border-border/80 transition-colors"
            >
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
              <span className="text-[13px] font-medium">Just answer questions</span>
              <span className="text-xs text-muted-foreground text-center">
                AI will ask what it needs
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Source document selection */}
      {step === 'sources' && (
        <div className="flex flex-col gap-5 pt-2">
          <p className="text-[13px] text-muted-foreground">
            Select documents that describe your channel strategy — content audits, analytics exports, existing strategy docs.
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
            brandId={effectiveBrandId}
            selected={selectedSourceIds}
            onSelect={setSelectedSourceIds}
          />

          <div className="flex justify-between pt-1">
            <Button variant="ghost" onClick={() => setStep('path')}>
              Back
            </Button>
            <Button
              onClick={() => setStep('identity')}
              disabled={selectedSourceIds.length === 0}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Identity — category cards on top, channel/name/handle revealed once a category is picked */}
      {step === 'identity' && (
        <div className="flex flex-col gap-5 pt-2">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium">
              What kind of channel is this? <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => {
                const selected = category === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => selectCategory(cat)}
                    className={`flex flex-col items-start gap-1.5 rounded-lg border-2 p-3 text-left transition-colors ${
                      selected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-border/80 hover:bg-muted/30'
                    }`}
                  >
                    <span className="text-[12px] font-semibold leading-tight">
                      {CATEGORY_LABELS[cat]}
                    </span>
                    <span className="text-[10px] leading-snug text-muted-foreground">
                      {CATEGORY_DESCRIPTIONS[cat]}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {category && (
            <>
              <div className="border-t border-border/40" />

              <SelectField
                label="Channel"
                value={channel}
                options={channelOptions}
                placeholder="Select channel…"
                onSave={(v) => {
                  selectChannel(v as Channel)
                  return Promise.resolve({ ok: true })
                }}
              />

              {channel && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium">
                      Channel name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. LinkedIn (NicelyPut)"
                      className="text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium">
                      Handle / URL <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <Input
                      value={handle}
                      onChange={e => setHandle(e.target.value)}
                      placeholder="Profile URL, feed URL, or publication URL"
                      className="text-sm"
                    />
                  </div>
                </>
              )}
            </>
          )}

          <div className="flex justify-between gap-2 pt-1">
            <Button variant="ghost" onClick={() => setStep(useSources ? 'sources' : 'path')}>Back</Button>
            <Button
              onClick={() => setStep('strategy')}
              disabled={!category || !channel || !name.trim()}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Strategy context */}
      {step === 'strategy' && (
        <div className="flex flex-col gap-5 pt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium">
              What is this channel for? {!useSources && <span className="text-destructive">*</span>}
              {useSources && <span className="font-normal text-muted-foreground">(optional — source docs may cover this)</span>}
            </label>
            <Textarea
              value={primaryObjective}
              onChange={e => setPrimaryObjective(e.target.value)}
              placeholder="e.g. Thought leadership and direct client acquisition through long-form posts and industry commentary"
              className="min-h-[80px] resize-none text-sm"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium">
              Who&apos;s the audience here? <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              value={audience}
              onChange={e => setAudience(e.target.value)}
              placeholder="Who are you reaching on this channel specifically? May differ from your overall audience segments."
              className="min-h-[80px] resize-none text-sm"
            />
          </div>

          <div className="flex justify-between gap-2 pt-1">
            <Button variant="ghost" onClick={() => setStep('identity')} disabled={isEvaluating}>Back</Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={handleEvaluateAndGenerate}
                disabled={isEvaluating}
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Skip & generate'
                )}
              </Button>
              <Button
                onClick={handleEvaluateAndGenerate}
                disabled={isEvaluating || (!primaryObjective.trim() && !useSources)}
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Generate strategy'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up questions */}
      {step === 'followup' && (
        <div className="flex flex-col gap-5 pt-2">
          <p className="text-[13px] text-muted-foreground">
            A couple more details would help generate a better strategy.
          </p>

          {followUpQuestions.map((question, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium">{question}</label>
              <Textarea
                value={followUpAnswers[i]}
                onChange={e => {
                  const next = [...followUpAnswers]
                  next[i] = e.target.value
                  setFollowUpAnswers(next)
                }}
                className="min-h-[60px] resize-none text-sm"
                autoFocus={i === 0}
              />
            </div>
          ))}

          <div className="flex justify-between gap-2 pt-1">
            <Button variant="ghost" onClick={() => setStep('strategy')}>Back</Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => runGeneration()}>
                Skip & generate
              </Button>
              <Button
                onClick={handleFollowUpSubmit}
                disabled={followUpAnswers.every(a => !a.trim())}
              >
                Generate strategy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Generating state */}
      {step === 'generating' && (
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-[13px] font-medium">Generating your channel strategy...</p>
            <p className="mt-1 text-xs text-muted-foreground">
              This can take up to a minute. Don&apos;t close this tab.
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {step === 'error' && (
        <div className="flex flex-col gap-5 pt-2">
          <p className="text-[13px] text-destructive">{errorMessage}</p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button onClick={() => runGeneration()}>Try again</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
