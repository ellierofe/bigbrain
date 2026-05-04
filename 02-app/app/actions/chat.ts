'use server'

import { auth } from '@/lib/auth'
import {
  createConversation,
  archiveConversation,
  updateConversationTitle,
  updateConversationContextPaneState,
  getMessages,
} from '@/lib/db/queries/chat'
import { generateText } from 'ai'
import { MODELS } from '@/lib/llm'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'
const isDev = process.env.NODE_ENV === 'development'

async function requireAuth() {
  if (isDev) return
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
}

export async function createConversationAction() {
  await requireAuth()
  return createConversation(BRAND_ID)
}

export async function archiveConversationAction(id: string) {
  await requireAuth()
  await archiveConversation(id)
}

export async function generateTitleAction(conversationId: string) {
  await requireAuth()

  const msgs = await getMessages(conversationId)
  if (msgs.length < 2) return

  const firstUser = msgs.find((m) => m.role === 'user')
  const firstAssistant = msgs.find((m) => m.role === 'assistant')
  if (!firstUser || !firstAssistant) return

  const { text: title } = await generateText({
    model: MODELS.fast,
    system:
      'Generate a short, specific conversation title (3-8 words). Return ONLY the title, no quotes, no punctuation at the end.',
    prompt: `User: ${firstUser.content.slice(0, 500)}\n\nAssistant: ${firstAssistant.content.slice(0, 500)}`,
  })

  const cleaned = title.trim().slice(0, 200)
  if (cleaned) {
    await updateConversationTitle(conversationId, cleaned)
  }

  return cleaned
}

/** Persist the chat context pane's selected tab for a conversation. */
export async function setContextPaneStateAction(
  conversationId: string,
  selectedTabId: string
) {
  await requireAuth()
  if (!conversationId || !selectedTabId) {
    throw new Error('Invalid context pane state')
  }
  await updateConversationContextPaneState(conversationId, { selectedTabId })
  return { ok: true as const }
}
