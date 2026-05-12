import { generateText, stepCountIs } from 'ai'
import { MODELS } from '@/lib/llm'
import type { SubAgent } from '../../types'
import { loadBrief } from '../../load-brief'
import { createDbUpdateTools } from './tools'

const briefBody = loadBrief('lib/skills/sub-agents/db_update_bot/brief.md')
const schemaBody = loadBrief('lib/skills/sub-agents/db_update_bot/SCHEMA.md')
const fullBrief = `${briefBody}\n\n${schemaBody}`

export const dbUpdateBot: SubAgent = {
  id: 'db_update_bot',
  name: 'DB update bot',
  brief: fullBrief,
  async run({ task, ctx }) {
    const result = await generateText({
      model: MODELS.fast,
      system: fullBrief,
      prompt: task,
      tools: createDbUpdateTools(ctx),
      stopWhen: stepCountIs(4),
    })
    return result.text.trim()
  },
}
