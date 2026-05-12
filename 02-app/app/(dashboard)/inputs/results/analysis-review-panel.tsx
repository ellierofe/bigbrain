'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, X, SkipForward, Archive, CheckCircle, Trash2 } from 'lucide-react'
import type {
  BatchAnalysis,
  ReflectiveAnalysis,
  ProjectSynthesis,
  ProcessingMode,
} from '@/lib/types/processing'

interface AnalysisReviewPanelProps {
  run: {
    id: string
    mode: string
    title: string | null
    analysisResult: unknown
    sourceIds: string[]
    effectiveStatus?: string
  }
  onClose: () => void
  onSkip: () => void
  onCommitSuccess: () => void
  readOnly?: boolean
}

function SectionHeader({
  title,
  count,
  open,
  onToggle,
}: {
  title: string
  count?: number
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 w-full text-left py-2 text-sm font-semibold font-display text-muted-foreground uppercase tracking-wide"
    >
      {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      {title}
      {count !== undefined && count > 0 && (
        <span className="text-xs font-normal bg-muted px-1.5 py-0.5 rounded">{count}</span>
      )}
    </button>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-border/40 rounded-md p-3 mb-2 text-sm">
      {children}
    </div>
  )
}

function SourceRefs({ refs }: { refs: string[] }) {
  if (!refs.length) return null
  return (
    <div className="mt-1.5 text-xs text-muted-foreground">
      Sources: {refs.join(', ')}
    </div>
  )
}

function BatchView({ data }: { data: BatchAnalysis }) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['summary', 'synthesisedInsights', 'recurringThemes'])
  )

  function toggle(key: string) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-1">
      <div className="text-sm mb-4">{data.summary}</div>
      <div className="text-xs text-muted-foreground mb-4">
        {data.sourceCount} sources · {data.dateRange.from} — {data.dateRange.to}
      </div>

      <SectionHeader title="Synthesised Insights" count={data.synthesisedInsights.length} open={openSections.has('synthesisedInsights')} onToggle={() => toggle('synthesisedInsights')} />
      {openSections.has('synthesisedInsights') && data.synthesisedInsights.map((item, i) => (
        <Card key={i}>
          <div className="font-medium">{item.insight}</div>
          <div className="mt-1 text-muted-foreground">{item.basis}</div>
          <div className="mt-1 text-muted-foreground italic">{item.implication}</div>
          <SourceRefs refs={item.sourceRefs} />
        </Card>
      ))}

      <SectionHeader title="Recurring Themes" count={data.recurringThemes.length} open={openSections.has('recurringThemes')} onToggle={() => toggle('recurringThemes')} />
      {openSections.has('recurringThemes') && data.recurringThemes.map((item, i) => (
        <Card key={i}>
          <div className="font-medium">{item.theme}</div>
          <div className="mt-1 text-muted-foreground">{item.description}</div>
          <SourceRefs refs={item.sourceRefs} />
        </Card>
      ))}

      <SectionHeader title="Convergences" count={data.convergences.length} open={openSections.has('convergences')} onToggle={() => toggle('convergences')} />
      {openSections.has('convergences') && data.convergences.map((item, i) => (
        <Card key={i}>
          <div className="font-medium">{item.point}</div>
          <div className="mt-1 text-muted-foreground">{item.description}</div>
          <SourceRefs refs={item.sourceRefs} />
        </Card>
      ))}

      <SectionHeader title="Divergences" count={data.divergences.length} open={openSections.has('divergences')} onToggle={() => toggle('divergences')} />
      {openSections.has('divergences') && data.divergences.map((item, i) => (
        <Card key={i}>
          <div className="font-medium">{item.point}</div>
          <div className="mt-1 text-muted-foreground">{item.description}</div>
          <SourceRefs refs={item.sourceRefs} />
        </Card>
      ))}

      <SectionHeader title="Gaps" count={data.gaps.length} open={openSections.has('gaps')} onToggle={() => toggle('gaps')} />
      {openSections.has('gaps') && data.gaps.map((item, i) => (
        <Card key={i}>
          <div className="font-medium">{item.gap}</div>
          <div className="mt-1 text-muted-foreground">{item.description}</div>
        </Card>
      ))}
    </div>
  )
}

