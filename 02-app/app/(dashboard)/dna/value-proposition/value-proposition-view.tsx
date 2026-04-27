'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  MessageSquare, Users, AlertCircle, Sparkles,
  Fingerprint, ListChecks, Swords, Mic, NotebookPen,
  Plus, Trash2,
} from 'lucide-react'
import { ActionButton } from '@/components/action-button'
import { IconButton } from '@/components/icon-button'
import { PageHeader } from '@/components/page-header'
import { ContentPane } from '@/components/content-pane'
import { SectionCard } from '@/components/section-card'
import { InlineField } from '@/components/inline-field'
import { ListRowField } from '@/components/list-row-field'
import {
  saveValuePropositionField,
  saveValuePropositionDifferentiators,
  saveValuePropositionAlternatives,
} from '@/app/actions/dna-singular'
import type { DnaValueProposition } from '@/lib/db/schema/dna/value-proposition'

interface ValuePropositionViewProps {
  data: DnaValueProposition
}

interface Alternative {
  alternative: string
  whyUs: string
}

export function ValuePropositionView({ data }: ValuePropositionViewProps) {
  const initialDifferentiators = (data.differentiators ?? []) as string[]
  const initialAlternatives = (data.alternativesAddressed ?? []) as Alternative[]

  const [differentiators, setDifferentiators] = useState<string[]>(initialDifferentiators)
  const [alternatives, setAlternatives] = useState<Alternative[]>(initialAlternatives)

  function makeFieldSaver(field: string) {
    return async (value: string) => {
      const result = await saveValuePropositionField(field, value || null)
      return result
    }
  }

  // Differentiators
  async function persistDifferentiators(updated: string[]) {
    setDifferentiators(updated)
    const result = await saveValuePropositionDifferentiators(updated)
    if (!result.ok) toast.error(result.error)
    return result
  }

  function addDifferentiator() {
    if (differentiators.length >= 6) {
      toast.error('Maximum 6 differentiators.')
      return
    }
    persistDifferentiators([...differentiators, ''])
  }

  function removeDifferentiator(index: number) {
    persistDifferentiators(differentiators.filter((_, i) => i !== index))
  }

  function updateDifferentiator(index: number, value: string) {
    return persistDifferentiators(differentiators.map((d, i) => (i === index ? value : d)))
  }

  // Alternatives
  async function persistAlternatives(updated: Alternative[]) {
    setAlternatives(updated)
    const result = await saveValuePropositionAlternatives(updated)
    if (!result.ok) toast.error(result.error)
    return result
  }

  function addAlternative() {
    persistAlternatives([...alternatives, { alternative: '', whyUs: '' }])
  }

  function removeAlternative(index: number) {
    persistAlternatives(alternatives.filter((_, i) => i !== index))
  }

  function updateAlternative(index: number, field: keyof Alternative, value: string) {
    return persistAlternatives(
      alternatives.map((a, i) => (i === index ? { ...a, [field]: value } : a))
    )
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Value Proposition"
        subtitle="What is promised, to whom, and why this business over alternatives."
      />

      <ContentPane>
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {/* Core statement — featured */}
          <section className="rounded-lg border bg-card p-6 border-l-[3px] border-l-primary">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-lg font-display font-semibold">Core Statement</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              The distilled value proposition in 1-3 sentences. The answer to "what do you do and why does it matter?"
            </p>
            <InlineField
              variant="textarea"
              label=""
              value={data.coreStatement}
              placeholder="What do you do and why does it matter?"
              rows={3}
              className="text-base font-display leading-relaxed"
              onSave={makeFieldSaver('coreStatement')}
            />
          </section>

          {/* Who & What */}
          <SectionCard title="Who & What" description="The people you serve, the problem you solve, and the outcome you deliver.">
            <div className="flex flex-col gap-4">
              <InlineField
                variant="textarea"
                label="Target customer"
                icon={Users}
                value={data.targetCustomer}
                placeholder="Who this is for — a description of the person and their situation, not a segment name."
                rows={2}
                onSave={makeFieldSaver('targetCustomer')}
              />
              <InlineField
                variant="textarea"
                label="Problem solved"
                icon={AlertCircle}
                value={data.problemSolved}
                placeholder="The specific problem or tension this business resolves. Should feel painfully accurate to the target customer."
                rows={3}
                onSave={makeFieldSaver('problemSolved')}
              />
              <InlineField
                variant="textarea"
                label="Outcome delivered"
                icon={Sparkles}
                value={data.outcomeDelivered}
                placeholder="The transformation or result the customer gets. Concrete, not abstract."
                rows={3}
                onSave={makeFieldSaver('outcomeDelivered')}
              />
            </div>
          </SectionCard>

          {/* How */}
          <SectionCard title="Unique Mechanism" description="How this business delivers the outcome differently — the 'only we...' or 'because we...'">
            <InlineField
              variant="textarea"
              label="Unique mechanism"
              icon={Fingerprint}
              value={data.uniqueMechanism}
              placeholder="What makes the outcome credible and distinct? What do you do that others don't or can't?"
              rows={3}
              onSave={makeFieldSaver('uniqueMechanism')}
            />
          </SectionCard>

          {/* Differentiators */}
          <SectionCard
            title="Differentiators"
            description="Specific differentiating factors vs alternatives. 3-6 recommended."
            action={
              differentiators.length < 6 ? (
                <ActionButton icon={Plus} variant="outline" onClick={addDifferentiator}>
                  Add
                </ActionButton>
              ) : undefined
            }
          >
            <div className="flex flex-col gap-3">
              {differentiators.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <ListChecks className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <ListRowField
                    variant="input"
                    value={d}
                    onSave={(value) => updateDifferentiator(i, value)}
                    placeholder={`Differentiator ${i + 1}`}
                    aria-label={`Differentiator ${i + 1}`}
                  />
                  <IconButton
                    icon={Trash2}
                    label="Remove differentiator"
                    variant="ghost"
                    onClick={() => removeDifferentiator(i)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  />
                </div>
              ))}

              {differentiators.length === 0 && (
                <p className="text-sm text-muted-foreground/60 text-center py-4">
                  No differentiators defined yet.
                </p>
              )}
            </div>
          </SectionCard>

          {/* Alternatives addressed */}
          <SectionCard
            title="Alternatives Addressed"
            description="Key alternatives a prospect might consider, and why this is the better choice."
            action={
              <ActionButton icon={Plus} variant="outline" onClick={addAlternative}>
                Add
              </ActionButton>
            }
          >
            <div className="flex flex-col gap-4">
              {alternatives.map((alt, i) => (
                <div key={i} className="rounded-lg border bg-muted/20 p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <Swords className="h-4 w-4 text-muted-foreground shrink-0" />
                      <ListRowField
                        variant="input"
                        value={alt.alternative}
                        onSave={(value) => updateAlternative(i, 'alternative', value)}
                        placeholder="The alternative (e.g. hiring in-house, doing nothing)"
                        aria-label={`Alternative ${i + 1}`}
                        className="font-medium"
                      />
                    </div>
                    <IconButton
                      icon={Trash2}
                      label="Remove alternative"
                      variant="ghost"
                      onClick={() => removeAlternative(i)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    />
                  </div>
                  <ListRowField
                    variant="textarea"
                    value={alt.whyUs}
                    onSave={(value) => updateAlternative(i, 'whyUs', value)}
                    placeholder="Why this is the better choice..."
                    rows={2}
                    aria-label={`Why us over alternative ${i + 1}`}
                  />
                </div>
              ))}

              {alternatives.length === 0 && (
                <p className="text-sm text-muted-foreground/60 text-center py-4">
                  No alternatives defined yet.
                </p>
              )}
            </div>
          </SectionCard>

          {/* Elevator pitch — featured */}
          <section className="rounded-lg border bg-card p-6 border-l-[3px] border-l-primary">
            <div className="flex items-center gap-2 mb-1">
              <Mic className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-lg font-display font-semibold">Elevator Pitch</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              A spoken, first-person version of the value proposition — conversational, not corporate.
            </p>
            <InlineField
              variant="textarea"
              label=""
              value={data.elevatorPitch}
              placeholder="Imagine you're at a dinner party and someone asks what you do. What do you say?"
              rows={4}
              className="text-base font-display leading-relaxed"
              onSave={makeFieldSaver('elevatorPitch')}
            />
          </section>

          {/* Notes */}
          <SectionCard title="Notes">
            <InlineField
              variant="textarea"
              label="Internal notes"
              icon={NotebookPen}
              value={data.internalNotes}
              placeholder="Reasoning behind wording choices, what's been tested, what didn't work."
              rows={4}
              onSave={makeFieldSaver('internalNotes')}
            />
          </SectionCard>
        </div>
      </ContentPane>
    </div>
  )
}
