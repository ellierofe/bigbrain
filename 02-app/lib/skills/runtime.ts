import { z } from 'zod'
import { SYSTEM_PROMPTS } from '@/lib/llm'
import type { Skill, SkillState, Stage } from './types'

export function initialSkillState(skill: Skill): SkillState {
  return {
    briefVersion: skill.briefVersion,
    gathered: {},
    checklist: skill.checklist.map((item) => ({
      id: item.id,
      label: item.label,
      filled: false,
    })),
    currentStage: skill.stages?.[0]?.id,
    stagesCompleted: [],
  }
}

export function assembleSystemPrompt(skill: Skill, state: SkillState): string {
  const parts: string[] = [SYSTEM_PROMPTS.chat, '', '---', '', skill.brief]

  if (skill.mode === 'staged' && state.currentStage) {
    const stage = skill.stages?.find((s) => s.id === state.currentStage)
    if (stage) {
      parts.push('', '---', '', `## Current stage: ${stage.label}`, '', stage.systemPromptAddendum)
    }
  }

  const filled = state.checklist.filter((c) => c.filled).map((c) => c.label)
  const unfilled = state.checklist.filter((c) => !c.filled).map((c) => c.label)
  parts.push(
    '',
    '---',
    '',
    '## Checklist',
    `Filled: ${filled.length ? filled.join(', ') : '(none yet)'}`,
    `Still to gather: ${unfilled.length ? unfilled.join(', ') : '(complete)'}`
  )

  if (Object.keys(state.gathered).length > 0) {
    parts.push('', '## Gathered so far', JSON.stringify(state.gathered, null, 2))
  }

  return parts.join('\n')
}

export function turnExtractionSchema(skill: Skill) {
  return z.object({
    gathered: skill.gatheredSchema,
    checklistFilledIds: z
      .array(z.string())
      .describe('IDs of checklist items that are now filled based on what has been gathered'),
    readyToAdvance: z
      .boolean()
      .describe(
        'Staged skills only — true if the current stage is complete and the user should advance.'
      ),
  })
}

export type TurnExtraction = {
  gathered: unknown
  checklistFilledIds: string[]
  readyToAdvance: boolean
}

export function applyTurnExtraction(
  skill: Skill,
  state: SkillState,
  extraction: TurnExtraction
): SkillState {
  const filledSet = new Set(extraction.checklistFilledIds)
  const mergedGathered =
    extraction.gathered && typeof extraction.gathered === 'object'
      ? { ...state.gathered, ...(extraction.gathered as Record<string, unknown>) }
      : state.gathered

  return {
    ...state,
    gathered: mergedGathered,
    checklist: state.checklist.map((item) => ({
      ...item,
      filled: item.filled || filledSet.has(item.id),
    })),
    readyToAdvance: skill.mode === 'staged' ? extraction.readyToAdvance : false,
  }
}

export function validateAdvancement(
  skill: Skill,
  state: SkillState
): { ok: true; nextStage: Stage } | { ok: false; missing: string[] } | { ok: false; reason: string } {
  if (skill.mode !== 'staged' || !skill.stages) {
    return { ok: false, reason: 'Skill is not staged.' }
  }
  if (!state.currentStage) {
    return { ok: false, reason: 'No current stage on state.' }
  }

  const currentIdx = skill.stages.findIndex((s) => s.id === state.currentStage)
  if (currentIdx === -1) {
    return { ok: false, reason: `Current stage "${state.currentStage}" not in skill.` }
  }

  const stage = skill.stages[currentIdx]
  const filledIds = new Set(state.checklist.filter((c) => c.filled).map((c) => c.id))
  const missing = stage.checklistItemIds
    .filter((id) => !filledIds.has(id))
    .map((id) => state.checklist.find((c) => c.id === id)?.label ?? id)

  if (missing.length > 0) {
    return { ok: false, missing }
  }

  const next = skill.stages[currentIdx + 1]
  if (!next) {
    return { ok: false, reason: 'Already on the final stage.' }
  }
  return { ok: true, nextStage: next }
}

export function advanceStage(state: SkillState, nextStageId: string): SkillState {
  const completed = state.currentStage
    ? [...(state.stagesCompleted ?? []), state.currentStage]
    : state.stagesCompleted ?? []
  return {
    ...state,
    currentStage: nextStageId,
    stagesCompleted: completed,
    readyToAdvance: false,
  }
}

export function markComplete(state: SkillState): SkillState {
  return { ...state, completedAt: new Date().toISOString() }
}

export function missingChecklistLabels(skill: Skill, state: SkillState): string[] {
  if (skill.mode !== 'staged' || !skill.stages || !state.currentStage) return []
  const stage = skill.stages.find((s) => s.id === state.currentStage)
  if (!stage) return []
  const filledIds = new Set(state.checklist.filter((c) => c.filled).map((c) => c.id))
  return stage.checklistItemIds
    .filter((id) => !filledIds.has(id))
    .map((id) => state.checklist.find((c) => c.id === id)?.label ?? id)
}