function ReflectiveView({ data }: { data: ReflectiveAnalysis }) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['summary', 'keyRealisations', 'commitmentsAndFollowthrough'])
  )

  function toggle(key: string) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const statusColors: Record<string, string> = {
    completed: 'bg-success-bg text-success-foreground',
    in_progress: 'bg-info-bg text-info-foreground',
    dropped: 'bg-error-bg text-error-foreground',
    recurring: 'bg-warning-bg text-warning-foreground',
  }

  return (
    <div className="space-y-1">
      <div className="text-sm mb-4">{data.summary}</div>
      <div className="text-xs text-muted-foreground mb-4">
        {data.sessionCount} sessions · {data.period.from} — {data.period.to}
      </div>

      <SectionHeader title="Key Realisations" count={data.keyRealisations.length} open={openSections.has('keyRealisations')} onToggle={() => toggle('keyRealisations')} />
      {openSections.has('keyRealisations') && data.keyRealisations.map((item, i) => (
        <Card key={i}>
          <div className="font-medium">{item.realisation}</div>
          <div className="mt-1 text-muted-foreground">{item.significance}</div>
          <div className="mt-1 text-xs text-muted-foreground">Sources: {(item.sourceRefs ?? []).join(', ')}</div>
        </Card>
      ))}

      <SectionHeader title="Commitments & Follow-through" count={data.commitmentsAndFollowthrough.length} open={openSections.has('commitmentsAndFollowthrough')} onToggle={() => toggle('commitmentsAndFollowthrough')} />
      {openSections.has('commitmentsAndFollowthrough') && data.commitmentsAndFollowthrough.map((item, i) => (
        <Card key={i}>
          <div className="flex items-center gap-2">
            <span className="font-medium">{item.commitment}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors[item.status] ?? 'bg-muted text-muted-foreground'}`}>
              {item.status.replace('_', ' ')}
            </span>
          </div>
          <div className="mt-1 text-muted-foreground">{item.notes}</div>
          <div className="mt-1 text-xs text-muted-foreground">Sources: {(item.sourceRefs ?? []).join(', ')}</div>
        </Card>
      ))}

      <SectionHeader title="Recurring Blockers" count={data.recurringBlockers.length} open={openSections.has('recurringBlockers')} onToggle={() => toggle('recurringBlockers')} />
      {openSections.has('recurringBlockers') && data.recurringBlockers.map((item, i) => (
        <Card key={i}>
          <div className="font-medium">{item.blocker}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Appeared in {item.frequency} sessions · {item.resolved ? `Resolved: ${item.resolution}` : 'Unresolved'}
          </div>
        </Card>
      ))}

      <SectionHeader title="Emerging Themes" count={data.emergingThemes.length} open={openSections.has('emergingThemes')} onToggle={() => toggle('emergingThemes')} />
      {openSections.has('emergingThemes') && data.emergingThemes.map((item, i) => (
        <Card key={i}>
          <div className="font-medium">{item.theme}</div>
          <div className="mt-1 text-muted-foreground">{item.trajectory}</div>
        </Card>
      ))}

      <SectionHeader title="Shifts in Thinking" count={data.shiftsInThinking.length} open={openSections.has('shiftsInThinking')} onToggle={() => toggle('shiftsInThinking')} />
      {openSections.has('shiftsInThinking') && data.shiftsInThinking.map((item, i) => (
        <Card key={i}>
          <div className="font-medium">{item.shift}</div>
          <div className="mt-1 text-muted-foreground">From: {item.from}</div>
          <div className="text-muted-foreground">To: {item.to}</div>
          {item.trigger && <div className="mt-1 text-xs text-muted-foreground">Trigger: {item.trigger}</div>}
        </Card>
      ))}

      <SectionHeader title="Energy & Momentum" open={openSections.has('energyAndMomentum')} onToggle={() => toggle('energyAndMomentum')} />
      {openSections.has('energyAndMomentum') && (
        <Card>
          <div className="space-y-2">
            <div><span className="font-medium">High points:</span> {data.energyAndMomentum.highPoints.join('; ')}</div>
            <div><span className="font-medium">Low points:</span> {data.energyAndMomentum.lowPoints.join('; ')}</div>
            <div className="text-muted-foreground">{data.energyAndMomentum.patterns}</div>
          </div>
        </Card>
      )}

      <SectionHeader title="Meta Analysis" count={data.metaAnalysis.length} open={openSections.has('metaAnalysis')} onToggle={() => toggle('metaAnalysis')} />
      {openSections.has('metaAnalysis') && data.metaAnalysis.map((item, i) => (
        <Card key={i}>
          <div className="font-medium">{item.observation}</div>
          <div className="mt-1 text-muted-foreground">{item.evidence}</div>
          <div className="mt-1 text-muted-foreground italic">{item.suggestions}</div>
        </Card>
      ))}
    </div>
  )
}

function SynthesisView({ data }: { data: ProjectSynthesis }) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['summary', 'methodology', 'reusablePatterns', 'caseStudyNarrative'])
  )

  function toggle(key: string) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-1">
      <div className="text-sm mb-4">{data.summary}</div>
      <div className="text-xs text-muted-foreground mb-4">
        Project: {data.projectName} · {data.sourceCount} sources · {data.dateRange.from} — {data.dateRange.to}
      </div>

      <SectionHeader title="Methodology" open={openSections.has('methodology')} onToggle={() => toggle('methodology')} />
      {openSections.has('methodology') && (
        <Card>
          <div className="mb-2">{data.methodology.overview}</div>
          <ol className="list-decimal list-inside space-y-1">
            {data.methodology.steps.map((step, i) => (
              <li key={i}>
                <span className="font-medium">{step.step}</span>
                <span className="text-muted-foreground"> — {step.description}</span>
                {step.tools && step.tools.length > 0 && (
                  <span className="text-xs text-muted-foreground"> (tools: {step.tools.join(', ')})</span>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}

      <SectionHeader title="What Worked" count={data.whatWorked.length} open={openSections.has('whatWorked')} onToggle={() => toggle('whatWorked')} />
      {openSections.has('whatWorked') && data.whatWorked.map((item, i) => (
        <Card key={i}>
          <div className="font-medium">{item.approach}</div>
          <div className="mt-1 text-muted-foreground">{item.evidence}</div>
          <SourceRefs refs={item.sourceRefs} />
        </Card>
      ))}

      <SectionHeader title="What Didn't Work" count={data.whatDidntWork.length} open={openSections.has('whatDidntWork')} onToggle={() => toggle('whatDidntWork')} />
      {openSections.has('whatDidntWork') && data.whatDidntWork.map((item, i) => (
        <Card key={i}>
          <div className="font-medium">{item.approach}</div>
          <div className="mt-1 text-muted-foreground">{item.whatHappened}</div>
          <div className="mt-1 text-muted-foreground italic">Lesson: {item.lesson}</div>
        </Card>
      ))}

      <SectionHeader title="Reusable Patterns" count={data.reusablePatterns.length} open={openSections.has('reusablePatterns')} onToggle={() => toggle('reusablePatterns')} />
      {openSections.has('reusablePatterns') && data.reusablePatterns.map((item, i) => (
        <Card key={i}>
          <div className="font-medium">{item.pattern}</div>
          <div className="mt-1 text-muted-foreground">{item.description}</div>
          <div className="mt-1 text-xs text-muted-foreground">Applicability: {item.applicability}</div>
        </Card>
      ))}

      <SectionHeader title="Case Study Narrative" open={openSections.has('caseStudyNarrative')} onToggle={() => toggle('caseStudyNarrative')} />
      {openSections.has('caseStudyNarrative') && (
        <Card>
          <div className="whitespace-pre-wrap">{data.caseStudyNarrative}</div>
        </Card>
      )}

      <SectionHeader title="Content Angles" count={data.contentAngles.length} open={openSections.has('contentAngles')} onToggle={() => toggle('contentAngles')} />
      {openSections.has('contentAngles') && data.contentAngles.map((item, i) => (
        <Card key={i}>
          <div className="font-medium">{item.angle}</div>
          <div className="mt-1 text-xs text-muted-foreground">Audience: {item.audience}</div>
          <div className="mt-1 text-muted-foreground">{item.whyItResonates}</div>
        </Card>
      ))}

      <SectionHeader title="Open Threads" count={data.openThreads.length} open={openSections.has('openThreads')} onToggle={() => toggle('openThreads')} />
      {openSections.has('openThreads') && data.openThreads.map((item, i) => (
        <Card key={i}>
          <div className="font-medium">{item.question}</div>
          <div className="mt-1 text-muted-foreground">{item.context}</div>
        </Card>
      ))}
    </div>
  )
}

export function AnalysisReviewPanel({ run, onClose, onSkip, onCommitSuccess, readOnly }: AnalysisReviewPanelProps) {
  const data = run.analysisResult as BatchAnalysis | ReflectiveAnalysis | ProjectSynthesis

  const statusLabel = run.effectiveStatus === 'committed' ? 'Saved' : run.effectiveStatus === 'skipped' ? 'Dismissed' : null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-display font-semibold">{run.title ?? 'Analysis'}</h3>
            {statusLabel && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                run.effectiveStatus === 'committed' ? 'bg-success-bg text-success-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {statusLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {run.sourceIds.length} source{run.sourceIds.length !== 1 ? 's' : ''} · {run.mode} analysis
          </p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {run.mode === 'batch' && <BatchView data={data as BatchAnalysis} />}
        {run.mode === 'reflective' && <ReflectiveView data={data as ReflectiveAnalysis} />}
        {run.mode === 'synthesis' && <SynthesisView data={data as ProjectSynthesis} />}
      </div>

      {/* Footer */}
      {!readOnly && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/40">
          <button
            onClick={onSkip}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            title="Dismiss this analysis — not useful or will re-run later"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Dismiss
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onCommitSuccess}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              title="Save this analysis — reviewed and worth keeping"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Save analysis
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
