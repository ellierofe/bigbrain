import { getConversations, getFirstUserMessage } from '@/lib/db/queries/chat'
import { ChatArea } from './chat-area'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default async function ChatPage() {
  const convs = await getConversations(BRAND_ID)

  const conversations = await Promise.all(
    convs.map(async (c) => ({
      id: c.id,
      title: c.title,
      preview: await getFirstUserMessage(c.id),
      updatedAt: c.updatedAt,
    }))
  )

  return (
    <div className="flex h-full -mx-8 -mb-8 -mt-2">
      <ChatArea
        conversationId={null}
        initialMessages={[]}
        conversations={conversations}
      />
    </div>
  )
}
