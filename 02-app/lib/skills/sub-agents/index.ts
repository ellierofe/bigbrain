import type { SubAgent, SubAgentId } from '../types'
import { retrievalBot } from './retrieval_bot'
import { dbUpdateBot } from './db_update_bot'

export const subAgents: Record<SubAgentId, SubAgent | undefined> = {
  retrieval_bot: retrievalBot,
  db_update_bot: dbUpdateBot,
}

export function getSubAgent(id: SubAgentId): SubAgent | null {
  return subAgents[id] ?? null
}
