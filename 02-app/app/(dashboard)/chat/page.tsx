import { getConversations, getFirstUserMessage } from '@/lib/db/queries/chat'
import { getBrandPanePrefs } from '@/lib/db/queries/brands'
import { isSkillId, listSkills } from '@/lib/skills/registry'
import type { SkillState } from '@/lib/skills/types'
import { toSkillSummary } from '@/lib/chat-context-pane/skill-summary'
import { ChatArea } from './chat-area'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default async function ChatPage() {
  const [convs, panePrefs] = await Promise.all([
    getConversations(BRAND_ID),
    getBrandPanePrefs(BRAND_ID),
  ])

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

  const availableSkills = listSkills().map(toSkillSummary)

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
        paneOpen={panePrefs.chatPaneOpen}
        paneWidth={panePrefs.chatPaneWidth}
        paneSelectedTabId={null}
        paneConversationId={null}
        paneSkillId={null}
        paneSkillState={null}
        paneAvailableSkills={availableSkills}
        paneActiveSkillSummary={null}
      />
    </div>
  )
}
