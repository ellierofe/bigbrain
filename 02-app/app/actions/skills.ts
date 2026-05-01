'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { brands } from '@/lib/db/schema/brands'
import { eq } from 'drizzle-orm'
import {
  createConversation,
  addMessage,
  getMessages,
} from '@/lib/db/queries/chat'
import { getSkill } from '@/lib/skills/registry'
import {
  initialSkillState,
  validateAdvancement,
  advanceStage,
} from '@/lib/skills/runtime'
import { setSkill, saveSkillState, getSkillContext } from '@/lib/skills/state'

const isDev = process.env.NODE_ENV === 'development'

async function requireAuth() {
  if (isDev) return
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
}

async function getBrandId(): Promise<string> {
  const [brand] = await db
    .select({ id: brands.id })
    .from(brands)
    .where(eq(brands.slug, 'nicelyput'))
    .limit(1)
  if (!brand) throw new Error('Brand not found')
  return brand.id
}

function skillTitle(skillName: string): string {
  const date = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
  return `${skillName} · ${date}`
}

/**
 * Slash-command Case A: attach a skill to the current conversation if it has
 * no messages and no existing skill. Generates the opening message via the
 * skill's `openingMessage` and persists it as the first assistant message.
 */
export async function attachSkillAction(conversationId: string, skillId: string) {
  await requireAuth()
  const skill = getSkill(skillId)
  if (!skill) throw new Error(`Skill "${skillId}" not in registry`)

  const ctx = await getSkillContext(conversationId)
  if (!ctx) throw new Error('Conversation not found')
  if (ctx.skillId) throw new Error('Conversation already has a skill')

  const messageCount = (await getMessages(conversationId)).length
  if (messageCount > 0) throw new Error('Conversation has messages — cannot attach skill')

  const initial = initialSkillState(skill)
  await setSkill(conversationId, skill.id, initial)

  const opening = skill.openingMessage({
    brandId: ctx.brandId,
    conversationId,
  })
  await addMessage(conversationId, 'assistant', opening)

  return { conversationId, openingMessage: opening }
}

/**
 * Slash-command Case B: create a brand-new conversation with the skill set
 * and the opening message persisted. Used when the current conversation has
 * messages or an existing skill — the user confirms switching context and we
 * route them to the new conversation.
 */
export async function createConversationWithSkillAction(skillId: string) {
  await requireAuth()
  const skill = getSkill(skillId)
  if (!skill) throw new Error(`Skill "${skillId}" not in registry`)

  const brandId = await getBrandId()
  const initial = initialSkillState(skill)
  const conv = await createConversation(brandId, {
    title: skillTitle(skill.name),
    skillId: skill.id,
    skillState: initial,
  })

  const opening = skill.openingMessage({ brandId, conversationId: conv.id })
  await addMessage(conv.id, 'assistant', opening)

  return { conversationId: conv.id }
}

/**
 * Continue button: advance the current stage if checklist items are filled.
 */
export async function advanceStageAction(conversationId: string) {
  await requireAuth()
  const ctx = await getSkillContext(conversationId)
  if (!ctx?.skillId || !ctx.skillState) {
    return { ok: false as const, reason: 'No skill on conversation.' }
  }
  const skill = getSkill(ctx.skillId)
  if (!skill) {
    return { ok: false as const, reason: 'Skill not in registry.' }
  }
  const result = validateAdvancement(skill, ctx.skillState as never)
  if (!result.ok) {
    if ('missing' in result) return { ok: false as const, missing: result.missing }
    return { ok: false as const, reason: result.reason }
  }
  const newState = advanceStage(ctx.skillState as never, result.nextStage.id)
  await saveSkillState(conversationId, newState)
  return { ok: true as const, nextStageLabel: result.nextStage.label }
}
