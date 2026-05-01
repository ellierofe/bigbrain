import { streamText, generateObject, stepCountIs, convertToModelMessages, type UIMessage } from "ai"
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
import { getSkill } from "@/lib/skills/registry"
import { getSkillContext, saveSkillState } from "@/lib/skills/state"
import {
  assembleSystemPrompt,
  applyTurnExtraction,
  turnExtractionSchema,
  markComplete,
  type TurnExtraction,
} from "@/lib/skills/runtime"
import { createSubAgentTools } from "@/lib/skills/sub-agent-tools"
import type { SkillState } from "@/lib/skills/types"

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

  // Resolve any skill attached to this conversation. Registry miss falls
  // through to freeform — the client renders the warning banner.
  const skillCtx = await getSkillContext(activeConversationId)
  const skill = skillCtx?.skillId ? getSkill(skillCtx.skillId) : null
  const skillState = (skillCtx?.skillState as SkillState | null) ?? null

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

  // Branch: skill-aware chat vs freeform chat. Skill needs the assembled
  // brief in the system prompt and sub-agent tools instead of the flat
  // retrieval set.
  const skillCtxForRun = skill && skillState
    ? { brandId: brand.id, conversationId: activeConversationId }
    : null

  const systemPrompt = skill && skillState
    ? assembleSystemPrompt(skill, skillState)
    : SYSTEM_PROMPTS.chat

  const tools = skill && skillState && skillCtxForRun
    ? createSubAgentTools(skill, skillCtxForRun)
    : createRetrievalTools(brand.id)

  const result = streamText({
    model: MODELS.geminiPro,
    system: systemPrompt,
    messages: modelMessages,
    tools,
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

      await touchConversation(activeConversationId)

      // Skill-aware: extract structured state from the turn via a second
      // generateObject call. Defensive fallback: if extraction fails, leave
      // state unchanged (the OUT-01b context pane will render a warning row
      // once that build lands).
      if (skill && skillState) {
        try {
          const extractionSchema = turnExtractionSchema(skill)
          const transcript = modelMessages
            .map((m) => {
              const content = typeof m.content === 'string'
                ? m.content
                : Array.isArray(m.content)
                  ? m.content
                      .filter((p: any) => p.type === 'text')
                      .map((p: any) => p.text)
                      .join('\n')
                  : ''
              return `${m.role}: ${content}`
            })
            .join('\n\n')

          const checklistDescription = skill.checklist
            .map((c) => `- "${c.id}" — ${c.label}`)
            .join('\n')

          const { object } = await generateObject({
            model: MODELS.fast,
            schema: extractionSchema,
            system: [
              'Extract structured state from the most recent assistant turn of this skill conversation. Use the schema strictly.',
              '',
              "The skill's checklist items are:",
              checklistDescription,
              '',
              'Rules:',
              '- For every checklist item whose underlying value is now present in `gathered` (either captured this turn or in the prior conversation), include its ID in `checklistFilledIds`.',
              '- Be inclusive: if the item appears satisfied by anything captured so far, include it. The runtime treats `filled` as monotonic — once true, it stays true.',
              skill.mode === 'staged'
                ? '- Set `readyToAdvance: true` only if the latest assistant turn signalled the current stage is complete and the user should advance.'
                : '- Set `readyToAdvance: false` — this skill is discursive and has no advancement gates.',
            ].join('\n'),
            prompt: `Conversation so far:\n\n${transcript}\n\nLatest assistant turn:\n${text}\n\nExtract the state.`,
          })

          let nextState = applyTurnExtraction(
            skill,
            skillState,
            object as TurnExtraction
          )

          // Discursive skills: if all checklist items are filled and not
          // already marked complete, set completedAt.
          if (
            skill.mode === 'discursive' &&
            !nextState.completedAt &&
            nextState.checklist.every((c) => c.filled)
          ) {
            nextState = markComplete(nextState)
          }

          await saveSkillState(activeConversationId, nextState)
        } catch (err) {
          console.warn(
            `[skills] state extraction failed for conversation ${activeConversationId}:`,
            err instanceof Error ? err.message : err
          )
        }
      }

      // Auto-generate title for new freeform conversations only. Skill
      // conversations are titled at creation as "<Skill name> · <date>".
      if (
        !skill &&
        (isNewConversation || !(await getConversation(activeConversationId))?.title)
      ) {
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
