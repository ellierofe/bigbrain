import { db } from '@/lib/db'
import { conversations, messages } from '@/lib/db/schema/chat'
import { eq, and, isNull, desc, asc } from 'drizzle-orm'
import type { SkillState } from '@/lib/skills/types'

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export async function getConversations(brandId: string) {
  return db
    .select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      skillId: conversations.skillId,
      skillState: conversations.skillState,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.brandId, brandId),
        isNull(conversations.archivedAt)
      )
    )
    .orderBy(desc(conversations.updatedAt))
}

export async function getConversation(id: string) {
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1)
  return conv ?? null
}

export async function createConversation(
  brandId: string,
  opts?: { title?: string; skillId?: string; skillState?: SkillState }
) {
  const [conv] = await db
    .insert(conversations)
    .values({
      brandId,
      title: opts?.title,
      skillId: opts?.skillId,
      skillState: opts?.skillState,
    })
    .returning({ id: conversations.id })
  return conv
}

export async function updateConversationTitle(id: string, title: string) {
  await db
    .update(conversations)
    .set({ title, updatedAt: new Date() })
    .where(eq(conversations.id, id))
}

export async function touchConversation(id: string) {
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, id))
}

/** Persist the context-pane tab selection for a conversation.
 * `previousTabId` is stashed when an auto-tab-select happens (e.g. a pending
 * write arrives) so the tab can fall back when its status flips to 'hidden'.
 */
export async function updateConversationContextPaneState(
  id: string,
  state: { selectedTabId: string; previousTabId?: string | null }
) {
  await db
    .update(conversations)
    .set({ contextPaneState: state })
    .where(eq(conversations.id, id))
}

export async function archiveConversation(id: string) {
  await db
    .update(conversations)
    .set({ archivedAt: new Date() })
    .where(eq(conversations.id, id))
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function getMessages(conversationId: string) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt))
}

export async function addMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  opts?: {
    attachments?: unknown[]
    toolCalls?: unknown[]
    tokenCount?: number
    metadata?: Record<string, unknown>
  }
) {
  const [msg] = await db
    .insert(messages)
    .values({
      conversationId,
      role,
      content,
      attachments: opts?.attachments ?? null,
      toolCalls: opts?.toolCalls ?? null,
      tokenCount: opts?.tokenCount ?? null,
      metadata: opts?.metadata ?? null,
    })
    .returning()
  return msg
}

/** Get first user message for a conversation (for previews) */
export async function getFirstUserMessage(conversationId: string) {
  const [msg] = await db
    .select({ content: messages.content })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        eq(messages.role, 'user')
      )
    )
    .orderBy(asc(messages.createdAt))
    .limit(1)
  return msg?.content ?? null
}
