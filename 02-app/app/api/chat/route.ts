import { streamText } from "ai"
import { MODELS, SYSTEM_PROMPTS } from "@/lib/llm"
import { auth } from "@/lib/auth"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { messages } = await req.json()

  const result = streamText({
    model: MODELS.primary,
    system: SYSTEM_PROMPTS.chat,
    messages,
  })

  return result.toTextStreamResponse()
}
