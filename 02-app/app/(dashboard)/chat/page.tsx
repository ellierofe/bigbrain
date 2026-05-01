import { getConversations, getFirstUserMessage } from '@/lib/db/queries/chat'
import { isSkillId } from '@/lib/skills/registry'
import type { SkillState } from '@/lib/skills/types'
import { ChatArea } from './chat-area'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default async function ChatPage() {
  const convs = await getConversations(BRAND_ID)

  const conversations = await Promise.all(
    convs.map(async (c) => {
      const skillState = (c.skillState as SkillState | null) ?? null
      return {
        id: c.id,
        title: c.title,
        preview: await getFirstUserMessage(c.id),
        updatedAt: c.updatedAt,
        skillId: c.skillId,
        skillCompletedAt: skillState?.completedAt ?? null,
        skillInRegistry: isSkillId(c.skillId),
      }
    })
  )

  return (
    <div className="flex h-full -mx-8 -mb-8 -mt-2">
      <ChatArea
        conversationId={null}
        initialMessages={[]}
        conversations={conversations}
        skillState={null}
        skillName={null}
        skillMode={null}
        skillInRegistry={true}
        conversationHasMessages={false}
      />
    </div>
  )
}
