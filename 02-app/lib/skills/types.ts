import { z } from 'zod'

export type SubAgentId = 'retrieval_bot' | 'db_update_bot'

export interface SkillCtx {
  brandId: string
  conversationId: string
}

export interface ChecklistItem {
  id: string
  label: string
  schema: z.ZodTypeAny
}

export interface Stage {
  id: string
  label: string
  systemPromptAddendum: string
  checklistItemIds: string[]
}

export interface Skill {
  id: string
  name: string
  description: string
  briefVersion: string
  brief: string
  mode: 'discursive' | 'staged'
  checklist: ChecklistItem[]
  stages?: Stage[]
  subAgents: SubAgentId[]
  gatheredSchema: z.ZodTypeAny
  openingMessage: (ctx: SkillCtx) => string
  onComplete?: (state: SkillState, ctx: SkillCtx) => Promise<void>
}

export interface SubAgent {
  id: SubAgentId
  name: string
  brief: string
  run: (input: { task: string; ctx: SkillCtx }) => Promise<string>
}

export interface ChecklistState {
  id: string
  label: string
  filled: boolean
  valueRef?: string
}

export interface SkillState {
  briefVersion: string
  gathered: Record<string, unknown>
  checklist: ChecklistState[]
  currentStage?: string
  stagesCompleted?: string[]
  completedAt?: string
  /**
   * Transient flag from the most recent turn's extraction. True means the
   * LLM signalled the current stage is complete. Cleared on `advanceStage`.
   */
  readyToAdvance?: boolean
}

export const skillStateSchema: z.ZodType<SkillState> = z.object({
  briefVersion: z.string(),
  gathered: z.record(z.string(), z.unknown()),
  checklist: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      filled: z.boolean(),
      valueRef: z.string().optional(),
    })
  ),
  currentStage: z.string().optional(),
  stagesCompleted: z.array(z.string()).optional(),
  completedAt: z.string().optional(),
  readyToAdvance: z.boolean().optional(),
})
