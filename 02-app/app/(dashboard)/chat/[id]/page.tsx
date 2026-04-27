import { notFound } from 'next/navigation'
import type { UIMessage } from 'ai'
import {
  getConversation,
  getConversations,
  getMessages,
  getFirstUserMessage,
} from '@/lib/db/queries/chat'
import { ChatArea } from '../chat-area'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ConversationPage({ params }: Props) {
  const { id } = await params
  const conversation = await getConversation(id)
  if (!conversation) notFound()

  const [dbMessages, convs] = await Promise.all([
    getMessages(id),
    getConversations(BRAND_ID),
  ])

  // Convert DB messages to UIMessage format
  const initialMessages: UIMessage[] = dbMessages.map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    parts: [{ type: 'text' as const, text: msg.content }],
  }))

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
        conversationId={id}
        initialMessages={initialMessages}
        conversations={conversations}
      />
    </div>
  )
}
