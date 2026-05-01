import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { conversations } from '@/lib/db/schema/chat'
import type { SkillState } from './types'

export async function getSkillContext(conversationId: string) {
  const [row] = await db
    .select({
      id: conversations.id,
      brandId: conversations.brandId,
      skillId: conversations.skillId,
      skillState: conversations.skillState,
    })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1)
  return row ?? null
}

export async function setSkill(
  conversationId: string,
  skillId: string,
  initialState: SkillState
) {
  await db
    .update(conversations)
    .set({ skillId, skillState: initialState, updatedAt: new Date() })
    .where(eq(conversations.id, conversationId))
}

export async function saveSkillState(conversationId: string, state: SkillState) {
  await db
    .update(conversations)
    .set({ skillState: state, updatedAt: new Date() })
    .where(eq(conversations.id, conversationId))
}
