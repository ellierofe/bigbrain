import { tool, zodSchema } from 'ai'
import { z } from 'zod'
import type { Skill, SkillCtx } from './types'
import { getSubAgent } from './sub-agents'

const taskSchema = z.object({
  task: z.string().describe('What you want the sub-agent to do, in plain language.'),
})
type TaskInput = z.infer<typeof taskSchema>

/**
 * Turn each entry in `skill.subAgents` into an AI SDK tool the main chat
 * LLM can call. Each tool's `execute` runs the sub-agent's LLM call with
 * its own focused brief and tool surface.
 */
export function createSubAgentTools(skill: Skill, ctx: SkillCtx) {
  const tools: Record<string, ReturnType<typeof tool<TaskInput, string>>> = {}

  for (const id of skill.subAgents) {
    const subAgent = getSubAgent(id)
    if (!subAgent) continue

    tools[id] = tool<TaskInput, string>({
      description: `Delegate to the ${subAgent.name} sub-agent. ${subAgent.brief.split('\n')[0]}`,
      inputSchema: zodSchema(taskSchema),
      execute: async (input) => {
        try {
          return await subAgent.run({ task: input.task, ctx })
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'unknown error'
          return `[${subAgent.id} failed: ${msg}]`
        }
      },
    })
  }

  return tools
}
