'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/modal'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface CreateSegmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Step = 'role' | 'problem' | 'desire' | 'followup' | 'generating' | 'error'

export function CreateSegmentModal({ open, onOpenChange }: CreateSegmentModalProps) {
  const router = useRouter()

  // Inputs
  const [roleContext, setRoleContext] = useState('')
  const [biggestProblem, setBiggestProblem] = useState('')
  const [biggestDesire, setBiggestDesire] = useState('')

  // Follow-up state
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([])
  const [followUpAnswers, setFollowUpAnswers] = useState<string[]>([])

  // Flow state
  const [step, setStep] = useState<Step>('role')
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  function reset() {
    setStep('role')
    setRoleContext('')
    setBiggestProblem('')
    setBiggestDesire('')
    setFollowUpQuestions([])
    setFollowUpAnswers([])
    setIsEvaluating(false)
    setErrorMessage('')
  }

  function handleClose() {
    if (step === 'generating') return // don't allow close during generation
    reset()
    onOpenChange(false)
  }

  // Evaluate inputs — either proceed to generation or ask follow-up questions
  async function handleEvaluateAndGenerate() {
    setIsEvaluating(true)

    try {
      const res = await fetch('/api/generate/audience-segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate',
          roleContext: roleContext.trim(),
          biggestProblem: biggestProblem.trim() || undefined,
          biggestDesire: biggestDesire.trim() || undefined,
        }),
      })

      if (!res.ok) throw new Error('Evaluation request failed')

      const result = await res.json()
      setIsEvaluating(false)

      if (result.questions?.length && !result.ready) {
        // LLM wants follow-up questions
        setFollowUpQuestions(result.questions)
        setFollowUpAnswers(new Array(result.questions.length).fill(''))
        setStep('followup')
      } else {
        // Inputs are sufficient — proceed to generation
        runGeneration()
      }
    } catch (err) {
      console.error('Evaluation failed:', err)
      setIsEvaluating(false)
      // Fall through to generation — evaluation is a nice-to-have
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

      const res = await fetch('/api/generate/audience-segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          roleContext: roleContext.trim(),
          biggestProblem: biggestProblem.trim() || undefined,
          biggestDesire: biggestDesire.trim() || undefined,
          followUpAnswers: followUps,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Generation failed')
      }

      const { segmentId } = await res.json()

      toast.success('Segment created — review and edit as needed')
      reset()
      onOpenChange(false)
      router.push(`/dna/audience-segments/${segmentId}`)
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
    role: 'New segment — Who are they?',
    problem: 'New segment — Core problem',
    desire: 'New segment — Core desire',
    followup: 'New segment — A few more details',
    generating: 'Generating segment...',
    error: 'Generation failed',
  }

  return (
    <Modal open={open} onOpenChange={handleClose} title={stepTitles[step]} size="lg">
      {/* Step 1: Role context (required) */}
      {step === 'role' && (
        <div className="flex flex-col gap-4">
          {/* Path selection */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border-2 border-primary p-3">
              <p className="text-sm font-medium">Answer questions</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Describe your audience, AI generates the profile</p>
            </div>
            <div className="relative rounded-lg border border-border p-3 opacity-60 cursor-not-allowed">
              <p className="text-sm font-medium">Generate from document</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Upload or paste a source document</p>
              <span className="absolute right-2 top-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Coming soon
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              Who is this segment? <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={roleContext}
              onChange={e => setRoleContext(e.target.value)}
              placeholder="Their role, what they do, who they serve, how they relate to your work. e.g. A founder of a £1-5m B2B services company who needs to reposition before their next growth phase"
              rows={4}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              This is the only required input. The more specific you are, the better the output.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              onClick={() => setStep('problem')}
              disabled={!roleContext.trim()}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Biggest problem (optional) */}
      {step === 'problem' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              What&apos;s their single biggest problem — in relation to your work?
            </label>
            <Textarea
              value={biggestProblem}
              onChange={e => setBiggestProblem(e.target.value)}
              placeholder="In their own words, not clinical language. e.g. They've invested in brand strategy twice and neither time did it translate into anything they could actually use day-to-day"
              rows={4}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              This anchors the entire profile. Optional, but makes a big difference.
            </p>
          </div>

          <div className="flex justify-between gap-2 pt-2">
            <Button variant="outline" onClick={() => setStep('role')}>Back</Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setStep('desire')}
              >
                Skip
              </Button>
              <Button
                onClick={() => setStep('desire')}
                disabled={!biggestProblem.trim()}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Biggest desire (optional) */}
      {step === 'desire' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              What do they most want to achieve?
            </label>
            <Textarea
              value={biggestDesire}
              onChange={e => setBiggestDesire(e.target.value)}
              placeholder="The thing they'd describe to a trusted peer, not what they'd put on a form. e.g. A clear, distinctive position that makes the right clients come to them instead of chasing"
              rows={4}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Optional, but significantly improves the generated desires and content angles.
            </p>
          </div>

          <div className="flex justify-between gap-2 pt-2">
            <Button variant="outline" onClick={() => setStep('problem')} disabled={isEvaluating}>Back</Button>
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
                disabled={isEvaluating || !biggestDesire.trim()}
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Generate segment'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Follow-up questions (if LLM requests them) */}
      {step === 'followup' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            A couple more details would help generate a better profile.
          </p>

          {followUpQuestions.map((question, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{question}</label>
              <Textarea
                value={followUpAnswers[i]}
                onChange={e => {
                  const next = [...followUpAnswers]
                  next[i] = e.target.value
                  setFollowUpAnswers(next)
                }}
                rows={2}
                autoFocus={i === 0}
              />
            </div>
          ))}

          <div className="flex justify-between gap-2 pt-2">
            <Button variant="outline" onClick={() => setStep('desire')}>Back</Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => runGeneration()}
              >
                Skip & generate
              </Button>
              <Button
                onClick={handleFollowUpSubmit}
                disabled={followUpAnswers.every(a => !a.trim())}
              >
                Generate segment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Generating state */}
      {step === 'generating' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-sm font-medium">Generating your segment profile...</p>
            <p className="mt-1 text-xs text-muted-foreground">
              This takes about 30 seconds. Don&apos;t close this tab.
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {step === 'error' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-destructive">{errorMessage}</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button onClick={() => runGeneration()}>
              Try again
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
