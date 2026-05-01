import type { Skill } from './types'
import { helloWorld } from './hello-world'

export const skillRegistry: Record<string, Skill> = {
  [helloWorld.id]: helloWorld,
}

export function getSkill(id: string): Skill | null {
  return skillRegistry[id] ?? null
}

export function listSkills(): Skill[] {
  return Object.values(skillRegistry)
}

export function isSkillId(id: string | null | undefined): boolean {
  return Boolean(id && id in skillRegistry)
}
