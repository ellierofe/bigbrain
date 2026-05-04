import type { Skill } from '@/lib/skills/types'
import type { SkillSummary } from './types'

/**
 * Project a server-side `Skill` to a client-safe `SkillSummary`. Strips the
 * brief text, Zod schemas, and callbacks so the result can cross the
 * server/client boundary without dragging server-only code (e.g. node:fs).
 */
export function toSkillSummary(skill: Skill): SkillSummary {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    mode: skill.mode,
    checklistMeta: skill.checklist.map((c) => ({ id: c.id, label: c.label })),
    stagesMeta: (skill.stages ?? []).map((s) => ({
      id: s.id,
      label: s.label,
      checklistItemIds: s.checklistItemIds,
    })),
  }
}
