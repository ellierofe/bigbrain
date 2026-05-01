import { generateText, stepCountIs } from 'ai'
import { MODELS } from '@/lib/llm'
import { createRetrievalTools } from '@/lib/llm/tools'
import type { SubAgent } from '../../types'
import { loadBrief } from '../../load-brief'

const brief = loadBrief('lib/skills/sub-agents/retrieval_bot/brief.md')

export const retrievalBot: SubAgent = {
  id: 'retrieval_bot',
  name: 'Retrieval bot',
  brief,
  async run({ task, ctx }) {
    const result = await generateText({
      model: MODELS.fast,
      system: brief,
      prompt: task,
      tools: createRetrievalTools(ctx.brandId),
      stopWhen: stepCountIs(4),
    })
    return result.text.trim()
  },
}
