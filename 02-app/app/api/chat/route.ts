import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from "ai"
import { MODELS, SYSTEM_PROMPTS } from "@/lib/llm"
import { createRetrievalTools } from "@/lib/llm/tools"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { brands } from "@/lib/db/schema/brands"
import { eq } from "drizzle-orm"
import {
  createConversation,
  addMessage,
  touchConversation,
  updateConversationTitle,
  getConversation,
} from "@/lib/db/queries/chat"
import { generateText } from "ai"

const BRAND_ID = "ea444c72-d332-4765-afd5-8dda97f5cf6f"

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    const session = await auth()
    if (!session) {
      return new Response("Unauthorized", { status: 401 })
    }
  }

  const { messages, conversationId, attachments, imageDataUrls } = await req.json()

  // Get brand ID — single-user app, one brand
  const [brand] = await db
    .select({ id: brands.id })
    .from(brands)
    .where(eq(brands.slug, "nicelyput"))
    .limit(1)

  if (!brand) {
    return Response.json({ error: "Brand not found" }, { status: 500 })
  }

  // Resolve or create conversation
  let activeConversationId = conversationId
  let isNewConversation = false

  if (!activeConversationId) {
    const conv = await createConversation(brand.id)
    activeConversationId = conv.id
    isNewConversation = true
  }

  // Persist the user message (last message in the array)
  const lastMessage = messages[messages.length - 1]
  if (lastMessage?.role === "user") {
    const userText = lastMessage.parts
      ?.filter((p: { type: string }) => p.type === "text")
      .map((p: { text: string }) => p.text)
      .join("\n") ?? ""

    await addMessage(activeConversationId, "user", userText, {
      attachments: attachments ?? undefined,
    })
  }

  // Convert UIMessages to ModelMessages, stripping file parts (handled separately)
  const cleanMessages = (messages as UIMessage[]).map((msg) => ({
    ...msg,
    parts: msg.parts.filter((p) => p.type !== 'file'),
  }))
  const modelMessages = await convertToModelMessages(cleanMessages)

  // If the last user message has images, append them as inline image parts
  if (imageDataUrls?.length && modelMessages.length > 0) {
    const lastMsg = modelMessages[modelMessages.length - 1]
    if (lastMsg.role === 'user') {
      const existingContent = typeof lastMsg.content === 'string'
        ? [{ type: 'text' as const, text: lastMsg.content }]
        : Array.isArray(lastMsg.content) ? lastMsg.content : []

      const imageParts = (imageDataUrls as string[]).map((dataUrl: string) => {
        // data:image/jpeg;base64,/9j/... → extract mimeType and base64 data
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
        if (!match) return null
        return {
          type: 'image' as const,
          image: match[2], // raw base64 without prefix
          mimeType: match[1],
        }
      }).filter(Boolean)

      lastMsg.content = [...existingContent, ...imageParts] as any
    }
  }

  const result = streamText({
    model: MODELS.geminiPro,
    system: SYSTEM_PROMPTS.chat,
    messages: modelMessages,
    tools: createRetrievalTools(brand.id),
    stopWhen: stepCountIs(5),
    onFinish: async ({ text, toolCalls, usage }) => {
      // Persist assistant message
      const toolCallSummary = toolCalls?.map((tc) => ({
        name: tc.toolName,
        args: 'args' in tc ? tc.args : undefined,
      }))

      await addMessage(activeConversationId, "assistant", text, {
        toolCalls: toolCallSummary?.length ? toolCallSummary : undefined,
        tokenCount: usage?.totalTokens,
      })

      // Update conversation timestamp
      await touchConversation(activeConversationId)

      // Auto-generate title for new conversations
      if (isNewConversation || !(await getConversation(activeConversationId))?.title) {
        const userText = lastMessage?.parts
          ?.filter((p: { type: string }) => p.type === "text")
          .map((p: { text: string }) => p.text)
          .join("\n") ?? ""

        try {
          const { text: title } = await generateText({
            model: MODELS.geminiFlash,
            system:
              "Generate a short, specific conversation title (3-8 words). Return ONLY the title, no quotes, no punctuation at the end.",
            prompt: `User: ${userText.slice(0, 500)}\n\nAssistant: ${text.slice(0, 500)}`,
          })
          const cleaned = title.trim().slice(0, 200)
          if (cleaned) {
            await updateConversationTitle(activeConversationId, cleaned)
          }
        } catch {
          // Title generation is non-critical — don't fail the response
        }
      }
    },
  })

  const response = result.toUIMessageStreamResponse()

  // Add conversation ID header so the client knows which conversation was used
  response.headers.set("x-conversation-id", activeConversationId)

  return response
}
