import type { SubAgent, SubAgentId } from '../types'
import { retrievalBot } from './retrieval_bot'

export const subAgents: Record<SubAgentId, SubAgent | undefined> = {
  retrieval_bot: retrievalBot,
  db_update_bot: undefined,
}

export function getSubAgent(id: SubAgentId): SubAgent | null {
  return subAgents[id] ?? null
}
