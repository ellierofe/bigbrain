import { notFound } from 'next/navigation'
import type { UIMessage } from 'ai'
import {
  getConversation,
  getConversations,
  getMessages,
  getFirstUserMessage,
} from '@/lib/db/queries/chat'
import { getBrandPanePrefs } from '@/lib/db/queries/brands'
import { getSkill, isSkillId, listSkills } from '@/lib/skills/registry'
import { listPendingByConversation } from '@/lib/db/queries/pending-writes'
import { toPendingWriteSummary } from '@/lib/chat-context-pane/pending-write-summary'
import type { SkillState } from '@/lib/skills/types'
import type { ContextPaneState } from '@/lib/chat-context-pane/types'
import { toSkillSummary } from '@/lib/chat-context-pane/skill-summary'
import { ChatArea } from '../chat-area'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ConversationPage({ params }: Props) {
  const { id } = await params
  const conversation = await getConversation(id)
  if (!conversation) notFound()

  const [dbMessages, convs, panePrefs, pendingRows] = await Promise.all([
    getMessages(id),
    getConversations(BRAND_ID),
    getBrandPanePrefs(BRAND_ID),
    listPendingByConversation(id),
  ])

  // Convert DB messages to UIMessage format. System messages carry a `metadata`
  // payload used by the SystemMessageDivider render branch — we preserve it
  // via the UIMessage's optional `metadata` field.
  const initialMessages: UIMessage[] = dbMessages.map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant' | 'system',
    parts: [{ type: 'text' as const, text: msg.content }],
    metadata: (msg.metadata as Record<string, unknown> | null) ?? undefined,
  }))

  const pendingWrites = pendingRows.map(toPendingWriteSummary)

  const conversations = await Promise.all(
    convs.map(async (c) => {
      const cSkillState = (c.skillState as SkillState | null) ?? null
      return {
        id: c.id,
        title: c.title,
        preview: await getFirstUserMessage(c.id),
        updatedAt: c.updatedAt,
        skillId: c.skillId,
        skillCompletedAt: cSkillState?.completedAt ?? null,
        skillInRegistry: isSkillId(c.skillId),
      }
    })
  )

  const skill = conversation.skillId ? getSkill(conversation.skillId) : null
  const skillState = (conversation.skillState as SkillState | null) ?? null
  const skillInRegistry = !conversation.skillId || skill !== null
  const contextPaneState = (conversation.contextPaneState as ContextPaneState | null) ?? null
  const availableSkills = listSkills().map(toSkillSummary)
  const activeSkillSummary = skill ? toSkillSummary(skill) : null

  return (
    <div className="flex h-full -mx-8 -mb-8 -mt-2">
      <ChatArea
        conversationId={id}
        initialMessages={initialMessages}
        conversations={conversations}
        skillState={skillState}
        skillName={skill?.name ?? null}
        skillMode={skill?.mode ?? null}
        skillInRegistry={skillInRegistry}
        conversationHasMessages={dbMessages.length > 0}
        paneOpen={panePrefs.chatPaneOpen}
        paneWidth={panePrefs.chatPaneWidth}
        paneSelectedTabId={contextPaneState?.selectedTabId ?? null}
        paneConversationId={id}
        paneSkillId={conversation.skillId}
        paneSkillState={skillState}
        paneAvailableSkills={availableSkills}
        paneActiveSkillSummary={activeSkillSummary}
        panePendingWrites={pendingWrites}
      />
    </div>
  )
}
