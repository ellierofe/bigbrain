'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brain } from 'lucide-react'
import { toast } from 'sonner'
import { ActionButton } from '@/components/action-button'
import { EmptyState } from '@/components/empty-state'
import { InlineWarningBanner } from '@/components/inline-warning-banner'
import { PaneHighlightPulse } from '@/components/pane-highlight-pulse'
import { SectionCard } from '@/components/section-card'
import { SkillChecklist } from '@/components/skill-checklist'
import { SkillPickerRow } from '@/components/skill-picker-row'
import { StageCard } from '@/components/stage-card'
import {
  attachSkillAction,
  createConversationWithSkillAction,
} from '@/app/actions/skills'
import type { SkillState, ChecklistState } from '@/lib/skills/types'
import type {
  ContextTab,
  ConversationCtx,
  SkillSummary,
} from '@/lib/chat-context-pane/types'

export const skillStateTab: ContextTab = {
  id: 'skill-state',
  label: 'Skill state',
  icon: Brain,
  priority: 10,
  status: () => 'active',
  adornment: (ctx) =>
    ctx.conversation.skillState?.completedAt ? 'check' : null,
  render: (ctx) => <SkillStateTabBody ctx={ctx} />,
}

function SkillStateTabBody({ ctx }: { ctx: ConversationCtx }) {
  const { conversation, hasMessages, activeSkillSummary, availableSkills } = ctx

  // State 4: skill_id set but not in registry
  if (conversation.skillId && !activeSkillSummary) {
    return <RegistryMissView />
  }

  // States 1 & 5: active skill (and completion overlay)
  if (activeSkillSummary && conversation.skillState) {
    return (
      <ActiveSkillView
        skill={activeSkillSummary}
        skillState={conversation.skillState}
      />
    )
  }

  // State 2: empty conversation, no skill — show picker
  if (!hasMessages) {
    return (
      <SkillPickerView
        conversationId={conversation.id}
        skills={availableSkills}
      />
    )
  }

  // State 3: freeform with messages
  return <FreeformLockedView />
}

function ActiveSkillView({
  skill,
  skillState,
}: {
  skill: SkillSummary
  skillState: SkillState
}) {
  const [expandedStageIds, setExpandedStageIds] = useState<string[]>([])
  const isCompleted = Boolean(skillState.completedAt)

  const filledCount = skillState.checklist.filter((c) => c.filled).length
  const checklistKey = `${filledCount}/${skillState.checklist.length}`

  const toggleStage = useCallback((id: string) => {
    setExpandedStageIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }, [])

  const stages = skill.stagesMeta

  return (
    <div className="flex flex-col gap-4">
      {isCompleted && (
        <InlineWarningBanner
          tone="success"
          title={`Completed at ${formatTime(skillState.completedAt!)}.`}
          subtitle="Database updated. Keep chatting."
        />
      )}

      <SectionCard title={skill.name} description={skill.description}>
        <></>
      </SectionCard>

      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Checklist
        </h3>
        <PaneHighlightPulse pulseKey={checklistKey}>
          <SkillChecklist items={mapChecklist(skillState.checklist)} />
        </PaneHighlightPulse>
      </section>

      {stages.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Stages
          </h3>
          <div className="flex flex-col gap-2">
            {stages.map((stage) => {
              const stageStatus = resolveStageStatus(skillState, stage.id)
              const stageValues = collectStageValues(skill, skillState, stage.id)
              const stageKey = `${stage.id}:${stageStatus}`
              return (
                <PaneHighlightPulse key={stage.id} pulseKey={stageKey}>
                  <StageCard
                    id={stage.id}
                    label={stage.label}
                    status={stageStatus}
                    expanded={expandedStageIds.includes(stage.id)}
                    onToggle={() => toggleStage(stage.id)}
                    gatheredValues={stageValues}
                  />
                </PaneHighlightPulse>
              )
            })}
          </div>
        </section>
      )}

      {stages.length === 0 && skillState.checklist.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Captured so far
          </h3>
          <PaneHighlightPulse pulseKey={Object.keys(skillState.gathered).join(',')}>
            <DiscursiveGatheredList skillState={skillState} />
          </PaneHighlightPulse>
        </section>
      )}
    </div>
  )
}

function DiscursiveGatheredList({ skillState }: { skillState: SkillState }) {
  const entries = Object.entries(skillState.gathered).filter(
    ([, v]) => v !== null && v !== undefined && v !== ''
  )
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing captured yet.</p>
  }
  return (
    <dl className="flex flex-col gap-3">
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-col gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {humanizeKey(key)}
          </dt>
          <dd className="whitespace-pre-wrap break-words text-sm text-foreground">
            {typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
              ? String(value)
              : JSON.stringify(value, null, 2)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function SkillPickerView({
  conversationId,
  skills,
}: {
  conversationId: string
  skills: SkillSummary[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  const handlePick = useCallback(
    async (skillId: string) => {
      setBusy(skillId)
      try {
        if (conversationId) {
          await attachSkillAction(conversationId, skillId)
          router.refresh()
        } else {
          const { conversationId: newId } =
            await createConversationWithSkillAction(skillId)
          router.push(`/chat/${newId}`)
        }
      } catch {
        toast.error('Could not start that skill.')
        setBusy(null)
      }
    },
    [conversationId, router]
  )

  if (skills.length === 0) {
    return (
      <EmptyState
        icon={Brain}
        heading="No skills available yet"
        description="Skills will appear here once they are registered."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Choose a skill
      </h3>
      <div className="flex flex-col gap-2">
        {skills.map((skill) => (
          <SkillPickerRow
            key={skill.id}
            skillId={skill.id}
            name={skill.name}
            description={skill.description}
            icon={Brain}
            onClick={() => {
              if (busy) return
              handlePick(skill.id)
            }}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Or keep chatting freely.</p>
    </div>
  )
}

function FreeformLockedView() {
  const router = useRouter()
  return (
    <EmptyState
      icon={Brain}
      heading="This conversation is freeform"
      description="To use a skill, start a new conversation."
      action={
        <ActionButton onClick={() => router.push('/chat')}>
          Start new conversation
        </ActionButton>
      }
    />
  )
}

function RegistryMissView() {
  return (
    <InlineWarningBanner
      title="This conversation used a skill that's no longer available."
      subtitle="Messages remain readable; the skill cannot be resumed."
    />
  )
}

// ---------- helpers ----------

function mapChecklist(checklist: ChecklistState[]) {
  return checklist.map((c) => ({ id: c.id, label: c.label, filled: c.filled }))
}

function resolveStageStatus(
  skillState: SkillState,
  stageId: string
): 'completed' | 'current' | 'pending' {
  if (skillState.stagesCompleted?.includes(stageId)) return 'completed'
  if (skillState.currentStage === stageId) return 'current'
  return 'pending'
}

function collectStageValues(
  skill: SkillSummary,
  skillState: SkillState,
  stageId: string
): { label: string; value: unknown }[] {
  const stage = skill.stagesMeta.find((s) => s.id === stageId)
  if (!stage) return []
  const items: { label: string; value: unknown }[] = []
  for (const checklistItemId of stage.checklistItemIds) {
    const checklistItem = skill.checklistMeta.find((c) => c.id === checklistItemId)
    if (!checklistItem) continue
    const stateItem = skillState.checklist.find((c) => c.id === checklistItemId)
    const valueRef = stateItem?.valueRef ?? checklistItemId
    const value = skillState.gathered[valueRef]
    items.push({ label: checklistItem.label, value })
  }
  return items
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\s+/, '')
    .replace(/\s+/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}
